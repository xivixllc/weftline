import { randomBytes } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { encrypt } from '../lib/crypto.js';
import { badRequest, notFound } from '../lib/errors.js';
import { newId, nowSec } from '../lib/ids.js';
import { decodeCursor, listQuery, page } from '../lib/pagination.js';
import { ALL_TRIGGERS } from '../lib/triggers.js';
import { assertPublicUrl } from '../lib/url.js';
import type { Ctx } from '../services/events.js';
import { listOf, ok } from './helpers.js';

interface WebhookRow {
  id: string;
  application_id: string;
  description: string | null;
  trigger_types: string[];
  webhook_url: string;
  status: string;
  notification_email_addresses: string[];
  status_updated_at: number;
  created_at: number;
  updated_at: number;
}

const triggers = z.array(z.enum(ALL_TRIGGERS)).min(1).max(ALL_TRIGGERS.length);
const emails = z.array(z.string().email()).max(20);

const createBody = z
  .object({
    trigger_types: triggers,
    webhook_url: z.string().max(2048),
    description: z.string().max(500).optional(),
    notification_email_addresses: emails.optional(),
  })
  .strict();

const updateBody = z
  .object({
    trigger_types: triggers.optional(),
    webhook_url: z.string().max(2048).optional(),
    description: z.string().max(500).optional(),
    notification_email_addresses: emails.optional(),
  })
  .strict();

export const webhookRoutes =
  (ctx: Ctx): FastifyPluginAsync =>
  async (app) => {
    const present = (w: WebhookRow, secret?: string) => ({
      id: w.id,
      ...(w.description ? { description: w.description } : {}),
      trigger_types: w.trigger_types,
      webhook_url: w.webhook_url,
      ...(secret ? { webhook_secret: secret } : {}),
      status: w.status,
      notification_email_addresses: w.notification_email_addresses,
      status_updated_at: w.status_updated_at,
      created_at: w.created_at,
      updated_at: w.updated_at,
    });

    async function get(appId: string, id: string) {
      const r = await ctx.db.query<WebhookRow>('SELECT * FROM webhooks WHERE id=$1 AND application_id=$2', [id, appId]);
      if (!r.rows[0]) throw notFound('webhook');
      return r.rows[0];
    }

    /** The receiver must echo a random `challenge` before a URL is accepted. */
    async function challenge(rawUrl: string) {
      const url = await assertPublicUrl(rawUrl, ctx.cfg.allowPrivateWebhooks);
      const value = randomBytes(8).toString('hex');
      url.searchParams.set('challenge', value);
      let res: Response;
      let text: string;
      try {
        res = await ctx.fetchImpl(url, {
          method: 'GET',
          redirect: 'manual',
          headers: { 'User-Agent': 'Weftline-Webhooks/1' },
          signal: AbortSignal.timeout(10_000),
        });
        text = (await res.text()).trim();
      } catch (e) {
        throw badRequest(`webhook_url did not answer the challenge: ${(e as Error).message}`);
      }
      if (res.status !== 200) throw badRequest(`webhook_url answered the challenge with status ${res.status}`);
      if (text !== value) throw badRequest('webhook_url did not echo the challenge value');
    }

    app.get('/v3/webhooks', async (req) => {
      const q = listQuery.parse(req.query);
      const offset = decodeCursor(q.page_token);
      const r = await ctx.db.query<WebhookRow>(
        'SELECT * FROM webhooks WHERE application_id=$1 ORDER BY created_at DESC, id LIMIT $2 OFFSET $3',
        [req.principal.applicationId, q.limit + 1, offset],
      );
      const { items, next_cursor } = page(r.rows, q.limit, offset);
      return listOf(req, items.map((w) => present(w)), q.select, next_cursor);
    });

    // Registered before /:webhook_id so the fixed path wins.
    app.get('/v3/webhooks/ip-addresses', async (req) =>
      // Serverless egress addresses are not fixed; receivers verify the signature instead.
      ok(req, { ip_addresses: [], updated_at: nowSec() }),
    );

    app.get<{ Params: { webhook_id: string } }>('/v3/webhooks/:webhook_id', async (req) =>
      ok(req, present(await get(req.principal.applicationId, req.params.webhook_id))),
    );

    app.post('/v3/webhooks', async (req) => {
      const b = createBody.parse(req.body);
      await challenge(b.webhook_url);
      const id = newId('wh');
      const secret = randomBytes(16).toString('hex');
      const t = nowSec();
      const r = await ctx.db.query<WebhookRow>(
        `INSERT INTO webhooks (id, application_id, description, trigger_types, webhook_url, secret_enc,
                               notification_email_addresses, status_updated_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$8) RETURNING *`,
        [
          id,
          req.principal.applicationId,
          b.description ?? null,
          JSON.stringify([...new Set(b.trigger_types)]),
          b.webhook_url,
          encrypt(secret, ctx.cfg.tokenKey),
          JSON.stringify(b.notification_email_addresses ?? []),
          t,
        ],
      );
      return ok(req, present(r.rows[0]!, secret));
    });

    app.put<{ Params: { webhook_id: string } }>('/v3/webhooks/:webhook_id', async (req) => {
      const b = updateBody.parse(req.body);
      const w = await get(req.principal.applicationId, req.params.webhook_id);
      if (b.webhook_url && b.webhook_url !== w.webhook_url) await challenge(b.webhook_url);
      const r = await ctx.db.query<WebhookRow>(
        `UPDATE webhooks SET description=coalesce($2,description), trigger_types=coalesce($3::jsonb,trigger_types),
                webhook_url=coalesce($4,webhook_url), notification_email_addresses=coalesce($5::jsonb,notification_email_addresses),
                updated_at=$6
          WHERE id=$1 RETURNING *`,
        [
          w.id,
          b.description ?? null,
          b.trigger_types ? JSON.stringify([...new Set(b.trigger_types)]) : null,
          b.webhook_url ?? null,
          b.notification_email_addresses ? JSON.stringify(b.notification_email_addresses) : null,
          nowSec(),
        ],
      );
      return ok(req, present(r.rows[0]!));
    });

    app.delete<{ Params: { webhook_id: string } }>('/v3/webhooks/:webhook_id', async (req) => {
      const w = await get(req.principal.applicationId, req.params.webhook_id);
      await ctx.db.query('DELETE FROM webhooks WHERE id=$1', [w.id]);
      return ok(req, { status: 'success' });
    });

    async function rotate(appId: string, id: string, req: Parameters<typeof ok>[0]) {
      const w = await get(appId, id);
      const secret = randomBytes(16).toString('hex');
      const r = await ctx.db.query<WebhookRow>(
        'UPDATE webhooks SET secret_enc=$2, updated_at=$3 WHERE id=$1 RETURNING *',
        [w.id, encrypt(secret, ctx.cfg.tokenKey), nowSec()],
      );
      return ok(req, present(r.rows[0]!, secret));
    }
    app.post<{ Params: { webhook_id: string } }>('/v3/webhooks/rotate-secret/:webhook_id', (req) =>
      rotate(req.principal.applicationId, req.params.webhook_id, req),
    );
    // Some v3 clients send this form.
    app.put<{ Params: { webhook_id: string } }>('/v3/webhooks/:webhook_id/rotate-secret', (req) =>
      rotate(req.principal.applicationId, req.params.webhook_id, req),
    );
  };
