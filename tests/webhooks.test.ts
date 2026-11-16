import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { harness, type Call, type Harness } from './helpers.js';

const create = (call: Call, over: object = {}) =>
  call('POST', '/v3/webhooks', { trigger_types: ['grant.created', 'message.created'], webhook_url: 'https://acadpak.com/hook', ...over });

describe('webhooks', () => {
  let h: Harness;
  beforeAll(async () => void (h = await harness()));
  afterAll(() => h.close());

  it('runs the challenge handshake and returns the secret only once', async () => {
    const { call } = await h.tenant();
    h.outbound.length = 0;
    const r = await create(call, { description: 'prod', notification_email_addresses: ['ops@acadpak.com'] });
    expect(r.status).toBe(200);
    expect(r.json.data).toMatchObject({ status: 'active', description: 'prod', trigger_types: ['grant.created', 'message.created'] });
    expect(r.json.data.webhook_secret).toMatch(/^[0-9a-f]{32}$/);

    const probe = h.outbound.find((o) => o.method === 'GET')!;
    expect(new URL(probe.url).searchParams.get('challenge')).toMatch(/^[0-9a-f]{16}$/);

    const id = r.json.data.id;
    expect((await call('GET', `/v3/webhooks/${id}`)).json.data.webhook_secret).toBeUndefined();
    expect((await call('GET', '/v3/webhooks')).json.data[0].webhook_secret).toBeUndefined();
  });

  it('refuses a URL that fails the challenge, and bad input', async () => {
    const { call } = await h.tenant();
    const bad = await create(call, { webhook_url: 'https://bad-challenge.test/hook' });
    expect(bad.status).toBe(400);
    expect(bad.json.error.message).toMatch(/echo/);
    expect((await call('GET', '/v3/webhooks')).json.data).toHaveLength(0);

    expect((await create(call, { trigger_types: ['message.exploded'] })).status).toBe(400);
    expect((await create(call, { trigger_types: [] })).status).toBe(400);
    expect((await create(call, { webhook_url: 'not a url' })).status).toBe(400);
    expect((await create(call, { surprise: 1 })).status).toBe(400);
  });

  it('blocks private targets and plain http when private targets are off', async () => {
    const strict = await harness({ allowPrivateWebhooks: false });
    try {
      const { call } = await strict.tenant();
      for (const url of ['http://acadpak.com/hook', 'https://127.0.0.1/hook', 'https://169.254.169.254/latest', 'https://10.1.2.3/x']) {
        expect((await create(call, { webhook_url: url })).status, url).toBe(400);
      }
      expect(strict.outbound).toHaveLength(0); // never even probed
    } finally {
      await strict.close();
    }
  });

  it('updates, rotates the secret (both routes) and deletes', async () => {
    const { call } = await h.tenant();
    const c = await create(call);
    const id = c.json.data.id;

    const u = await call('PUT', `/v3/webhooks/${id}`, { trigger_types: ['folder.created'], description: 'changed' });
    expect(u.json.data).toMatchObject({ trigger_types: ['folder.created'], description: 'changed' });

    const r1 = await call('POST', `/v3/webhooks/rotate-secret/${id}`, {});
    expect(r1.json.data.webhook_secret).not.toBe(c.json.data.webhook_secret);
    const r2 = await call('PUT', `/v3/webhooks/${id}/rotate-secret`, {});
    expect(r2.json.data.webhook_secret).not.toBe(r1.json.data.webhook_secret);

    expect((await call('GET', '/v3/webhooks/ip-addresses')).json.data.ip_addresses).toEqual([]);
    expect((await call('DELETE', `/v3/webhooks/${id}`)).json.data).toEqual({ status: 'success' });
    expect((await call('GET', `/v3/webhooks/${id}`)).status).toBe(404);
  });

  it('keeps tenants apart', async () => {
    const a = await h.tenant();
    const b = await h.tenant();
    const id = (await create(a.call)).json.data.id;
    expect((await b.call('GET', `/v3/webhooks/${id}`)).status).toBe(404);
    expect((await b.call('DELETE', `/v3/webhooks/${id}`)).status).toBe(404);
    expect((await b.call('POST', `/v3/webhooks/rotate-secret/${id}`, {})).status).toBe(404);
  });
});
