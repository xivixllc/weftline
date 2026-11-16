# Weftline API reference

Weftline is a self-hosted, unified API for email, calendar, contacts, scheduling, meeting notes
and agent mailboxes. It speaks the v3 wire format, so the existing MIT-licensed v3 SDKs and CLI
work against it once you point them at your Weftline base URL.

> **Status: partly implemented.** This reference is the contract the
> server implements. Every endpoint carries the release that delivers it (R1 to R5). See the
> [project README](../../README.md#roadmap) for dates.

## Base URL

| Deployment | Base URL |
| --- | --- |
| acadpak.com production (default) | `https://weftline.acadpak.com` |
| acadpak.com, mounted under the main site | `https://acadpak.com/weftline` |
| Local development | `http://localhost:3000` |

Every path below starts with `/v3`. Examples use `$WEFTLINE_URL` and `$WEFTLINE_API_KEY`:

```bash
export WEFTLINE_URL=https://weftline.acadpak.com
export WEFTLINE_API_KEY=wl_live_xxxxxxxxxxxxxxxx
curl -s "$WEFTLINE_URL/v3/grants" -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

## Authentication

| Credential | Header | Use |
| --- | --- | --- |
| Application API key | `Authorization: Bearer <api_key>` | Server-to-server calls for any grant in the application |
| Grant access token | `Authorization: Bearer <access_token>` | Calls scoped to one grant, issued by [`POST /v3/connect/token`](auth.md) |
| Service-account signature | Signed request headers | Admin endpoints; see [admin.md](admin.md#signed-requests) |

API keys are created in the Weftline console or with `weftline keys create` (see the
[project README](../../README.md#first-run)). Keys start with `wl_live_` or `wl_test_`. Never
send an API key from a browser.

## Grants and the `{grant_id}` path parameter

A grant is one connected account (a Gmail, Microsoft 365, IMAP, iCloud or Yahoo mailbox, or a
Weftline agent mailbox). Per-account routes live under `/v3/grants/{grant_id}/...`.
`{grant_id}` accepts either the grant ID or the account's email address. With a grant access
token you can also pass `me`.

## Requests

- JSON bodies use `Content-Type: application/json` and **snake_case** field names.
- Sending a message with attachments uses `multipart/form-data` (see [messages.md](messages.md#send-a-message)).
- **Vercel body limit:** on Vercel, a request or response body larger than **4.5 MB** is
  rejected with `413`. Upload larger files with an attachment upload session
  ([attachments.md](attachments.md#large-attachment-uploads)), which streams straight to blob
  storage and supports files up to 150 MB.
- Timestamps are Unix epoch **seconds** (integers). Dates without times use `YYYY-MM-DD`. One
  exception: the webhook envelope's `time` is an RFC 3339 string ([webhooks.md](webhooks.md#payload)).
- IDs are opaque strings. Don't parse them.
- Unknown request fields are rejected with `400 invalid_request_error`.

### Idempotency

`POST` endpoints that send mail or create bookings accept an `Idempotency-Key` header (any
string up to 255 characters). A repeat request with the same key and body within 24 hours
returns the first response and doesn't send again. The same key with a different body returns
`409 conflict`.

## Responses

Single object:

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "msg_8f2c...", "object": "message" }
}
```

List:

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [ { "id": "msg_8f2c..." }, { "id": "msg_91ab..." } ],
  "next_cursor": "eyJvZmZzZXQiOjUwfQ"
}
```

Delete returns `200` with no `data`, except where an endpoint's page says otherwise (deleting a
webhook returns `data.status: "success"`):

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

Every response also carries the `x-request-id` header. Include it in bug reports.

## Pagination and field selection

All list endpoints accept:

| Query parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | integer | 50 | Items per page, 1 to 200 |
| `page_token` | string | | The `next_cursor` from the previous page |
| `select` | string | all fields | Comma-separated fields to return, for example `id,subject,date` |

`next_cursor` is absent on the last page. Cursors expire after 24 hours. The grant and
credential lists also accept `offset`, for clients that page by count.

## Metadata

Grants, messages, drafts, events, calendars and bookings accept a `metadata` object of up to 50
string keys and string values (key ≤ 40 characters, value ≤ 500 characters). Filter lists with
`metadata_pair=key:value`.

## Errors

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "error": {
    "type": "invalid_request_error",
    "message": "limit must be between 1 and 200",
    "provider_error": null
  }
}
```

