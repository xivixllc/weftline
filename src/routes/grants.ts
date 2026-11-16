import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { decrypt, encrypt } from '../lib/crypto.js';
import { providerRejected } from '../lib/errors.js';
import { newId, nowSec } from '../lib/ids.js';
import { decodeCursor, listQuery, page } from '../lib/pagination.js';
import { emit, type Ctx } from '../services/events.js';
import { type GrantRow, LOCAL_PROVIDER, listOf, ok, resolveGrant } from './helpers.js';

const PROVIDERS = ['google', 'microsoft', 'imap', 'icloud', 'yahoo', 'ews', 'virtual-calendar', 'zoom', LOCAL_PROVIDER] as const;
/** Older v3 clients send the previous provider value for agent mailboxes; treat it as ours. */
const LEGACY_AGENT_PROVIDER = 'nylas';

const SECRET_KEY = /password|secret|token/i;
const redact = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([k]) => !SECRET_KEY.test(k)));

const agentSettings = z
  .object({ email: z.string().email().max(320), policy_id: z.string().max(128).optional(), app_password: z.string().min(8).max(256).optional() })
  .strict();

const customBody = z
  .object({
    provider: z.string().transform((p) => (p === LEGACY_AGENT_PROVIDER ? LOCAL_PROVIDER : p)).pipe(z.enum(PROVIDERS)),
    settings: z.record(z.string(), z.unknown()),
    state: z.string().max(255).optional(),
    scope: z.array(z.string().max(512)).max(50).optional(),
    name: z.string().max(255).optional(),
    workspace_id: z.string().max(128).optional(),
  })
  .strict();

const patchBody = z
  .object({ settings: z.record(z.string(), z.unknown()).optional(), scope: z.array(z.string().max(512)).max(50).optional(), name: z.string().max(255).optional() })
  .strict();

const listParams = listQuery.extend({
  offset: z.coerce.number().int().min(0).optional(),
  sort_by: z.enum(['created_at', 'updated_at']).default('created_at'),
  order_by: z.enum(['asc', 'desc']).default('desc'),
  since: z.coerce.number().int().optional(),
  before: z.coerce.number().int().optional(),
  email: z.string().optional(),
  grant_status: z.string().optional(),
  ip: z.string().optional(),
  provider: z.string().optional(),
});

