import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { harness, mailbox, type Harness } from './helpers.js';

describe('grants', () => {
  let h: Harness;
  beforeAll(async () => void (h = await harness()));
  afterAll(() => h.close());

  it('creates a mailbox grant with system folders, and never returns secrets', async () => {
    const { call } = await h.tenant();
    const r = await call('POST', '/v3/connect/custom', {
      provider: 'weftline',
      settings: { email: 'Admissions@Acadpak.com', app_password: 'correct-horse-battery' },
      name: 'Admissions',
      state: 'signup-42',
    });
    expect(r.status).toBe(200);
    const g = r.json.data;
    expect(g).toMatchObject({ provider: 'weftline', email: 'admissions@acadpak.com', grant_status: 'valid', name: 'Admissions', state: 'signup-42' });
    expect(g.id).toMatch(/^grt_/);
    expect(JSON.stringify(r.json)).not.toContain('correct-horse');
    expect(g.settings).toEqual({ email: 'admissions@acadpak.com' });

    const f = await call('GET', `/v3/grants/${g.id}/folders`);
    expect(f.json.data.map((x: any) => x.name).sort()).toEqual(['Drafts', 'Inbox', 'Sent', 'Trash']);
    expect(f.json.data.every((x: any) => x.system_folder === true)).toBe(true);
  });

  it('is idempotent per mailbox address: a repeat updates the same grant', async () => {
    const { call } = await h.tenant();
    const a = await mailbox(call, 'dup@acadpak.com');
    const r = await call('POST', '/v3/connect/custom', { provider: 'weftline', settings: { email: 'DUP@acadpak.com' }, name: 'Renamed' });
    expect(r.json.data.id).toBe(a);
    expect(r.json.data.name).toBe('Renamed');
    expect((await call('GET', '/v3/grants')).json.data).toHaveLength(1);
  });

  it('accepts the legacy agent provider value', async () => {
    const { call } = await h.tenant();
    const r = await call('POST', '/v3/connect/custom', { provider: 'nylas', settings: { email: 'legacy@acadpak.com' } });
    expect(r.status).toBe(200);
    expect(r.json.data.provider).toBe('weftline');
  });

  it('finds a grant by ID or by email, case-insensitively', async () => {
    const { call } = await h.tenant();
    const id = await mailbox(call, 'find.me@acadpak.com');
    expect((await call('GET', `/v3/grants/${id}`)).json.data.id).toBe(id);
    expect((await call('GET', '/v3/grants/Find.Me@acadpak.com')).json.data.id).toBe(id);
    expect((await call('GET', '/v3/grants/grt_missing')).status).toBe(404);
  });

  it('refuses providers whose connectors are not built yet, with a clear reason', async () => {
    const { call } = await h.tenant();
    for (const provider of ['google', 'imap']) {
      const r = await call('POST', '/v3/connect/custom', { provider, settings: { x: 1 } });
      expect(r.status).toBe(422);
      expect(r.json.error.type).toBe('provider_rejected');
      expect(r.json.error.message).toContain('not implemented');
    }
  });

  it('validates input strictly', async () => {
    const { call } = await h.tenant();
    const cases: [unknown, RegExp][] = [
      [{ provider: 'weftline', settings: { email: 'not-an-email' } }, /email/],
      [{ provider: 'weftline', settings: { email: 'a@b.co', extra: 1 } }, /extra|Unrecognized/i],
      [{ provider: 'weftline', settings: { email: 'a@b.co' }, surprise: true }, /Unrecognized/i],
      [{ provider: 'carrier-pigeon', settings: {} }, /provider/],
      [{ provider: 'weftline', settings: { email: 'a@b.co', app_password: 'short' } }, /app_password/],
    ];
    for (const [body, msg] of cases) {
      const r = await call('POST', '/v3/connect/custom', body);
      expect(r.status, JSON.stringify(body)).toBe(400);
      expect(r.json.error.message).toMatch(msg);
    }
  });

  it('lists with filters, sorting and cursor paging', async () => {
    const { call } = await h.tenant();
    for (const n of ['a', 'b', 'c']) await mailbox(call, `${n}@acadpak.com`);
    const p1 = await call('GET', '/v3/grants?limit=2&sort_by=created_at&order_by=asc');
    expect(p1.json.data).toHaveLength(2);
    expect(p1.json.next_cursor).toBeTruthy();
    const p2 = await call('GET', `/v3/grants?limit=2&sort_by=created_at&order_by=asc&page_token=${p1.json.next_cursor}`);
    expect(p2.json.data).toHaveLength(1);
    expect(p2.json.next_cursor).toBeUndefined();
    const emails = [...p1.json.data, ...p2.json.data].map((g: any) => g.email);
    expect(new Set(emails).size).toBe(3);

    expect((await call('GET', '/v3/grants?email=B@acadpak.com')).json.data).toHaveLength(1);
    expect((await call('GET', '/v3/grants?provider=google')).json.data).toHaveLength(0);
    const selected = (await call('GET', '/v3/grants?select=email')).json.data[0];
    expect(Object.keys(selected)).toEqual(['email']);
    expect((await call('GET', '/v3/grants?limit=500')).status).toBe(400);
    expect((await call('GET', '/v3/grants?page_token=garbage')).status).toBe(400);
  });

  it('updates and deletes a grant, and cascades its data', async () => {
    const { call } = await h.tenant();
    const id = await mailbox(call, 'gone@acadpak.com');
    const u = await call('PATCH', `/v3/grants/${id}`, { name: 'Gone soon', settings: { app_password: 'a-new-password' } });
    expect(u.json.data.name).toBe('Gone soon');
    expect((await call('PATCH', `/v3/grants/${id}`, { settings: { email: 'other@acadpak.com' } })).status).toBe(422);
    expect((await call('PATCH', `/v3/grants/${id}`, { bogus: 1 })).status).toBe(400);

    const d = await call('DELETE', `/v3/grants/${id}`);
    expect(d.status).toBe(200);
    expect(d.json.data).toBeUndefined();
    expect((await call('GET', `/v3/grants/${id}`)).status).toBe(404);
    const left = await h.db.query<{ n: number }>('SELECT count(*)::int AS n FROM folders WHERE grant_id=$1', [id]);
    expect(left.rows[0]!.n).toBe(0);
  });

  it('keeps tenants apart', async () => {
    const a = await h.tenant('tenant-a');
    const b = await h.tenant('tenant-b');
    const id = await mailbox(a.call, 'private@acadpak.com');
    expect((await b.call('GET', `/v3/grants/${id}`)).status).toBe(404);
    expect((await b.call('GET', '/v3/grants/private@acadpak.com')).status).toBe(404);
    expect((await b.call('GET', '/v3/grants')).json.data).toHaveLength(0);
    expect((await b.call('DELETE', `/v3/grants/${id}`)).status).toBe(404);
    expect((await b.call('GET', `/v3/grants/${id}/messages`)).status).toBe(404);
    // The same address can exist independently in another application.
    expect(await mailbox(b.call, 'private@acadpak.com')).not.toBe(id);
    expect((await a.call('GET', `/v3/grants/${id}`)).status).toBe(200);
  });
});