| HTTP | `error.type` | Meaning |
| --- | --- | --- |
| 400 | `invalid_request_error` | Malformed body, unknown field or bad parameter |
| 401 | `unauthorized` | Missing, invalid or revoked API key or token |
| 403 | `forbidden` | Key lacks access, or the grant lacks a needed provider scope |
| 404 | `not_found_error` | The object or grant doesn't exist in this application |
| 409 | `conflict` | Idempotency-key mismatch, or a booking slot already taken |
| 410 | `grant_expired` | The provider token expired or was revoked; re-authenticate the grant |
| 413 | `payload_too_large` | Body above 4.5 MB on Vercel; use an upload session |
| 422 | `provider_rejected` | The provider refused the change; details in `provider_error` |
| 429 | `rate_limit_error` | Too many requests; wait for `Retry-After` seconds |
| 502 | `provider_error` | The provider failed or timed out; safe to retry with backoff |
| 500 | `api_error` | Weftline failed; retry once, then report the `request_id` |

The OAuth token endpoints (`/v3/connect/token`, `/v3/connect/revoke`) return OAuth-style errors
instead:

```json
{ "error": "invalid_grant", "error_code": 400, "error_description": "code expired", "error_uri": "https://weftline.acadpak.com/docs/errors#invalid_grant" }
```

## Rate limits

| Scope | Default limit | Headers |
| --- | --- | --- |
| Per API key | 600 requests a minute | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| Per grant | 120 requests a minute | same |
| Send per grant | the provider's own limit; Gmail and Microsoft 365 throttle first | `Retry-After` on 429 |

Operators change the defaults with `RATE_LIMIT_PER_KEY` and `RATE_LIMIT_PER_GRANT`.

## Webhook signatures

Weftline signs every webhook body with HMAC-SHA256, using the webhook's secret, and sends the
hex digest in `X-Weftline-Signature`. Verify it against the **raw** request body before parsing
JSON. See [webhooks.md](webhooks.md#verifying-signatures). For receivers written for the legacy
v3 header names, set `WEFTLINE_LEGACY_SIGNATURE_HEADER` to the header name they expect and Weftline sends the signature under that name too.

## Using the existing v3 SDKs

```ts
// Node.js
import Nylas from 'nylas'; // the MIT-licensed v3 SDK package
const weftline = new Nylas({ apiKey: process.env.WEFTLINE_API_KEY!, apiUri: 'https://weftline.acadpak.com' });
const { data } = await weftline.messages.list({ identifier: grantId, queryParams: { limit: 10 } });
```

```python
# Python
from nylas import Client  # the MIT-licensed v3 SDK package
weftline = Client(api_key=os.environ["WEFTLINE_API_KEY"], api_uri="https://weftline.acadpak.com")
messages = weftline.messages.list(grant_id, query_params={"limit": 10})
```

```bash
# CLI
export NYLAS_API_BASE_URL=https://weftline.acadpak.com
```

The package names are those of the third-party SDKs; Weftline ships no SDK of its own.

## Endpoint index

| Area | File | Release |
| --- | --- | --- |
| Hosted sign-in, tokens, provider detection | [auth.md](auth.md) | R1 |
| Grants | [grants.md](grants.md) | R1 |
| Connectors and provider credentials | [connectors.md](connectors.md) | R1 |
| Applications and redirect URIs | [applications.md](applications.md) | R1 |
| Messages, sending, scheduled send, cleaning, smart compose | [messages.md](messages.md) | R1 (clean, smart compose R5) |
| Drafts | [drafts.md](drafts.md) | R1 |
| Threads | [threads.md](threads.md) | R1 |
| Folders and labels | [folders.md](folders.md) | R1 |
| Attachments and large uploads | [attachments.md](attachments.md) | R1 |
| Domain send (no grant) | [domain-send.md](domain-send.md) | R3 |
| Calendars, free/busy, availability | [calendars.md](calendars.md) | R2 |
| Events, RSVP, import, batch | [events.md](events.md) | R2 |
| Contacts and contact groups | [contacts.md](contacts.md) | R2 |
| Room and equipment resources | [resources.md](resources.md) | R2 |
| Scheduler: configurations, sessions, bookings, group events | [scheduler.md](scheduler.md) | R3 |
| Templates | [templates.md](templates.md) | R3 |
| Signatures | [signatures.md](signatures.md) | R3 |
| Send and tracking activity, metrics, alerts | [metrics.md](metrics.md) | R3 |
| Admin: domains, workspaces, policies, rules, lists, signed requests | [admin.md](admin.md) | R3 (domains), R4 (the rest) |
| Meeting notes (notetakers) | [notetakers.md](notetakers.md) | R4 |
| Workflows | [workflows.md](workflows.md) | R5 |
| Webhooks, event types, Pub/Sub channels | [webhooks.md](webhooks.md) | R1 (Pub/Sub R2) |
