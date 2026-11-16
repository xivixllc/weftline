import type { FastifyRequest } from 'fastify';
import type { Db } from '../db/index.js';
import { conflict, badRequest } from './errors.js';
import { sha256 } from './crypto.js';
import { nowSec } from './ids.js';

const TTL_SEC = 24 * 3600;

/**
 * Run `handler` once per Idempotency-Key. A repeat with the same body replays the first
 * response; the same key with a different body is a conflict.
 */
export async function idempotent<T>(
  db: Db,
  req: FastifyRequest,
  handler: () => Promise<T>,
): Promise<T> {
  const key = req.headers['idempotency-key'];
  if (key === undefined) return handler();
  if (typeof key !== 'string' || key.length === 0 || key.length > 255) {
    throw badRequest('Idempotency-Key must be 1 to 255 characters');
  }
  const appId = req.principal.applicationId;
  const hash = sha256(`${req.method} ${req.url.split('?')[0]} ${JSON.stringify(req.body ?? null)}`);
  const found = (
    await db.query<{ request_hash: string; response: T; created_at: number }>(
      'SELECT request_hash, response, created_at FROM idempotency_keys WHERE application_id=$1 AND key=$2',
      [appId, key],
    )
  ).rows[0];
  if (found && found.created_at > nowSec() - TTL_SEC) {
    if (found.request_hash !== hash) throw conflict('Idempotency-Key was already used with a different request');
    return found.response;
  }
  if (found) await db.query('DELETE FROM idempotency_keys WHERE application_id=$1 AND key=$2', [appId, key]);
  const response = await handler();
  await db.query(
    `INSERT INTO idempotency_keys (application_id, key, request_hash, response, created_at)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [appId, key, hash, JSON.stringify(response), nowSec()],
  );
  return response;
}
