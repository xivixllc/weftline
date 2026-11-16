#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { loadConfig } from './config.js';
import { migrate } from './db/migrations.js';
import { openDb } from './runtime.js';
import { createApiKey, createApplication, revokeApiKey } from './services/auth.js';

const USAGE = `weftline admin <command> [options]

  bootstrap --name <name>       create an application and its first API key
  keys create --app <id> [--name <label>]
  keys revoke <key_id>
  migrate                       apply database migrations

Options:
  --env-file <path>             load KEY=value lines (for example from "vercel env pull")
  --json                        print machine-readable output
`;

function loadEnvFile(path: string) {
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || m[1]! in process.env) continue;
    process.env[m[1]!] = m[2]!.replace(/^(['"])(.*)\1$/, '$2');
  }
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === 'admin') args.shift();
  const envFile = flag(args, 'env-file');
  if (envFile) loadEnvFile(envFile);
  const json = args.includes('--json');
  const [cmd, sub] = args;

  if (!cmd || cmd === 'help' || cmd === '--help') return void console.log(USAGE);

  const cfg = loadConfig();
  // Migrations and admin writes need a session-capable (unpooled) connection.
  const url = process.env.DATABASE_URL_UNPOOLED ?? cfg.databaseUrl;
  const db = await openDb({ ...cfg, databaseUrl: url });
  try {
    await migrate(db);
    if (cmd === 'migrate') return void console.log('database is up to date');

    if (cmd === 'bootstrap') {
      const name = flag(args, 'name');
      if (!name) throw new Error('--name is required');
      const app = await createApplication(db, name);
      const key = await createApiKey(db, app.id, 'bootstrap');
      const out = { application_id: app.id, key_id: key.id, api_key: key.api_key };
      if (json) console.log(JSON.stringify(out));
      else {
        console.log(`application_id: ${out.application_id}`);
        console.log(`api_key:        ${out.api_key}   (shown once; store it now)`);
      }
      return;
    }
    if (cmd === 'keys' && sub === 'create') {
      const appId = flag(args, 'app');
      if (!appId) throw new Error('--app is required');
      const key = await createApiKey(db, appId, flag(args, 'name') ?? '');
      console.log(json ? JSON.stringify(key) : `key_id: ${key.id}\napi_key: ${key.api_key}   (shown once)`);
      return;
    }
    if (cmd === 'keys' && sub === 'revoke') {
      const id = args[2];
      if (!id) throw new Error('key id is required');
      console.log((await revokeApiKey(db, id)) ? 'revoked' : 'no active key with that id');
      return;
    }
    console.error(`unknown command: ${args.join(' ')}\n\n${USAGE}`);
    process.exitCode = 2;
  } finally {
    await db.close();
  }
}

main().catch((e) => {
  console.error(`error: ${(e as Error).message}`);
  process.exit(1);
});
