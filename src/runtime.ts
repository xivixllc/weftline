import { buildApp } from './app.js';
import { loadConfig, type Config } from './config.js';
import { createPgDb, createPgliteDb, type Db } from './db/index.js';
import { migrate } from './db/migrations.js';
import { deliverDue, type Ctx } from './services/events.js';

export async function openDb(cfg: Config): Promise<Db> {
  return cfg.databaseUrl ? createPgDb(cfg.databaseUrl) : createPgliteDb(cfg.pgliteDir);
}

export async function createRuntime(env: NodeJS.ProcessEnv = process.env) {
  const cfg = loadConfig(env);
  if (!cfg.tokenKey) {
    // Development only: an ephemeral key means stored secrets are unreadable after a restart.
    const { randomBytes } = await import('node:crypto');
    cfg.tokenKey = randomBytes(32);
    console.warn('TOKEN_ENCRYPTION_KEY is not set; using a temporary key for this process');
  }
  const db = await openDb(cfg);
  if (!cfg.databaseUrl) await migrate(db); // local database: keep the schema current automatically
  const ctx: Ctx = { db, cfg, fetchImpl: fetch };
  const app = await buildApp(ctx);
  return { cfg, db, ctx, app };
}

/** Deliver due webhooks in a loop until `signal` aborts. */
export async function runWorker(ctx: Ctx, signal: AbortSignal, intervalMs = 2000) {
  while (!signal.aborted) {
    try {
      const n = await deliverDue(ctx);
      if (n > 0) continue; // more may be waiting
    } catch (e) {
      console.error('worker error', e);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
