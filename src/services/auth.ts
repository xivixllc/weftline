import type { Db } from '../db/index.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { newId, nowSec } from '../lib/ids.js';

export const KEY_PREFIX = 'wl_live_';

export async function createApplication(db: Db, name: string) {
  const id = newId('app');
  const t = nowSec();
  await db.query('INSERT INTO applications (id, name, created_at, updated_at) VALUES ($1,$2,$3,$4)', [id, name, t, t]);
  return { id, name, created_at: t };
}

export async function createApiKey(db: Db, applicationId: string, name = '') {
  const secret = KEY_PREFIX + randomToken(24);
  const id = newId('key');
  await db.query(
    'INSERT INTO api_keys (id, application_id, name, prefix, key_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6)',
    [id, applicationId, name, secret.slice(0, 12), sha256(secret), nowSec()],
  );
  return { id, api_key: secret };
}

export async function revokeApiKey(db: Db, id: string) {
  const r = await db.query('UPDATE api_keys SET revoked_at=$2 WHERE id=$1 AND revoked_at IS NULL RETURNING id', [
    id,
    nowSec(),
  ]);
  return r.rows.length > 0;
}

export interface Principal {
  applicationId: string;
  keyId: string;
}

export async function authenticate(db: Db, bearer: string | undefined): Promise<Principal | null> {
  if (!bearer || !bearer.startsWith(KEY_PREFIX)) return null;
  const r = await db.query<{ id: string; application_id: string }>(
    'SELECT id, application_id FROM api_keys WHERE key_hash=$1 AND revoked_at IS NULL',
    [sha256(bearer)],
  );
  const row = r.rows[0];
  return row ? { applicationId: row.application_id, keyId: row.id } : null;
}
