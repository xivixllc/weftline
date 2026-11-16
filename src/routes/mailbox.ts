import { createHash } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { idempotent } from '../lib/idempotency.js';
import { badRequest, conflict, notFound, providerRejected } from '../lib/errors.js';
import { newId, nowSec } from '../lib/ids.js';
import { decodeCursor, listQuery, page } from '../lib/pagination.js';
import { emit, type Ctx } from '../services/events.js';
import { type GrantRow, LOCAL_PROVIDER, listOf, ok, requireLocal, resolveGrant } from './helpers.js';

// ---------------------------------------------------------------- shapes

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
const strs = z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v : [v]));
const addr = z.object({ email: z.string().email().max(320), name: z.string().max(320).optional() }).strict();

interface MessageRow {
  id: string;
  grant_id: string;
  thread_id: string;
  subject: string;
  from_addrs: unknown[];
  to_addrs: unknown[];
  cc_addrs: unknown[];
  bcc_addrs: unknown[];
  reply_to: unknown[];
  date: number;
  created_at: number;
  unread: boolean;
  starred: boolean;
  snippet: string;
  body: string;
  is_plaintext: boolean;
  folders: string[];
  headers: { name: string; value: string }[];
  metadata: Record<string, string>;
}

interface FolderRow {
  id: string;
  grant_id: string;
  name: string;
  attributes: string[];
  system_folder: boolean;
  parent_id: string | null;
  text_color: string | null;
  background_color: string | null;
  total_count?: number;
  unread_count?: number;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripHtml = (s: string) =>
  s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function presentMessage(m: MessageRow, fields?: string) {
  const want = new Set((fields ?? '').split(',').map((s) => s.trim()));
  return {
    id: m.id,
    object: 'message',
    grant_id: m.grant_id,
    thread_id: m.thread_id,
    subject: m.subject,
    from: m.from_addrs,
    to: m.to_addrs,
    cc: m.cc_addrs,
    bcc: m.bcc_addrs,
    reply_to: m.reply_to,
    date: m.date,
    created_at: m.created_at,
    unread: m.unread,
    starred: m.starred,
    snippet: m.snippet,
    body: m.is_plaintext ? `<div>${escapeHtml(m.body).replace(/\n/g, '<br>')}</div>` : m.body,
    attachments: [],
    folders: m.folders,
    ...(want.has('include_headers') || want.has('include_basic_headers') ? { headers: m.headers } : {}),
    metadata: m.metadata,
  };
}

function presentFolder(f: FolderRow) {
  return {
    id: f.id,
    object: 'folder',
    grant_id: f.grant_id,
    name: f.name,
    attributes: f.attributes,
    system_folder: f.system_folder,
    ...(f.text_color ? { text_color: f.text_color } : {}),
    ...(f.background_color ? { background_color: f.background_color } : {}),
    ...(f.parent_id ? { parent_id: f.parent_id } : {}),
    total_count: f.total_count ?? 0,
    unread_count: f.unread_count ?? 0,
  };
}

const threadIdFor = (grantId: string, conversation: string) =>
  'thr_' + createHash('sha256').update(`${grantId}:${conversation}`).digest('hex').slice(0, 16);

const CONVERSATION_HEADER = 'X-Weftline-Conversation';

// ---------------------------------------------------------------- list filters (messages and threads)

const messageFilters = z.object({
  subject: z.string().optional(),
  any_email: z.string().optional(),
  to: strs.optional(),
  from: strs.optional(),
  cc: strs.optional(),
  bcc: strs.optional(),
  in: strs.optional(),
  unread: bool.optional(),
  starred: bool.optional(),
  thread_id: z.string().optional(),
  has_attachment: bool.optional(),
  search_query_native: z.string().max(500).optional(),
  metadata_pair: z.string().optional(),
});

/** Build WHERE clauses over the `messages` table for the shared filters. */
function buildFilters(q: z.infer<typeof messageFilters>, args: unknown[]): string[] {
  const where: string[] = [];
  const bind = (v: unknown) => {
    args.push(v);
    return `$${args.length}`;
  };
  const emailIn = (col: string, list: string[]) =>
    `EXISTS (SELECT 1 FROM jsonb_array_elements(${col}) a WHERE lower(a->>'email') = ANY(${bind(list.map((e) => e.toLowerCase()))}::text[]))`;

  if (q.subject !== undefined) where.push(`subject = ${bind(q.subject)}`);
  if (q.any_email) {
    where.push(emailIn(`(from_addrs || to_addrs || cc_addrs || bcc_addrs)`, q.any_email.split(',').map((s) => s.trim()).filter(Boolean)));
  }
  if (q.to) where.push(emailIn('to_addrs', q.to));
  if (q.from) where.push(emailIn('from_addrs', q.from));
  if (q.cc) where.push(emailIn('cc_addrs', q.cc));
  if (q.bcc) where.push(emailIn('bcc_addrs', q.bcc));
  if (q.in) where.push(`folders ?| ${bind(q.in)}::text[]`);
  if (q.unread !== undefined) where.push(`unread = ${bind(q.unread)}`);
  if (q.starred !== undefined) where.push(`starred = ${bind(q.starred)}`);
  if (q.thread_id) where.push(`thread_id = ${bind(q.thread_id)}`);
  if (q.has_attachment === true) where.push('false'); // attachments arrive in a later release
  if (q.search_query_native) where.push(`search @@ websearch_to_tsquery('simple', ${bind(q.search_query_native)})`);
  if (q.metadata_pair) {
    const i = q.metadata_pair.indexOf(':');
    if (i < 1) throw badRequest('metadata_pair must look like key:value');
    where.push(`metadata ->> ${bind(q.metadata_pair.slice(0, i))} = ${bind(q.metadata_pair.slice(i + 1))}`);
  }
  return where;
}

// ---------------------------------------------------------------- bodies

const sendBody = z
  .object({
    to: z.array(addr).min(1).max(500),
    from: z.array(addr).max(1).optional(),
    cc: z.array(addr).max(500).optional(),
    bcc: z.array(addr).max(500).optional(),
    reply_to: z.array(addr).max(10).optional(),
    subject: z.string().max(998).optional(),
    body: z.string().max(4 * 1024 * 1024).optional(),
    is_plaintext: z.boolean().optional(),
    starred: z.boolean().optional(),
    reply_to_message_id: z.string().max(128).optional(),
    custom_headers: z.array(z.object({ name: z.string().regex(/^[A-Za-z0-9-]{1,64}$/), value: z.string().max(998) }).strict()).max(20).optional(),
    metadata: z.record(z.string(), z.string().max(500)).optional(),
    use_draft: z.boolean().optional(),
    // Accepted by the contract but not available in this build; refused below with a clear message.
    attachments: z.array(z.unknown()).optional(),
    send_at: z.number().int().optional(),
    tracking_options: z.unknown().optional(),
    signature_id: z.string().optional(),
  })
  .strict();

const updateMessageBody = z
  .object({
    unread: z.boolean().optional(),
    starred: z.boolean().optional(),
    folders: z.array(z.string()).max(50).optional(),
    metadata: z.record(z.string(), z.string().max(500)).optional(),
  })
  .strict();

const folderName = z.string().min(1).max(1024);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const createFolderBody = z
  .object({ name: folderName, parent_id: z.string().optional(), text_color: hex.optional(), background_color: hex.optional() })
  .strict();
const updateFolderBody = z
  .object({ name: folderName.optional(), parent_id: z.string().optional(), text_color: hex.optional(), background_color: hex.optional() })
  .strict();

// ---------------------------------------------------------------- routes

export const mailboxRoutes =
  (ctx: Ctx): FastifyPluginAsync =>
  async (app) => {
    const mailbox = async (req: FastifyRequest, idOrEmail: string): Promise<GrantRow> => {
      const g = await resolveGrant(ctx, req.principal.applicationId, idOrEmail);
      requireLocal(g);
      return g;
    };

    const folderIdByAttr = async (db: Ctx['db'], grantId: string, attr: string) => {
      const r = await db.query<{ id: string }>('SELECT id FROM folders WHERE grant_id=$1 AND attributes ? $2 LIMIT 1', [grantId, attr]);
      return r.rows[0]?.id;
    };

    // ------------------------------------------------------------ folders

    const FOLDER_SELECT = `
      SELECT f.*,
        (SELECT count(*) FROM messages m WHERE m.grant_id=f.grant_id AND m.folders ? f.id)::int AS total_count,
        (SELECT count(*) FROM messages m WHERE m.grant_id=f.grant_id AND m.folders ? f.id AND m.unread)::int AS unread_count
      FROM folders f`;

    app.get<{ Params: { grant_id: string } }>('/v3/grants/:grant_id/folders', async (req) => {
      const q = listQuery.extend({ parent_id: z.string().optional() }).parse(req.query);
      const g = await mailbox(req, req.params.grant_id);
      const offset = decodeCursor(q.page_token);
      const args: unknown[] = [g.id];
      let extra = '';
      if (q.parent_id) {
        args.push(q.parent_id);
        extra = ` AND f.parent_id=$2`;
      }
      args.push(q.limit + 1, offset);
      const r = await ctx.db.query<FolderRow>(
        `${FOLDER_SELECT} WHERE f.grant_id=$1${extra} ORDER BY f.system_folder DESC, f.name LIMIT $${args.length - 1} OFFSET $${args.length}`,
        args,
      );
      const { items, next_cursor } = page(r.rows, q.limit, offset);
      return listOf(req, items.map(presentFolder), q.select, next_cursor);
    });

    async function getFolder(grantId: string, id: string) {
      const r = await ctx.db.query<FolderRow>(`${FOLDER_SELECT} WHERE f.grant_id=$1 AND f.id=$2`, [grantId, id]);
      if (!r.rows[0]) throw notFound('folder');
      return r.rows[0];
    }

    app.get<{ Params: { grant_id: string; folder_id: string } }>('/v3/grants/:grant_id/folders/:folder_id', async (req) => {
      const g = await mailbox(req, req.params.grant_id);
      return ok(req, presentFolder(await getFolder(g.id, req.params.folder_id)));
    });

    app.post<{ Params: { grant_id: string } }>('/v3/grants/:grant_id/folders', async (req) => {
      const b = createFolderBody.parse(req.body);
      const g = await mailbox(req, req.params.grant_id);
      if (b.parent_id) await getFolder(g.id, b.parent_id);
      const dup = await ctx.db.query('SELECT 1 FROM folders WHERE grant_id=$1 AND lower(name)=lower($2)', [g.id, b.name]);
      if (dup.rows.length) throw conflict('a folder with this name already exists');
      const id = newId('fld');
      await ctx.db.query(
        `INSERT INTO folders (id, grant_id, name, parent_id, text_color, background_color, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, g.id, b.name, b.parent_id ?? null, b.text_color ?? null, b.background_color ?? null, nowSec()],
      );
      const f = presentFolder(await getFolder(g.id, id));
      await emit(ctx, g.application_id, 'folder.created', g.id, f);
      return ok(req, f);
    });

    app.put<{ Params: { grant_id: string; folder_id: string } }>('/v3/grants/:grant_id/folders/:folder_id', async (req) => {
      const b = updateFolderBody.parse(req.body);
      const g = await mailbox(req, req.params.grant_id);
      const cur = await getFolder(g.id, req.params.folder_id);
      if (cur.system_folder && (b.name || b.parent_id)) throw providerRejected('system folders cannot be renamed or moved');
      if (b.parent_id) {
        if (b.parent_id === cur.id) throw badRequest('a folder cannot be its own parent');
        await getFolder(g.id, b.parent_id);
      }
      if (b.name && b.name.toLowerCase() !== cur.name.toLowerCase()) {
        const dup = await ctx.db.query('SELECT 1 FROM folders WHERE grant_id=$1 AND lower(name)=lower($2)', [g.id, b.name]);
        if (dup.rows.length) throw conflict('a folder with this name already exists');
      }
      await ctx.db.query(
        `UPDATE folders SET name=coalesce($3,name), parent_id=coalesce($4,parent_id),
                text_color=coalesce($5,text_color), background_color=coalesce($6,background_color)
          WHERE grant_id=$1 AND id=$2`,
        [g.id, cur.id, b.name ?? null, b.parent_id ?? null, b.text_color ?? null, b.background_color ?? null],
      );
      const f = presentFolder(await getFolder(g.id, cur.id));
      await emit(ctx, g.application_id, 'folder.updated', g.id, f);
      return ok(req, f);
    });

    app.delete<{ Params: { grant_id: string; folder_id: string } }>('/v3/grants/:grant_id/folders/:folder_id', async (req) => {
      const g = await mailbox(req, req.params.grant_id);
      const cur = await getFolder(g.id, req.params.folder_id);
      if (cur.system_folder) throw providerRejected('system folders cannot be deleted');
      await ctx.db.tx(async (db) => {
        await db.query(`UPDATE messages SET folders = folders - $2 WHERE grant_id=$1 AND folders ? $2`, [g.id, cur.id]);
        await db.query('UPDATE folders SET parent_id=NULL WHERE grant_id=$1 AND parent_id=$2', [g.id, cur.id]);
        await db.query('DELETE FROM folders WHERE grant_id=$1 AND id=$2', [g.id, cur.id]);
      });
      await emit(ctx, g.application_id, 'folder.deleted', g.id, { id: cur.id, object: 'folder', grant_id: g.id });
      return { request_id: req.id };
    });

    // ------------------------------------------------------------ messages

    app.get<{ Params: { grant_id: string } }>('/v3/grants/:grant_id/messages', async (req) => {
      const q = listQuery
        .merge(messageFilters)
        .extend({
          received_before: z.coerce.number().int().optional(),
          received_after: z.coerce.number().int().optional(),
          fields: z.string().optional(),
        })
        .parse(req.query);
      const g = await mailbox(req, req.params.grant_id);
      const offset = decodeCursor(q.page_token);
      const args: unknown[] = [g.id];
      const where = ['grant_id=$1', ...buildFilters(q, args)];
      if (q.received_before !== undefined) where.push(`date < $${args.push(q.received_before)}`);
      if (q.received_after !== undefined) where.push(`date > $${args.push(q.received_after)}`);
      args.push(q.limit + 1, offset);
      const r = await ctx.db.query<MessageRow>(
        `SELECT * FROM messages WHERE ${where.join(' AND ')} ORDER BY date DESC, id LIMIT $${args.length - 1} OFFSET $${args.length}`,
        args,
      );
      const { items, next_cursor } = page(r.rows, q.limit, offset);
      return listOf(req, items.map((m) => presentMessage(m, q.fields)), q.select, next_cursor);
    });

    async function getMessage(grantId: string, id: string) {
      const r = await ctx.db.query<MessageRow>('SELECT * FROM messages WHERE grant_id=$1 AND id=$2', [grantId, id]);
      if (!r.rows[0]) throw notFound('message');
      return r.rows[0];
    }

    app.get<{ Params: { grant_id: string; message_id: string }; Querystring: { fields?: string } }>(
      '/v3/grants/:grant_id/messages/:message_id',
      async (req) => {
        const g = await mailbox(req, req.params.grant_id);
        return ok(req, presentMessage(await getMessage(g.id, req.params.message_id), req.query.fields));
      },
    );

    app.put<{ Params: { grant_id: string; message_id: string } }>('/v3/grants/:grant_id/messages/:message_id', async (req) => {
      const b = updateMessageBody.parse(req.body);
      const g = await mailbox(req, req.params.grant_id);
      const cur = await getMessage(g.id, req.params.message_id);
      if (b.folders) {
        const known = await ctx.db.query<{ id: string }>('SELECT id FROM folders WHERE grant_id=$1 AND id = ANY($2::text[])', [g.id, b.folders]);
        const missing = b.folders.filter((f) => !known.rows.some((k) => k.id === f));
        if (missing.length) throw badRequest(`unknown folder id: ${missing[0]}`);
      }
      const r = await ctx.db.query<MessageRow>(
        `UPDATE messages SET unread=coalesce($3,unread), starred=coalesce($4,starred),
                folders=coalesce($5::jsonb,folders), metadata=coalesce($6::jsonb,metadata)
          WHERE grant_id=$1 AND id=$2 RETURNING *`,
        [g.id, cur.id, b.unread ?? null, b.starred ?? null, b.folders ? JSON.stringify(b.folders) : null, b.metadata ? JSON.stringify(b.metadata) : null],
      );
      const out = presentMessage(r.rows[0]!);
      await emit(ctx, g.application_id, 'message.updated', g.id, out);
      return ok(req, out);
    });

    app.delete<{ Params: { grant_id: string; message_id: string } }>('/v3/grants/:grant_id/messages/:message_id', async (req) => {
      const g = await mailbox(req, req.params.grant_id);
      const cur = await getMessage(g.id, req.params.message_id);
      await ctx.db.query('DELETE FROM messages WHERE grant_id=$1 AND id=$2', [g.id, cur.id]);
      await emit(ctx, g.application_id, 'message.deleted', g.id, { id: cur.id, object: 'message', grant_id: g.id });
      return { request_id: req.id };
    });

    app.post<{ Params: { grant_id: string }; Querystring: { type?: string; fields?: string } }>(
      '/v3/grants/:grant_id/messages/send',
      async (req) => {
        if (req.query.type === 'mime') throw providerRejected('raw MIME sending is not available in this build');
        const b = sendBody.parse(req.body);
        const sender = await mailbox(req, req.params.grant_id);
        if (b.attachments?.length) throw providerRejected('attachments are not available in this build');
        if (b.send_at !== undefined) throw providerRejected('scheduled sending is not available in this build');
        if (b.tracking_options) throw providerRejected('tracking options are not available in this build');
        if (b.signature_id) throw providerRejected('signatures are not available in this build');
        if (b.from?.[0] && b.from[0].email.toLowerCase() !== sender.email) {
          throw providerRejected('from must be the mailbox address; sending as another address is not available');
        }

        return idempotent(ctx.db, req, async () => {
          const recipients = [...b.to, ...(b.cc ?? []), ...(b.bcc ?? [])];
          const emails = [...new Set(recipients.map((r) => r.email.toLowerCase()))];
          const local = await ctx.db.query<GrantRow>(
            'SELECT * FROM grants WHERE application_id=$1 AND provider=$2 AND lower(email) = ANY($3::text[])',
            [sender.application_id, LOCAL_PROVIDER, emails],
          );
          const external = emails.filter((e) => !local.rows.some((g) => g.email === e));
          if (external.length) {
            throw providerRejected(
              `delivery to addresses outside this application is not available in this build: ${external.slice(0, 5).join(', ')}`,
            );
          }

          let conversation = newId('cnv');
          if (b.reply_to_message_id) {
            const orig = await getMessage(sender.id, b.reply_to_message_id);
            conversation = orig.headers.find((h) => h.name === CONVERSATION_HEADER)?.value ?? conversation;
          }
          const t = nowSec();
          const bodyText = b.body ?? '';
          const snippet = (b.is_plaintext ? bodyText : stripHtml(bodyText)).replace(/\s+/g, ' ').trim().slice(0, 100);
          const headers = [{ name: CONVERSATION_HEADER, value: conversation }, ...(b.custom_headers ?? [])];
          const fromAddr = [{ email: sender.email, ...(sender.name ? { name: sender.name } : {}) }];

          return ctx.db.tx(async (db) => {
            const tctx = { ...ctx, db };
            const insert = async (g: GrantRow, folderId: string | undefined, own: boolean) => {
              const id = newId('msg');
              const r = await db.query<MessageRow>(
                `INSERT INTO messages (id, grant_id, thread_id, subject, from_addrs, to_addrs, cc_addrs, bcc_addrs, reply_to,
                                       date, created_at, unread, starred, snippet, body, is_plaintext, folders, headers, metadata)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
                [
                  id,
                  g.id,
                  threadIdFor(g.id, conversation),
                  b.subject ?? '',
                  JSON.stringify(fromAddr),
                  JSON.stringify(b.to),
                  JSON.stringify(b.cc ?? []),
                  JSON.stringify(own ? (b.bcc ?? []) : []),
                  JSON.stringify(b.reply_to ?? []),
                  t,
                  !own,
                  own ? (b.starred ?? false) : false,
                  snippet,
                  bodyText,
                  b.is_plaintext ?? false,
                  JSON.stringify(folderId ? [folderId] : []),
                  JSON.stringify(headers),
                  JSON.stringify(own ? (b.metadata ?? {}) : {}),
                ],
              );
              const msg = r.rows[0]!;
              await emit(tctx, g.application_id, 'message.created', g.id, presentMessage(msg));
              return msg;
            };

            const sent = await insert(sender, await folderIdByAttr(db, sender.id, '\\Sent'), true);
            for (const g of local.rows) {
              await insert(g, await folderIdByAttr(db, g.id, '\\Inbox'), false);
            }
            const out = presentMessage(sent, req.query.fields);
            await emit(tctx, sender.application_id, 'message.send_success', sender.id, out);
            return ok(req, out);
          });
        });
      },
    );

    // ------------------------------------------------------------ threads

    const threadQuery = listQuery.merge(messageFilters).extend({
      latest_message_before: z.coerce.number().int().optional(),
      latest_message_after: z.coerce.number().int().optional(),
      earliest_message_date: z.coerce.number().int().optional(),
    });

    async function presentThreads(g: GrantRow, ids: string[]) {
      if (ids.length === 0) return [];
      const r = await ctx.db.query<MessageRow>(
        'SELECT * FROM messages WHERE grant_id=$1 AND thread_id = ANY($2::text[]) ORDER BY date, id',
        [g.id, ids],
      );
      return ids.map((id) => {
        const msgs = r.rows.filter((m) => m.thread_id === id);
        const latest = msgs[msgs.length - 1]!;
        const own = (m: MessageRow) => (m.from_addrs as { email: string }[]).some((a) => a.email.toLowerCase() === g.email);
        const received = msgs.filter((m) => !own(m)).map((m) => m.date);
        const sent = msgs.filter(own).map((m) => m.date);
        const seen = new Map<string, { email: string; name?: string }>();
        for (const m of msgs) {
          for (const a of [...m.from_addrs, ...m.to_addrs, ...m.cc_addrs] as { email: string; name?: string }[]) {
            if (!seen.has(a.email.toLowerCase())) seen.set(a.email.toLowerCase(), a);
          }
        }
        return {
          id,
          object: 'thread',
          grant_id: g.id,
          subject: latest.subject,
          snippet: latest.snippet,
          participants: [...seen.values()],
          message_ids: msgs.map((m) => m.id),
          draft_ids: [],
          folders: [...new Set(msgs.flatMap((m) => m.folders))],
          latest_draft_or_message: presentMessage(latest),
          has_attachments: false,
          has_drafts: false,
          starred: msgs.some((m) => m.starred),
          unread: msgs.some((m) => m.unread),
          earliest_message_date: msgs[0]!.date,
          ...(received.length ? { latest_message_received_date: Math.max(...received) } : {}),
          ...(sent.length ? { latest_message_sent_date: Math.max(...sent) } : {}),
        };
      });
    }

    app.get<{ Params: { grant_id: string } }>('/v3/grants/:grant_id/threads', async (req) => {
      const q = threadQuery.parse(req.query);
      const g = await mailbox(req, req.params.grant_id);
      const offset = decodeCursor(q.page_token);
      const args: unknown[] = [g.id];
      const where = ['grant_id=$1', ...buildFilters(q, args)];
      const having: string[] = [];
      if (q.latest_message_before !== undefined) having.push(`max(date) < $${args.push(q.latest_message_before)}`);
      if (q.latest_message_after !== undefined) having.push(`max(date) > $${args.push(q.latest_message_after)}`);
      if (q.earliest_message_date !== undefined) having.push(`min(date) = $${args.push(q.earliest_message_date)}`);
      args.push(q.limit + 1, offset);
      const ids = await ctx.db.query<{ thread_id: string }>(
        `SELECT thread_id FROM messages WHERE ${where.join(' AND ')} GROUP BY thread_id
          ${having.length ? 'HAVING ' + having.join(' AND ') : ''}
          ORDER BY max(date) DESC, thread_id LIMIT $${args.length - 1} OFFSET $${args.length}`,
        args,
      );
      const { items, next_cursor } = page(ids.rows, q.limit, offset);
      return listOf(req, await presentThreads(g, items.map((i) => i.thread_id)), q.select, next_cursor);
    });

    app.get<{ Params: { grant_id: string; thread_id: string } }>('/v3/grants/:grant_id/threads/:thread_id', async (req) => {
      const g = await mailbox(req, req.params.grant_id);
      const exists = await ctx.db.query('SELECT 1 FROM messages WHERE grant_id=$1 AND thread_id=$2 LIMIT 1', [g.id, req.params.thread_id]);
      if (exists.rows.length === 0) throw notFound('thread');
      const [t] = await presentThreads(g, [req.params.thread_id]);
      return ok(req, t);
    });
  };
