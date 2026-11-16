import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { badRequest } from './errors.js';

function privateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase();
    return (
      v === '::1' ||
      v === '::' ||
      v.startsWith('fc') ||
      v.startsWith('fd') ||
      v.startsWith('fe80') ||
      (v.startsWith('::ffff:') && privateAddress(v.slice(7)))
    );
  }
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

/**
 * Webhook targets must be public HTTPS URLs, so a webhook cannot be pointed at the
 * server's own network. Resolved addresses are checked at creation and again at delivery.
 */
export async function assertPublicUrl(raw: string, allowPrivate: boolean): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw badRequest('webhook_url is not a valid URL');
  }
  if (allowPrivate) return u;
  if (u.protocol !== 'https:') throw badRequest('webhook_url must use https');
  if (u.username || u.password) throw badRequest('webhook_url must not contain credentials');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a) => a.address);
  if (addrs.length === 0) throw badRequest('webhook_url host does not resolve');
  if (addrs.some(privateAddress)) throw badRequest('webhook_url must point to a public address');
  return u;
}
