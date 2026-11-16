import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { createPgliteDb, type Db } from '../src/db/index.js';
import { migrate } from '../src/db/migrations.js';
import { createApiKey, createApplication } from '../src/services/auth.js';
import type { Ctx } from '../src/services/events.js';

export interface SentRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface Harness {
  app: FastifyInstance;
  db: Db;
  ctx: Ctx;
  /** Requests the server made to outside URLs (webhook challenges and deliveries). */
  outbound: SentRequest[];
  /** Set to change how the fake receiver answers a webhook POST. */
  receiver: { status: number };
  tenant(name?: string): Promise<{ appId: string; key: string; call: Call }>;
  close(): Promise<void>;
}

export type Call = (
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>,
) => Promise<{ status: number; json: any; headers: Record<string, any> }>;

export async function harness(over: Partial<Config> = {}): Promise<Harness> {
  const db = await createPgliteDb();
  await migrate(db);
  const outbound: SentRequest[] = [];
  const receiver = { status: 200 };

  // Fake network: a receiver that echoes the challenge on GET and answers POSTs with `receiver.status`.
  const fetchImpl = (async (input: URL | string, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>));
    outbound.push({ url: url.toString(), method: init.method ?? 'GET', headers, body: init.body as string | undefined });
    if ((init.method ?? 'GET') === 'GET') {
      if (url.hostname === 'bad-challenge.test') return new Response('nope', { status: 200 });
      return new Response(url.searchParams.get('challenge') ?? '', { status: 200 });
    }
    return new Response('', { status: receiver.status });
  }) as typeof fetch;

  const cfg: Config = {
    publicUrl: 'http://localhost:3000',
    pgliteDir: '',
    tokenKey: randomBytes(32),
    rateLimitPerKey: 1000,
    webhookMaxAttempts: 4,
    allowPrivateWebhooks: true,
    workersInProcess: false,
    ...over,
  };
  const ctx: Ctx = { db, cfg, fetchImpl };
  const app = await buildApp(ctx);
  await app.ready();

  return {
    app,
    db,
    ctx,
    outbound,
    receiver,
    async tenant(name = 'test-app') {
      const a = await createApplication(db, name);
      const k = await createApiKey(db, a.id);
      const call: Call = async (method, url, body, headers = {}) => {
        const res = await app.inject({
          method: method as 'GET',
          url,
          headers: { authorization: `Bearer ${k.api_key}`, ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
          payload: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : undefined, headers: res.headers };
      };
      return { appId: a.id, key: k.api_key, call };
    },
    async close() {
      await app.close();
      await db.close();
    },
  };
}

/** Create a local mailbox grant and return its ID. */
export async function mailbox(call: Call, email: string, name?: string): Promise<string> {
  const r = await call('POST', '/v3/connect/custom', { provider: 'weftline', settings: { email }, ...(name ? { name } : {}) });
  if (r.status !== 200) throw new Error(`mailbox create failed: ${JSON.stringify(r.json)}`);
  return r.json.data.id;
}
