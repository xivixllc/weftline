import { loadConfig } from '../config.js';
import { createPgDb, createPgliteDb } from './index.js';
import { migrate } from './migrations.js';

const cfg = loadConfig();
const url = process.env.DATABASE_URL_UNPOOLED ?? cfg.databaseUrl;
const db = url ? await createPgDb(url) : await createPgliteDb(cfg.pgliteDir);
const applied = await migrate(db);
console.log(applied.length ? `applied: ${applied.join(', ')}` : 'database is up to date');
await db.close();
