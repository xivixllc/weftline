import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { harness, mailbox, type Call, type Harness } from './helpers.js';

describe('mail between local mailboxes', () => {
  let h: Harness;
  let call: Call;
  let alice: string;
  let bob: string;
  beforeAll(async () => {
    h = await harness();
    ({ call } = await h.tenant());
    alice = await mailbox(call, 'alice@acadpak.com', 'Alice');
    bob = await mailbox(call, 'bob@acadpak.com', 'Bob');
  });
  afterAll(() => h.close());

  const send = (from: string, body: object, headers?: Record<string, string>) =>
    call('POST', `/v3/grants/${from}/messages/send`, body, headers);

  it('sends: a Sent copy for the sender, an unread Inbox copy for the recipient', async () => {
    const r = await send(alice, {
      to: [{ email: 'bob@acadpak.com', name: 'Bob' }],
      bcc: [{ email: 'alice@acadpak.com' }],
      subject: 'Interview on Monday',
      body: '<p>See you at <b>10:00</b>.</p>',
      metadata: { campaign: 'admissions' },
    });
    expect(r.status).toBe(200);
    const m = r.json.data;
    expect(m).toMatchObject({ object: 'message', grant_id: alice, subject: 'Interview on Monday', unread: false, snippet: 'See you at 10:00 .' });
    expect(m.from).toEqual([{ email: 'alice@acadpak.com', name: 'Alice' }]);
    expect(m.metadata).toEqual({ campaign: 'admissions' });

    const sentId = (await call('GET', `/v3/grants/${alice}/folders`)).json.data.find((f: any) => f.name === 'Sent').id;
    expect(m.folders).toEqual([sentId]);

    const inbox = (await call('GET', `/v3/grants/${bob}/messages?unread=true`)).json.data;
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ subject: 'Interview on Monday', unread: true, grant_id: bob });
    expect(inbox[0].bcc).toEqual([]); // bcc is never shown to recipients
    expect(inbox[0].metadata).toEqual({}); // sender metadata stays with the sender

    const folders = (await call('GET', `/v3/grants/${bob}/folders`)).json.data;
    expect(folders.find((f: any) => f.name === 'Inbox')).toMatchObject({ total_count: 1, unread_count: 1 });
  });

  it('rejects delivery outside the application, attachments, scheduling and other unsupported options', async () => {
    const base = { to: [{ email: 'bob@acadpak.com' }], subject: 's', body: 'b' };
    const ext = await send(alice, { ...base, to: [{ email: 'bob@acadpak.com' }, { email: 'stranger@gmail.com' }] });
    expect(ext.status).toBe(422);
    expect(ext.json.error.message).toContain('stranger@gmail.com');
    for (const extra of [{ attachments: [{}] }, { send_at: 4102444800 }, { tracking_options: { opens: true } }, { signature_id: 'sig_1' }, { from: [{ email: 'boss@acadpak.com' }] }]) {
      const r = await send(alice, { ...base, ...extra });
      expect(r.status, JSON.stringify(extra)).toBe(422);
      expect(r.json.error.type).toBe('provider_rejected');
    }
    expect((await send(alice, { subject: 'no recipients' })).status).toBe(400);
    expect((await send(alice, { ...base, nonsense: 1 })).status).toBe(400);
    // Nothing partial was delivered by the failed attempts.
    const total = await h.db.query<{ n: number }>('SELECT count(*)::int AS n FROM messages WHERE subject IN ($1,$2)', ['s', 'no recipients']);
    expect(total.rows[0]!.n).toBe(0);
  });

  it('keeps replies in the same thread on both sides', async () => {
    const first = await send(alice, { to: [{ email: 'bob@acadpak.com' }], subject: 'Question', body: 'Can you attend?' });
    const bobCopy = (await call('GET', `/v3/grants/${bob}/messages?subject=Question`)).json.data[0];
    const reply = await send(bob, { to: [{ email: 'alice@acadpak.com' }], subject: 'Re: Question', body: 'Yes', reply_to_message_id: bobCopy.id });
    expect(reply.status).toBe(200);

    const aliceThreads = (await call('GET', `/v3/grants/${alice}/threads?subject=Question`)).json.data;
    expect(aliceThreads).toHaveLength(1);
    expect(aliceThreads[0]).toMatchObject({ object: 'thread', id: first.json.data.thread_id, unread: true });
    expect(aliceThreads[0].message_ids).toHaveLength(2);
    expect(aliceThreads[0].latest_message_received_date).toBeTypeOf('number');
    expect(aliceThreads[0].participants.map((p: any) => p.email).sort()).toEqual(['alice@acadpak.com', 'bob@acadpak.com']);

    const one = await call('GET', `/v3/grants/${alice}/threads/${first.json.data.thread_id}`);
    expect(one.json.data.latest_draft_or_message.object).toBe('message');
    expect((await call('GET', `/v3/grants/${alice}/threads/thr_missing`)).status).toBe(404);
    expect((await send(bob, { to: [{ email: 'alice@acadpak.com' }], reply_to_message_id: 'msg_missing' })).status).toBe(404);
  });

  it('filters and searches messages, pages through them, and selects fields', async () => {
    for (const [subject, body] of [['Fee schedule', 'tuition due in January'], ['Hostel form', 'return the signed hostel form']] as const) {
      await send(alice, { to: [{ email: 'bob@acadpak.com' }], subject, body });
    }
    const q = (s: string) => call('GET', `/v3/grants/${bob}/messages?${s}`);
    expect((await q('search_query_native=tuition')).json.data.map((m: any) => m.subject)).toEqual(['Fee schedule']);
    expect((await q('search_query_native=hostel+form')).json.data).toHaveLength(1);
    expect((await q('from=ALICE@acadpak.com&subject=Hostel%20form')).json.data).toHaveLength(1);
    expect((await q('from=alice@acadpak.com&from=nobody@acadpak.com')).json.data.length).toBeGreaterThan(2);
    expect((await q('any_email=nobody@acadpak.com')).json.data).toHaveLength(0);
    expect((await q('has_attachment=true')).json.data).toHaveLength(0);
    expect((await q('unread=maybe')).status).toBe(400);
    expect((await q('metadata_pair=nocolon')).status).toBe(400);
    expect((await q('received_after=4102444800')).json.data).toHaveLength(0);

    const p1 = await q('limit=2');
    expect(p1.json.data).toHaveLength(2);
    const p2 = await q(`limit=2&page_token=${p1.json.next_cursor}`);
    const ids = new Set([...p1.json.data, ...p2.json.data].map((m: any) => m.id));
    expect(ids.size).toBe(p1.json.data.length + p2.json.data.length);

    const sel = (await q('select=id,subject&limit=1')).json.data[0];
    expect(Object.keys(sel).sort()).toEqual(['id', 'subject']);
    const withHeaders = (await q('fields=include_headers&limit=1')).json.data[0];
    expect(withHeaders.headers.some((x: any) => x.name === 'X-Weftline-Conversation')).toBe(true);
  });

  it('renders plain-text bodies safely as HTML', async () => {
    const r = await send(alice, { to: [{ email: 'bob@acadpak.com' }], subject: 'text', body: '<script>x</script>\nline two', is_plaintext: true });
    expect(r.json.data.body).toBe('<div>&lt;script&gt;x&lt;/script&gt;<br>line two</div>');
  });

  it('updates and deletes messages, and emits events', async () => {
    await send(alice, { to: [{ email: 'bob@acadpak.com' }], subject: 'To edit', body: 'x' });
    const m = (await call('GET', `/v3/grants/${bob}/messages?subject=To%20edit`)).json.data[0];
    const trash = (await call('GET', `/v3/grants/${bob}/folders`)).json.data.find((f: any) => f.name === 'Trash').id;

    const u = await call('PUT', `/v3/grants/${bob}/messages/${m.id}`, { unread: false, starred: true, folders: [trash], metadata: { k: 'v' } });
    expect(u.json.data).toMatchObject({ unread: false, starred: true, folders: [trash], metadata: { k: 'v' } });
    expect((await call('PUT', `/v3/grants/${bob}/messages/${m.id}`, { folders: ['fld_nope'] })).status).toBe(400);
    expect((await call('GET', `/v3/grants/${bob}/messages?metadata_pair=k:v`)).json.data).toHaveLength(1);

    const types = (await h.db.query<{ type: string }>('SELECT type FROM events')).rows.map((r) => r.type);
    expect(types).toEqual(expect.arrayContaining(['message.created', 'message.updated', 'message.send_success']));

    expect((await call('DELETE', `/v3/grants/${bob}/messages/${m.id}`)).status).toBe(200);
    expect((await call('GET', `/v3/grants/${bob}/messages/${m.id}`)).status).toBe(404);
  });

  it('replays an idempotent send instead of sending twice, and rejects a changed body', async () => {
    const body = { to: [{ email: 'bob@acadpak.com' }], subject: 'Once only', body: 'x' };
    const key = { 'Idempotency-Key': 'send-1' };
    const a = await send(alice, body, key);
    const b = await send(alice, body, key);
    expect(b.json.data.id).toBe(a.json.data.id);
    expect((await call('GET', `/v3/grants/${bob}/messages?subject=Once%20only`)).json.data).toHaveLength(1);
    const c = await send(alice, { ...body, subject: 'Different' }, key);
    expect(c.status).toBe(409);
    expect(c.json.error.type).toBe('conflict');
  });

  it('manages user folders: create, rename, nest, delete frees messages, system folders protected', async () => {
    const mk = (b: object) => call('POST', `/v3/grants/${alice}/folders`, b);
    const f = (await mk({ name: 'Applicants', background_color: '#0099EE' })).json.data;
    expect(f).toMatchObject({ object: 'folder', name: 'Applicants', system_folder: false, background_color: '#0099EE', total_count: 0 });
    expect((await mk({ name: 'applicants' })).status).toBe(409);
    expect((await mk({ name: 'x', background_color: 'blue' })).status).toBe(400);
    const child = (await mk({ name: 'Round 2', parent_id: f.id })).json.data;
    expect(child.parent_id).toBe(f.id);

    const renamed = await call('PUT', `/v3/grants/${alice}/folders/${f.id}`, { name: 'Applications' });
    expect(renamed.json.data.name).toBe('Applications');

    const msg = (await call('GET', `/v3/grants/${alice}/messages?limit=1`)).json.data[0];
    await call('PUT', `/v3/grants/${alice}/messages/${msg.id}`, { folders: [f.id] });
    expect((await call('GET', `/v3/grants/${alice}/folders/${f.id}`)).json.data.total_count).toBe(1);

    expect((await call('DELETE', `/v3/grants/${alice}/folders/${f.id}`)).status).toBe(200);
    expect((await call('GET', `/v3/grants/${alice}/messages/${msg.id}`)).json.data.folders).toEqual([]);
    expect((await call('GET', `/v3/grants/${alice}/folders/${child.id}`)).json.data.parent_id).toBeUndefined();

    const inbox = (await call('GET', `/v3/grants/${alice}/folders`)).json.data.find((x: any) => x.name === 'Inbox');
    expect((await call('DELETE', `/v3/grants/${alice}/folders/${inbox.id}`)).status).toBe(422);
    expect((await call('PUT', `/v3/grants/${alice}/folders/${inbox.id}`, { name: 'Renamed' })).status).toBe(422);
    expect((await call('GET', `/v3/grants/${alice}/folders?parent_id=${f.id}`)).json.data).toHaveLength(0);
  });

  it('is isolated per tenant, and refuses mail routes on grants without a local mailbox', async () => {
    const other = await h.tenant('other');
    const mine = await mailbox(other.call, 'alice@acadpak.com');
    expect((await other.call('GET', `/v3/grants/${mine}/messages`)).json.data).toHaveLength(0); // not alice's mail
    const a = (await call('GET', `/v3/grants/${alice}/messages?limit=1`)).json.data[0];
    expect((await other.call('GET', `/v3/grants/${mine}/messages/${a.id}`)).status).toBe(404);

    const t = await h.tenant('nolocal');
    const id = 'grt_foreign';
    await h.db.query(
      `INSERT INTO grants (id, application_id, provider, email, created_at, updated_at) VALUES ($1,$2,'google','g@x.co',1,1)`,
      [id, t.appId],
    );
    const r = await t.call('GET', `/v3/grants/${id}/messages`);
    expect(r.status).toBe(422);
    expect(r.json.error.message).toContain('google connector is not implemented');
  });
});
