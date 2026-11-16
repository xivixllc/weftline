import type { Db } from './index.js';

export const migrations: { id: string; sql: string }[] = [
  {
    id: '001_core',
    sql: `
CREATE TABLE applications (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE api_keys (
  id text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_at bigint NOT NULL,
  revoked_at bigint
);

CREATE TABLE grants (
  id text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  provider text NOT NULL,
  email text NOT NULL,
  name text,
  scope jsonb NOT NULL DEFAULT '[]',
  state text,
  grant_status text NOT NULL DEFAULT 'valid',
  settings_enc text,
  workspace_id text,
  blocked boolean NOT NULL DEFAULT false,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (application_id, provider, email)
);
CREATE INDEX grants_app_created ON grants (application_id, created_at);
CREATE INDEX grants_app_email ON grants (application_id, email);

CREATE TABLE webhooks (
  id text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  description text,
  trigger_types jsonb NOT NULL,
  webhook_url text NOT NULL,
  secret_enc text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  notification_email_addresses jsonb NOT NULL DEFAULT '[]',
  status_updated_at bigint NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE events (
  id text PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type text NOT NULL,
  grant_id text,
  object jsonb NOT NULL,
  created_at bigint NOT NULL
);

CREATE TABLE deliveries (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  webhook_id text NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at bigint NOT NULL,
  last_status integer,
  last_error text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);
CREATE INDEX deliveries_due ON deliveries (status, next_attempt_at);

CREATE TABLE idempotency_keys (
  application_id text NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at bigint NOT NULL,
  PRIMARY KEY (application_id, key)
);
`,
  },
  {
    id: '002_local_mailbox',
    sql: `
CREATE TABLE folders (
  id text PRIMARY KEY,
  grant_id text NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  name text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '[]',
  system_folder boolean NOT NULL DEFAULT false,
  parent_id text,
  text_color text,
  background_color text,
  created_at bigint NOT NULL
);
CREATE INDEX folders_grant ON folders (grant_id);

CREATE TABLE messages (
  id text PRIMARY KEY,
  grant_id text NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  thread_id text NOT NULL,
  subject text NOT NULL DEFAULT '',
  from_addrs jsonb NOT NULL DEFAULT '[]',
  to_addrs jsonb NOT NULL DEFAULT '[]',
  cc_addrs jsonb NOT NULL DEFAULT '[]',
  bcc_addrs jsonb NOT NULL DEFAULT '[]',
  reply_to jsonb NOT NULL DEFAULT '[]',
  date bigint NOT NULL,
  created_at bigint NOT NULL,
  unread boolean NOT NULL DEFAULT true,
  starred boolean NOT NULL DEFAULT false,
  snippet text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  is_plaintext boolean NOT NULL DEFAULT false,
  folders jsonb NOT NULL DEFAULT '[]',
  headers jsonb NOT NULL DEFAULT '[]',
  metadata jsonb NOT NULL DEFAULT '{}',
  search tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(subject,'') || ' ' || coalesce(snippet,'') || ' ' || coalesce(body,''))
  ) STORED
);
CREATE INDEX messages_grant_date ON messages (grant_id, date DESC);
CREATE INDEX messages_thread ON messages (grant_id, thread_id);
CREATE INDEX messages_search ON messages USING gin (search);
`,
  },
];

export async function migrate(db: Db): Promise<string[]> {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at bigint NOT NULL)`);
  const done = new Set((await db.query<{ id: string }>('SELECT id FROM schema_migrations')).rows.map((r) => r.id));
  const applied: string[] = [];
  for (const m of migrations) {
    if (done.has(m.id)) continue;
    await db.exec(m.sql);
    await db.query('INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)', [m.id, Math.floor(Date.now() / 1000)]);
    applied.push(m.id);
  }
  return applied;
}
