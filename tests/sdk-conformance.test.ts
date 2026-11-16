// Compatibility check: the MIT-licensed v3 SDK, pointed at a live Weftline server over HTTP.
// If these pass, apps written against that SDK work here by changing only the base URL.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import Nylas from 'nylas';
import { harness, type Harness } from './helpers.js';

describe('official v3 SDK against Weftline', () => {
  let h: Harness;
  let sdk: any;
  let call: Awaited<ReturnType<Harness['tenant']>>['call'];
  let grantId: string;
  let peerId: string;

  beforeAll(async () => {
    h = await harness();
    const t = await h.tenant('sdk');
    call = t.call;
    const base = await h.app.listen({ port: 0, host: '127.0.0.1' });
    sdk = new (Nylas as any)({ apiKey: t.key, apiUri: base });
  });
  afterAll(() => h.close());

  it('creates grants through custom auth and lists them', async () => {
    const g = await sdk.auth.customAuthentication({
      requestBody: { provider: 'weftline', settings: { email: 'sdk.user@acadpak.com' } },
    });
    grantId = g.data.id;
    expect(g.data.email).toBe('sdk.user@acadpak.com');
    expect(g.requestId).toMatch(/^req_/);

    const p = await sdk.auth.customAuthentication({
      requestBody: { provider: 'weftline', settings: { email: 'sdk.peer@acadpak.com' } },
    });
    peerId = p.data.id;

    const list = await sdk.grants.list({ queryParams: { limit: 1 } });
    expect(list.data).toHaveLength(1);
    expect(list.nextCursor).toBeTruthy();
    const found = await sdk.grants.find({ grantId });
    expect(found.data.id).toBe(grantId);
  });

  it('sends and reads mail, with SDK-side camelCase mapped to the wire format', async () => {
    const sent = await sdk.messages.send({
      identifier: grantId,
      requestBody: {
        to: [{ name: 'Peer', email: 'sdk.peer@acadpak.com' }],
        subject: 'From the SDK',
        body: '<p>hello</p>',
        replyTo: [{ email: 'noreply@acadpak.com' }],
      },
    });
    expect(sent.data.subject).toBe('From the SDK');
    expect(sent.data.replyTo).toEqual([{ email: 'noreply@acadpak.com' }]);
    expect(sent.data.threadId).toMatch(/^thr_/);

    const inbox = await sdk.messages.list({ identifier: peerId, queryParams: { unread: true, limit: 5 } });
    expect(inbox.data).toHaveLength(1);
    const msg = await sdk.messages.find({ identifier: peerId, messageId: inbox.data[0].id });
    expect(msg.data.from[0].email).toBe('sdk.user@acadpak.com');

    const upd = await sdk.messages.update({ identifier: peerId, messageId: msg.data.id, requestBody: { unread: false, starred: true } });
    expect(upd.data).toMatchObject({ unread: false, starred: true });

    const threads = await sdk.threads.list({ identifier: peerId });
    expect(threads.data).toHaveLength(1);
    expect(threads.data[0].messageIds).toEqual([msg.data.id]);
    expect((await sdk.threads.find({ identifier: peerId, threadId: threads.data[0].id })).data.id).toBe(threads.data[0].id);
  });

  it('manages folders', async () => {
    const f = await sdk.folders.create({ identifier: grantId, requestBody: { name: 'From SDK', backgroundColor: '#0099EE' } });
    expect(f.data).toMatchObject({ name: 'From SDK', backgroundColor: '#0099EE', systemFolder: false });
    const all = await sdk.folders.list({ identifier: grantId });
    expect(all.data.map((x: any) => x.name)).toEqual(expect.arrayContaining(['Inbox', 'Sent', 'From SDK']));
    await sdk.folders.update({ identifier: grantId, folderId: f.data.id, requestBody: { name: 'Renamed' } });
    await sdk.folders.destroy({ identifier: grantId, folderId: f.data.id });
  });

  it('manages webhooks and surfaces API errors as typed SDK errors', async () => {
    const wh = await sdk.webhooks.create({
      requestBody: { triggerTypes: ['message.created'], webhookUrl: 'https://acadpak.com/hook', description: 'sdk' },
    });
    expect(wh.data.webhookSecret).toMatch(/^[0-9a-f]{32}$/);
    expect(wh.data.triggerTypes).toEqual(['message.created']);
    const rotated = await sdk.webhooks.rotateSecret({ webhookId: wh.data.id });
    expect(rotated.data.webhookSecret).not.toBe(wh.data.webhookSecret);
    await sdk.webhooks.destroy({ webhookId: wh.data.id });

    await expect(sdk.grants.find({ grantId: 'grt_missing' })).rejects.toMatchObject({ statusCode: 404, type: 'not_found_error' });
    await expect(
      sdk.webhooks.create({ requestBody: { triggerTypes: ['nope'], webhookUrl: 'https://acadpak.com/hook' } }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('deletes a grant', async () => {
    await sdk.grants.destroy({ grantId: peerId });
    expect((await call('GET', `/v3/grants/${peerId}`)).status).toBe(404);
  });
});
