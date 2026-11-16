# Drafts

Create, edit, list, delete and send draft messages in a grant's mailbox. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/drafts` | List drafts | R1 |
| GET | `/v3/grants/{grant_id}/drafts/{draft_id}` | Get a draft | R1 |
| POST | `/v3/grants/{grant_id}/drafts` | Create a draft | R1 |
| PUT | `/v3/grants/{grant_id}/drafts/{draft_id}` | Update a draft | R1 |
| DELETE | `/v3/grants/{grant_id}/drafts/{draft_id}` | Delete a draft | R1 |
| POST | `/v3/grants/{grant_id}/drafts/{draft_id}` | Send a draft | R1 |

## List drafts

`GET /v3/grants/{grant_id}/drafts` · Release R1

Returns the grant's drafts, filtered by any of the query parameters below. Parameters typed `array of string` are repeated (`to=a@x.com&to=b@x.com`).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `subject` | string | Exact subject match |
| `any_email` | string | Comma-separated addresses; matches drafts from or to any of them |
| `to` | array of string | Drafts addressed to these addresses |
| `from` | array of string | Drafts from these addresses |
| `cc` | array of string | Drafts that cc these addresses |
| `bcc` | array of string | Drafts that bcc these addresses |
| `in` | array of string | Drafts in these folder or label IDs |
| `unread` | boolean | Filter by unread state |
| `starred` | boolean | Filter by starred state |
| `thread_id` | string | Drafts in this thread |
| `has_attachment` | boolean | Filter by whether the draft has attachments |
| `metadata_pair` | string | `key:value` metadata filter; see [Metadata](README.md#metadata) |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Draft](#draft-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/drafts?limit=5&to=student@acadpak.com" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "drf_4b18c0e2",
      "object": "draft",
      "grant_id": "grt_5a1e9b77",
      "thread_id": "thr_3c90aa12",
      "subject": "Re: Your application",
      "to": [{ "name": "Student", "email": "student@acadpak.com" }],
      "date": 1731657600,
      "body": "<p>Draft reply</p>",
      "folders": ["DRAFT"]
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjV9"
}
```

## Get a draft

`GET /v3/grants/{grant_id}/drafts/{draft_id}` · Release R1

Returns one draft.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `draft_id` | string | Draft ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `select` | string | Comma-separated fields to return |

**Response** `200`: `data` is a [Draft](#draft-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/drafts/drf_4b18c0e2" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "drf_4b18c0e2", "object": "draft", "grant_id": "grt_5a1e9b77", "subject": "Re: Your application" }
}
```

## Create a draft

`POST /v3/grants/{grant_id}/drafts` · Release R1 (tracking options R3)

