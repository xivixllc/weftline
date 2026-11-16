import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** AES-256-GCM. Format: v1.<iv>.<tag>.<ciphertext>, each base64url. */
export function encrypt(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.');
}

export function decrypt(blob: string, keys: Buffer[]): string {
  const [v, iv, tag, ct] = blob.split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('unrecognised ciphertext format');
  for (const key of keys) {
    try {
      const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
      d.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
    } catch {
      /* try the next key */
    }
  }
  throw new Error('could not decrypt with any configured key');
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const hmacHex = (secret: string, body: string | Buffer) =>
  createHmac('sha256', secret).update(body).digest('hex');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const randomToken = (bytes = 24) => randomBytes(bytes).toString('base64url');
