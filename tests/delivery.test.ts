import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hmacHex } from '../src/lib/crypto.js';
import { deliverDue } from '../src/services/events.js';
import { harness, mailbox, type Call, type Harness } from './helpers.js';

describe('webhook delivery', () => {
  let h: Harness;
  beforeAll(async () => void (h = await harness({ webhookMaxAttempts: 4, legacySignatureHeader: 'X-Legacy-Signature' })));
  afterAll(() => h.close());

  const hook = async (call: Call) =>
    (await call('POST', '/v3/webhooks', { trigger_types: ['grant.created'], webhook_url: 'https://acadpak.com/hook' })).json.data;
  const makeDue = (id: string) =>
    h.db.query(`UPDATE deliveries SET next_attempt_at=0 WHERE webhook_id=$1 AND status='pending'`, [id]);
  const delivery = async (id: string) => (await h.db.query<any>('SELECT * FROM deliveries WHERE webhook_id=$1', [id])).rows[0];

  it('delivers a signed envelope for matching events only', async () => {
    const { call } = await h.tenant();
    const wh = await hook(call);
    h.outbound.length = 0;

    const id = await mailbox(call, 'hook@acadpak.com');
    await call('PATCH', `/v3/grants/${id}`, { name: 'x' }); // grant.updated: not subscribed
    expect(await deliverDue(h.ctx)).toBe(1);

    const post = h.outbound.filter((o) => o.method === 'POST');
    expect(post).toHaveLength(1);
    const req = post[0]!;
    const body = JSON.parse(req.body!);
    expect(body).toMatchObject({ specversion: '1.0', type: 'grant.created', source: '/weftline/grants' });
    expect(body.id).toMatch(/^evt_/);
    expect(body.time).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(body.data.object).toMatchObject({ grant_id: id, email: 'hook@acadpak.com', provider: 'weftline' });

    // The signature is the HMAC-SHA256 of the exact raw body, keyed with the webhook secret.
    expect(req.headers['X-Weftline-Signature']).toBe(hmacHex(wh.webhook_secret, req.body!));
    expect(req.headers['X-Legacy-Signature']).toBe(req.headers['X-Weftline-Signature']);
    expect(await deliverDue(h.ctx)).toBe(0);
  });

  it('retries with growing delay, marks failing, then recovers', async () => {
    const { call } = await h.tenant();
    const wh = await hook(call);
    await mailbox(call, 'retry@acadpak.com');
    const status = async () => (await call('GET', `/v3/webhooks/${wh.id}`)).json.data.status;

    h.receiver.status = 500;
    expect(await deliverDue(h.ctx)).toBe(1);
    let d = await delivery(wh.id);
    expect(d).toMatchObject({ status: 'pending', attempts: 1, last_status: 500 });
    const wait1 = d.next_attempt_at - d.updated_at;
    expect(await deliverDue(h.ctx)).toBe(0); // backoff: not due yet

    await makeDue(wh.id);
    await deliverDue(h.ctx);
    d = await delivery(wh.id);
    expect(d.attempts).toBe(2);
    expect(d.next_attempt_at - d.updated_at).toBeGreaterThan(wait1);
    expect(await status()).toBe('active');

    await makeDue(wh.id);
    await deliverDue(h.ctx);
    expect(await status()).toBe('failing');

    h.receiver.status = 200;
    await makeDue(wh.id);
    await deliverDue(h.ctx);
    expect((await delivery(wh.id)).status).toBe('delivered');
    expect(await status()).toBe('active');
  });

  it('gives up after the maximum attempts and marks the webhook failed', async () => {
    const { call } = await h.tenant();
    const wh = await hook(call);
    await mailbox(call, 'doomed@acadpak.com');
    h.receiver.status = 503;
    for (let i = 0; i < 4; i++) {
      await makeDue(wh.id);
      await deliverDue(h.ctx);
    }
    expect(await delivery(wh.id)).toMatchObject({ status: 'failed', attempts: 4 });
    expect((await call('GET', `/v3/webhooks/${wh.id}`)).json.data.status).toBe('failed');
    await mailbox(call, 'later@acadpak.com'); // a failed webhook stops receiving events
    expect((await h.db.query('SELECT 1 FROM deliveries WHERE webhook_id=$1', [wh.id])).rows).toHaveLength(1);
    h.receiver.status = 200;
  });

  it('reclaims deliveries a crashed worker left half-sent', async () => {
    const { call } = await h.tenant();
    const wh = await hook(call);
    await mailbox(call, 'stuck@acadpak.com');
    await h.db.query(`UPDATE deliveries SET status='sending', updated_at=1 WHERE webhook_id=$1`, [wh.id]);
    expect(await deliverDue(h.ctx)).toBe(1);
    expect((await delivery(wh.id)).status).toBe('delivered');
  });
});