Saves a new draft in the account. Send a JSON body, or `multipart/form-data` when attaching files as raw bytes (see [Multipart drafts](#multipart-drafts)).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | array of [Email name](messages.md#email-name-object) | No | Recipients |
| `from` | array of [Email name](messages.md#email-name-object) | No | Sender; defaults to the grant's address |
| `cc` | array of [Email name](messages.md#email-name-object) | No | Cc recipients |
| `bcc` | array of [Email name](messages.md#email-name-object) | No | Bcc recipients |
| `reply_to` | array of [Email name](messages.md#email-name-object) | No | Overrides the `Reply-To` header |
| `subject` | string | No | Subject line |
| `body` | string | No | HTML body, or plain text when `is_plaintext` is `true` |
| `is_plaintext` | boolean | No | `true` keeps the body as text/plain only, with no HTML part. Default `false` |
| `attachments` | array of [Send attachment](messages.md#send-attachment-object) or [Attachment reference](messages.md#attachment-reference-object) | No | Files to attach |
| `starred` | boolean | No | Star the draft |
| `send_at` | integer | No | Unix timestamp to send at when the draft is sent |
| `reply_to_message_id` | string | No | ID of the message this draft replies to |
| `tracking_options` | [Tracking options](messages.md#tracking-options-object) | No | Open, link and reply tracking. Release R3 |
| `custom_headers` | array of [Custom header](messages.md#custom-header-object) | No | Extra MIME headers to add |
| `metadata` | object | No | String key/value pairs; see [Metadata](README.md#metadata) |

**Response** `200`: `data` is the new [Draft](#draft-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/drafts" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{ "name": "Student", "email": "student@acadpak.com" }],
    "subject": "Re: Your application",
    "body": "<p>Thanks for your question.</p>",
    "reply_to_message_id": "msg_8f2c41d0"
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "drf_4b18c0e2",
    "object": "draft",
    "grant_id": "grt_5a1e9b77",
    "thread_id": "thr_3c90aa12",
    "subject": "Re: Your application",
    "to": [{ "name": "Student", "email": "student@acadpak.com" }],
    "reply_to_message_id": "msg_8f2c41d0"
  }
}
```

### Multipart drafts

Create and update both accept `multipart/form-data`, in the same layout as [sending a message](messages.md#attachments-and-multipart-requests): a `message` part with the JSON body, plus one part per file named after its `content_id` or `file0`, `file1`, …. On Vercel the whole body must stay under **4.5 MB**; for larger files use an [attachment upload session](attachments.md#large-attachment-uploads) and reference the returned ID.

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/drafts" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -F 'message={"to":[{"email":"student@acadpak.com"}],"subject":"Timetable"};type=application/json' \
  -F "file0=@timetable.pdf;type=application/pdf"
```

## Update a draft

`PUT /v3/grants/{grant_id}/drafts/{draft_id}` · Release R1 (tracking options R3)

Changes a draft. Send only the fields you want to change; JSON or [multipart](#multipart-drafts).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `draft_id` | string | Draft ID |

**Request body** (JSON)

Any field from [Create a draft](#create-a-draft) except `is_plaintext`, all optional, plus:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `unread` | boolean | No | Mark the draft unread or read |

**Response** `200`: `data` is the updated [Draft](#draft-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/drafts/drf_4b18c0e2" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "body": "<p>Thanks for your question. The deadline is Friday.</p>" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "drf_4b18c0e2", "object": "draft", "body": "<p>Thanks for your question. The deadline is Friday.</p>" }
}
```

## Delete a draft

`DELETE /v3/grants/{grant_id}/drafts/{draft_id}` · Release R1

Deletes a draft.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `draft_id` | string | Draft ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/drafts/drf_4b18c0e2" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Send a draft

`POST /v3/grants/{grant_id}/drafts/{draft_id}` · Release R1

Sends an existing draft as it is saved. The request body is empty (`{}`). Accepts an `Idempotency-Key` header; see [Idempotency](README.md#idempotency).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `draft_id` | string | Draft ID |

**Response** `200`: `data` is the sent [Message](messages.md#message-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/drafts/drf_4b18c0e2" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: reply-drf_4b18c0e2" \
  -d '{}'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "msg_c0e2a9f1", "object": "message", "grant_id": "grt_5a1e9b77", "thread_id": "thr_3c90aa12", "subject": "Re: Your application" }
}
```

## Objects

### Draft object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Draft ID |
| `object` | string | Always `draft` |
| `grant_id` | string | Grant the draft belongs to |
| `thread_id` | string | Thread the draft belongs to; empty for a new conversation |
| `subject` | string | Subject line |
| `from` | array of [Email name](messages.md#email-name-object) | Senders |
| `to` | array of [Email name](messages.md#email-name-object) | Recipients |
| `cc` | array of [Email name](messages.md#email-name-object) | Cc recipients |
| `bcc` | array of [Email name](messages.md#email-name-object) | Bcc recipients |
| `reply_to` | array of [Email name](messages.md#email-name-object) | `Reply-To` addresses |
| `date` | integer | Unix timestamp of the draft |
| `created_at` | integer | Unix timestamp when the draft was created |
| `unread` | boolean | Whether the draft is unread |
| `starred` | boolean | Whether the draft is starred |
| `snippet` | string | First 100 characters of the body, with HTML removed |
| `body` | string | Full HTML body |
| `attachments` | array of [Attachment](attachments.md#attachment-object) | Files on the draft |
| `folders` | array of string | Folder or label IDs the draft is in |
| `send_at` | integer | Unix timestamp to send at |
| `reply_to_message_id` | string | Message this draft replies to |
| `tracking_options` | [Tracking options](messages.md#tracking-options-object) | Tracking settings. Release R3 |
| `custom_headers` | array of [Custom header](messages.md#custom-header-object) | Extra MIME headers |
| `is_plaintext` | boolean | Whether the body is plain text only |
| `metadata` | object | String key/value pairs |
