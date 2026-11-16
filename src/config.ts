export interface Config {
  publicUrl: string;
  databaseUrl?: string;
  pgliteDir: string;
  tokenKey: Buffer;
  tokenKeyPrevious?: Buffer;
  rateLimitPerKey: number;
  webhookMaxAttempts: number;
  /** Allow http:// and private-network webhook URLs. Development and tests only. */
  allowPrivateWebhooks: boolean;
  /** Extra header name that also carries the signature, for receivers written for older clients. */
  legacySignatureHeader?: string;
  workersInProcess: boolean;
}

function key(name: string, value: string | undefined, required: boolean): Buffer | undefined {
  if (!value) {
    if (required) throw new Error(`${name} is required (32 bytes, base64)`);
    return undefined;
  }
  const buf = Buffer.from(value, 'base64');
  if (buf.length !== 32) throw new Error(`${name} must decode to exactly 32 bytes`);
  return buf;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL || undefined;
  const prod = env.NODE_ENV === 'production';
  return {
    publicUrl: (env.WEFTLINE_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
    databaseUrl,
    pgliteDir: env.PGLITE_DIR ?? '.data/pglite',
    tokenKey: key('TOKEN_ENCRYPTION_KEY', env.TOKEN_ENCRYPTION_KEY, prod)!,
    tokenKeyPrevious: key('TOKEN_ENCRYPTION_KEY_PREVIOUS', env.TOKEN_ENCRYPTION_KEY_PREVIOUS, false),
    rateLimitPerKey: Number(env.RATE_LIMIT_PER_KEY ?? 600),
    webhookMaxAttempts: Number(env.WEBHOOK_MAX_ATTEMPTS ?? 10),
    allowPrivateWebhooks: env.ALLOW_PRIVATE_WEBHOOKS === 'true',
    legacySignatureHeader: env.WEFTLINE_LEGACY_SIGNATURE_HEADER || undefined,
    workersInProcess: env.WORKERS_IN_PROCESS ? env.WORKERS_IN_PROCESS === 'true' : !databaseUrl,
  };
}
