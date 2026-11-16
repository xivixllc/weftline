import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decrypt, encrypt } from '../src/lib/crypto.js';
import { decodeCursor, encodeCursor, pick } from '../src/lib/pagination.js';
import { assertPublicUrl } from '../src/lib/url.js';
import { harness, type Harness } from './helpers.js';
import { randomBytes } from 'node:crypto';

describe('crypto', () => {
  it('round-trips and supports key rotation', () => {
    const a = randomBytes(32);
    const b = randomBytes(32);
    const blob = encrypt('secret value', a);
    expect(blob).not.toContain('secret');
    expect(decrypt(blob, [a])).toBe('secret value');
    expect(decrypt(blob, [b, a])).toBe('secret value'); // old key still readable during rotation
    expect(() => decrypt(blob, [b])).toThrow();
    const tampered = blob.slice(0, -2) + (blob.endsWith('AA') ? 'BB' : 'AA');
    expect(() => decrypt(tampered, [a])).toThrow();
  });
});

describe('pagination helpers', () => {
  it('encodes and decodes cursors and rejects garbage', () => {
    expect(decodeCursor(encodeCursor(40))).toBe(40);
    expect(decodeCursor(undefined)).toBe(0);
    expect(() => decodeCursor('not-a-cursor')).toThrow();
  });
  it('selects fields', () => {
    expect(pick({ id: 1, a: 2, b: 3 }, 'id, b')).toEqual({ id: 1, b: 3 });
  });
});

describe('webhook URL guard', () => {
  it('rejects plain http, credentials and private addresses when private targets are off', async () => {
    await expect(assertPublicUrl('http://example.com/x', false)).rejects.toThrow(/https/);
    await expect(assertPublicUrl('https://u:p@example.com/x', false)).rejects.toThrow(/credentials/);
    for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '169.254.169.254', '172.16.0.1', '[::1]']) {
      await expect(assertPublicUrl(`https://${ip}/x`, false)).rejects.toThrow(/public/);
    }
    await expect(assertPublicUrl('https://8.8.8.8/x', false)).resolves.toBeInstanceOf(URL);
  });
});

describe('http basics', () => {
  let h: Harness;
  beforeAll(async () => void (h = await harness({ rateLimitPerKey: 3 })));
  afterAll(() => h.close());

  it('serves /healthz without a key', async () => {
    const r = await h.app.inject({ method: 'GET', url: '/healthz' });
    expect(r.statusCode).toBe(200);
  });

  it('rejects missing and bad keys with the error envelope', async () => {
    for (const authorization of [undefined, 'Bearer wl_live_nope', 'Basic abc', 'Bearer other_prefix']) {
      const r = await h.app.inject({ method: 'GET', url: '/v3/grants', headers: authorization ? { authorization } : {} });
      expect(r.statusCode).toBe(401);
      const j = r.json();
      expect(j.error.type).toBe('unauthorized');
      expect(j.request_id).toMatch(/^req_/);
      expect(r.headers['x-request-id']).toBe(j.request_id);
    }
  });

  it('returns not_found_error for unknown routes and invalid JSON as 400', async () => {
    const t = await h.tenant();
    expect((await t.call('GET', '/v3/nope')).json.error.type).toBe('not_found_error');
    const bad = await h.app.inject({
      method: 'POST',
      url: '/v3/connect/custom',
      headers: { authorization: `Bearer ${t.key}`, 'content-type': 'application/json' },
      payload: '{ not json',
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.type).toBe('invalid_request_error');
  });

  it('rate limits per key with Retry-After', async () => {
    const t = await h.tenant('limited');
    const codes: number[] = [];
    let last: Awaited<ReturnType<typeof t.call>> | undefined;
    for (let i = 0; i < 5; i++) {
      last = await t.call('GET', '/v3/applications');
      codes.push(last.status);
    }
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect(last!.json.error.type).toBe('rate_limit_error');
    expect(Number(last!.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('returns application details', async () => {
    const t = await h.tenant('acadpak');
    const r = await t.call('GET', '/v3/applications');
    // New tenant => fresh limiter window.
    expect(r.json.data.application_id).toBe(t.appId);
    expect(r.json.data.branding.name).toBe('acadpak');
  });
});
