import type { Config } from '../config.js';
import type { Db } from '../db/index.js';
import { decrypt, hmacHex } from '../lib/crypto.js';
import { newId, nowSec } from '../lib/ids.js';
import { assertPublicUrl } from '../lib/url.js';

export interface Ctx {
  db: Db;
  cfg: Config;
  fetchImpl: typeof fetch;
}

/** Triggers this build can emit. The full list is in docs/api/webhooks.md. */
export const EVENT_TYPES = [
  'grant.created',
  'grant.updated',
  'grant.deleted',
  'grant.expired',
  'grant.imap_sync_completed',
  'message.created',
  'message.updated',
  'message.deleted',
  'message.send_success',
  'message.send_failed',
  'folder.created',
  'folder.updated',
  'folder.deleted',
] as const;

/** Record an event and queue one delivery per matching webhook. */
export async function emit(ctx: Ctx, applicationId: string, type: string, grantId: string | null, object: unknown) {
  const id = newId('evt');
  const t = nowSec();
  await ctx.db.query(
    'INSERT INTO events (id, application_id, type, grant_id, object, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, applicationId, type, grantId, JSON.stringify(object), t],
  );
  const hooks = await ctx.db.query<{ id: string }>(
    `SELECT id FROM webhooks
      WHERE application_id=$1 AND status IN ('active','failing') AND trigger_types @> $2::jsonb`,
    [applicationId, JSON.stringify([type])],
  );
  for (const h of hooks.rows) {
    await ctx.db.query(
      `INSERT INTO deliveries (id, event_id, webhook_id, next_attempt_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$4,$4)`,
      [newId('dlv'), id, h.id, t],
    );
  }
  return id;
}

const backoff = (attempts: number) => Math.min(3600, 10 * 2 ** attempts);

/** Deliver due webhooks once. Safe to run from several workers at the same time. */
export async function deliverDue(ctx: Ctx, limit = 20): Promise<number> {
  const t = nowSec();
  const claimed = await ctx.db.query<{ id: string; event_id: string; webhook_id: string; attempts: number }>(
    `UPDATE deliveries SET status='sending', updated_at=$1
      WHERE id IN (
        SELECT id FROM deliveries
         WHERE (status='pending' AND next_attempt_at <= $1) OR (status='sending' AND updated_at < $1 - 60)
         ORDER BY next_attempt_at LIMIT $2 FOR UPDATE SKIP LOCKED)
      RETURNING id, event_id, webhook_id, attempts`,
    [t, limit],
  );
  for (const d of claimed.rows) await deliverOne(ctx, d);
  return claimed.rows.length;
}

async function deliverOne(ctx: Ctx, d: { id: string; event_id: string; webhook_id: string; attempts: number }) {
  const { db, cfg } = ctx;
  const row = (
    await db.query<{
      type: string;
      object: unknown;
      created_at: number;
      webhook_url: string;
      secret_enc: string;
      status: string;
    }>(
      `SELECT e.type, e.object, e.created_at, w.webhook_url, w.secret_enc, w.status
         FROM events e JOIN webhooks w ON w.id=$2 WHERE e.id=$1`,
      [d.event_id, d.webhook_id],
    )
  ).rows[0];
  if (!row) {
    await db.query(`UPDATE deliveries SET status='failed', last_error='webhook or event missing', updated_at=$2 WHERE id=$1`, [
      d.id,
      nowSec(),
    ]);
    return;
  }
  const body = JSON.stringify({
    specversion: '1.0',
    type: row.type,
    source: '/weftline/grants',
    id: d.event_id,
    time: new Date(row.created_at * 1000).toISOString().replace('.000Z', 'Z'),
    data: { object: row.object },
  });
  const secret = decrypt(row.secret_enc, [cfg.tokenKey, ...(cfg.tokenKeyPrevious ? [cfg.tokenKeyPrevious] : [])]);
  const signature = hmacHex(secret, body);

  let status: number | null = null;
  let error: string | null = null;
  try {
    const url = await assertPublicUrl(row.webhook_url, cfg.allowPrivateWebhooks);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Weftline-Webhooks/1',
      'X-Weftline-Signature': signature,
    };
    if (cfg.legacySignatureHeader) headers[cfg.legacySignatureHeader] = signature;
    const res = await ctx.fetchImpl(url, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    if (res.status < 200 || res.status >= 300) error = `receiver answered ${res.status}`;
  } catch (e) {
    error = (e as Error).message.slice(0, 300);
  }

  const t = nowSec();
  const attempts = d.attempts + 1;
  if (!error) {
    await db.query(
      `UPDATE deliveries SET status='delivered', attempts=$2, last_status=$3, last_error=NULL, updated_at=$4 WHERE id=$1`,
      [d.id, attempts, status, t],
    );
    if (row.status === 'failing') {
      await db.query(`UPDATE webhooks SET status='active', status_updated_at=$2, updated_at=$2 WHERE id=$1`, [d.webhook_id, t]);
    }
    return;
  }
  if (attempts >= cfg.webhookMaxAttempts) {
    await db.query(
      `UPDATE deliveries SET status='failed', attempts=$2, last_status=$3, last_error=$4, updated_at=$5 WHERE id=$1`,
      [d.id, attempts, status, error, t],
    );
    await db.query(`UPDATE webhooks SET status='failed', status_updated_at=$2, updated_at=$2 WHERE id=$1`, [d.webhook_id, t]);
    return;
  }
  await db.query(
    `UPDATE deliveries SET status='pending', attempts=$2, last_status=$3, last_error=$4, next_attempt_at=$5, updated_at=$6 WHERE id=$1`,
    [d.id, attempts, status, error, t + backoff(attempts), t],
  );
  if (attempts >= 3 && row.status === 'active') {
    await db.query(`UPDATE webhooks SET status='failing', status_updated_at=$2, updated_at=$2 WHERE id=$1`, [d.webhook_id, t]);
  }
}
