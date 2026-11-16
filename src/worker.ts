import { loadConfig } from './config.js';
import { openDb } from './runtime.js';
import { runWorker } from './runtime.js';

// Standalone worker process: this is what the Vercel Daemon runs.
const cfg = loadConfig();
if (!cfg.databaseUrl) throw new Error('DATABASE_URL is required for a standalone worker');
const url = process.env.DATABASE_URL_UNPOOLED ?? cfg.databaseUrl;
const db = await openDb({ ...cfg, databaseUrl: url });
const stop = new AbortController();
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => stop.abort());
console.log('weftline worker started');
await runWorker({ db, cfg, fetchImpl: fetch }, stop.signal);
await db.close();