export const grantRoutes =
  (ctx: Ctx): FastifyPluginAsync =>
  async (app) => {
    const keys = [ctx.cfg.tokenKey, ...(ctx.cfg.tokenKeyPrevious ? [ctx.cfg.tokenKeyPrevious] : [])];

    function present(g: GrantRow) {
      let settings: Record<string, unknown> | undefined;
      if (g.settings_enc) {
        try {
          settings = redact(JSON.parse(decrypt(g.settings_enc, keys)));
        } catch {
          settings = undefined;
        }
      }
      return {
        id: g.id,
        provider: g.provider,
        grant_status: g.grant_status,
        email: g.email,
        ...(g.name ? { name: g.name } : {}),
        scope: g.scope,
        ...(g.state ? { state: g.state } : {}),
        ...(settings ? { settings } : {}),
        ...(g.workspace_id ? { workspace_id: g.workspace_id } : {}),
        blocked: g.blocked,
        created_at: g.created_at,
        updated_at: g.updated_at,
      };
    }

    app.get('/v3/grants', async (req) => {
      const q = listParams.parse(req.query);
      const offset = q.page_token ? decodeCursor(q.page_token) : (q.offset ?? 0);
      const where = ['application_id=$1'];
      const args: unknown[] = [req.principal.applicationId];
      const add = (cond: string, v: unknown) => {
        args.push(v);
        where.push(cond.replace('?', `$${args.length}`));
      };
      if (q.since !== undefined) add('created_at >= ?', q.since);
      if (q.before !== undefined) add('created_at < ?', q.before);
      if (q.email) add('lower(email) = lower(?)', q.email);
      if (q.grant_status) add('grant_status = ?', q.grant_status);
      if (q.provider) add('provider = ?', q.provider === LEGACY_AGENT_PROVIDER ? LOCAL_PROVIDER : q.provider);
      if (q.ip) where.push('false'); // sign-in IPs aren't recorded for direct grants
      args.push(q.limit + 1, offset);
      const rows = await ctx.db.query<GrantRow>(
        `SELECT * FROM grants WHERE ${where.join(' AND ')}
          ORDER BY ${q.sort_by} ${q.order_by}, id LIMIT $${args.length - 1} OFFSET $${args.length}`,
        args,
      );
      const { items, next_cursor } = page(rows.rows, q.limit, offset);
      return listOf(req, items.map(present), q.select, next_cursor);
    });

    app.get<{ Params: { grant_id: string } }>('/v3/grants/:grant_id', async (req) => {
      return ok(req, present(await resolveGrant(ctx, req.principal.applicationId, req.params.grant_id)));
    });

    app.post('/v3/connect/custom', async (req) => {
      const body = customBody.parse(req.body);
      if (body.provider !== LOCAL_PROVIDER) {
        throw providerRejected(`the ${body.provider} connector is not implemented in this build; supported: ${LOCAL_PROVIDER}`);
      }
      const s = agentSettings.parse(body.settings);
      const email = s.email.toLowerCase();
      const t = nowSec();
      const appId = req.principal.applicationId;
      const enc = encrypt(JSON.stringify({ ...s, email }), ctx.cfg.tokenKey);

      const existing = await ctx.db.query<GrantRow>(
        'SELECT * FROM grants WHERE application_id=$1 AND provider=$2 AND lower(email)=$3',
        [appId, LOCAL_PROVIDER, email],
      );
      if (existing.rows[0]) {
        const g = existing.rows[0];
        const r = await ctx.db.query<GrantRow>(
          `UPDATE grants SET settings_enc=$2, name=coalesce($3,name), scope=coalesce($4::jsonb,scope),
                  state=coalesce($5,state), workspace_id=coalesce($6,workspace_id), grant_status='valid', updated_at=$7
            WHERE id=$1 RETURNING *`,
          [g.id, enc, body.name ?? null, body.scope ? JSON.stringify(body.scope) : null, body.state ?? null, body.workspace_id ?? null, t],
        );
        await emit(ctx, appId, 'grant.updated', g.id, { id: g.id, grant_id: g.id, provider: g.provider, email });
        return ok(req, present(r.rows[0]!));
      }

      const id = newId('grt');
      const r = await ctx.db.query<GrantRow>(
        `INSERT INTO grants (id, application_id, provider, email, name, scope, state, settings_enc, workspace_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
        [id, appId, LOCAL_PROVIDER, email, body.name ?? null, JSON.stringify(body.scope ?? []), body.state ?? null, enc, body.workspace_id ?? null, t],
      );
      // Standard system folders for a new mailbox.
      for (const [name, attr] of [['Inbox', '\\Inbox'], ['Sent', '\\Sent'], ['Drafts', '\\Drafts'], ['Trash', '\\Trash']] as const) {
        await ctx.db.query(
          `INSERT INTO folders (id, grant_id, name, attributes, system_folder, created_at) VALUES ($1,$2,$3,$4,true,$5)`,
          [newId('fld'), id, name, JSON.stringify([attr]), t],
        );
      }
      await emit(ctx, appId, 'grant.created', id, { id, grant_id: id, provider: LOCAL_PROVIDER, email });
      return ok(req, present(r.rows[0]!));
    });

    app.patch<{ Params: { grant_id: string } }>('/v3/grants/:grant_id', async (req) => {
      const body = patchBody.parse(req.body);
      const g = await resolveGrant(ctx, req.principal.applicationId, req.params.grant_id);
      let enc = g.settings_enc;
      if (body.settings) {
        if (g.provider === LOCAL_PROVIDER) {
          const current = enc ? JSON.parse(decrypt(enc, keys)) : {};
          // The mailbox address is the grant's identity; it can't be changed here.
          const patch = agentSettings.partial().parse(body.settings);
          if (patch.email && patch.email.toLowerCase() !== g.email) throw providerRejected('a mailbox address cannot be changed');
          enc = encrypt(JSON.stringify({ ...current, ...patch, email: g.email }), ctx.cfg.tokenKey);
        } else {
          enc = encrypt(JSON.stringify({ ...(enc ? JSON.parse(decrypt(enc, keys)) : {}), ...body.settings }), ctx.cfg.tokenKey);
        }
      }
      const r = await ctx.db.query<GrantRow>(
        `UPDATE grants SET settings_enc=$2, name=coalesce($3,name), scope=coalesce($4::jsonb,scope), updated_at=$5
          WHERE id=$1 RETURNING *`,
        [g.id, enc, body.name ?? null, body.scope ? JSON.stringify(body.scope) : null, nowSec()],
      );
      await emit(ctx, g.application_id, 'grant.updated', g.id, { id: g.id, grant_id: g.id, provider: g.provider, email: g.email });
      return ok(req, present(r.rows[0]!));
    });

    app.delete<{ Params: { grant_id: string } }>('/v3/grants/:grant_id', async (req) => {
      const g = await resolveGrant(ctx, req.principal.applicationId, req.params.grant_id);
      await ctx.db.query('DELETE FROM grants WHERE id=$1', [g.id]);
      await emit(ctx, g.application_id, 'grant.deleted', g.id, { id: g.id, grant_id: g.id, provider: g.provider, email: g.email });
      return { request_id: req.id };
    });
  };
