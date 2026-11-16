export interface Db {
  query<T = Record<string, any>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Run one or more statements with no parameters. */
  exec(sql: string): Promise<void>;
  /** Run `fn` in one transaction; it commits when `fn` resolves and rolls back when it throws. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function createPgDb(url: string): Promise<Db> {
  const { default: pg } = await import('pg');
  // pg returns BIGINT as a string; all of ours are Unix seconds, which fit in a JS number.
  pg.types.setTypeParser(20, (v: string) => Number(v));
  // Serverless-friendly: few connections per instance; the pooled URL does the real pooling.
  const pool = new pg.Pool({ connectionString: url, max: 5 });

  const wrap = (q: { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }, inTx: boolean): Db => {
    const self: Db = {
      query: async (sql, params) => ({ rows: (await q.query(sql, params as any[])).rows }),
      exec: async (sql) => {
        await q.query(sql);
      },
      tx: async (fn) => (inTx ? fn(self) : runTx(fn)),
      close: () => pool.end(),
    };
    return self;
  };
  const runTx = async <T>(fn: (db: Db) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(wrap(client, true));
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw e;
    } finally {
      client.release();
    }
  };
  return wrap(pool, false);
}

/** Postgres compiled to WASM. Used for local development and tests; not for production. */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  if (dataDir) (await import('node:fs')).mkdirSync(dataDir, { recursive: true });
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  const parsers = { 20: (v: string) => Number(v) };
  type Q = {
    query: (sql: string, params?: any[], opts?: any) => Promise<{ rows: any[] }>;
    exec: (sql: string) => Promise<unknown>;
  };

  const wrap = (q: Q, inTx: boolean): Db => {
    const self: Db = {
      query: async (sql, params) => ({ rows: (await q.query(sql, params as any[], { parsers })).rows }),
      exec: async (sql) => {
        await q.exec(sql);
      },
      tx: async (fn) => (inTx ? fn(self) : pg.transaction((t) => fn(wrap(t as unknown as Q, true)))),
      close: () => pg.close(),
    };
    return self;
  };
  return wrap(pg as unknown as Q, false);
}
