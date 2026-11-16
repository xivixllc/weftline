# Messages

Read, change, delete, send and schedule email messages in a grant's mailbox. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/messages` | List messages | R1 |
| GET | `/v3/grants/{grant_id}/messages/{message_id}` | Get a message | R1 |
| PUT | `/v3/grants/{grant_id}/messages/{message_id}` | Update a message | R1 |
| DELETE | `/v3/grants/{grant_id}/messages/{message_id}` | Delete a message | R1 |
| POST | `/v3/grants/{grant_id}/messages/send` | Send a message | R1 (tracking options R3) |
| GET | `/v3/grants/{grant_id}/messages/schedules` | List scheduled messages | R1 |
| GET | `/v3/grants/{grant_id}/messages/schedules/{schedule_id}` | Get a scheduled message | R1 |
| DELETE | `/v3/grants/{grant_id}/messages/schedules/{schedule_id}` | Stop a scheduled message | R1 |
| PUT | `/v3/grants/{grant_id}/messages/clean` | Clean messages | R5 |
| POST | `/v3/grants/{grant_id}/messages/smart-compose` | Compose a new message with AI | R5 |
| POST | `/v3/grants/{grant_id}/messages/{message_id}/smart-compose` | Compose a reply with AI | R5 |

## List messages

`GET /v3/grants/{grant_id}/messages` · Release R1

Returns the grant's messages, filtered by any of the query parameters below. Parameters typed `array of string` are repeated (`to=a@x.com&to=b@x.com`).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `subject` | string | Exact subject match |
| `any_email` | string | Comma-separated addresses; matches messages sent from or to any of them |
| `to` | array of string | Messages addressed to these addresses |
| `from` | array of string | Messages sent from these addresses |
| `cc` | array of string | Messages that cc these addresses |
| `bcc` | array of string | Messages that bcc these addresses |
| `in` | array of string | Messages in these folder or label IDs |
| `unread` | boolean | Filter by unread state |
| `starred` | boolean | Filter by starred state |
| `thread_id` | string | Messages in this thread |
| `received_before` | integer | Received before this Unix timestamp |
| `received_after` | integer | Received after this Unix timestamp |
| `has_attachment` | boolean | Filter by whether the message has attachments |
| `fields` | string | Extra data to include; see [Message fields](#message-fields) |
| `search_query_native` | string | Provider-native search string, passed through as-is (Gmail and Microsoft 365) |
| `metadata_pair` | string | `key:value` metadata filter; see [Metadata](README.md#metadata) |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Message](#message-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages?limit=5&unread=true&from=admissions@acadpak.com" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "msg_8f2c41d0",
      "object": "message",
      "grant_id": "grt_5a1e9b77",
      "thread_id": "thr_3c90aa12",
      "subject": "Your application",
      "from": [{ "name": "Admissions", "email": "admissions@acadpak.com" }],
      "to": [{ "name": "Student", "email": "student@acadpak.com" }],
      "date": 1731657600,
      "unread": true,
      "starred": false,
      "snippet": "Thanks for applying. Next steps are below.",
      "folders": ["INBOX"],
      "attachments": []
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjV9"
}
```

### Message fields

The `fields` query parameter (on list, get and send) adds data that isn't returned by default.

| Value | Effect |
| --- | --- |
| `standard` | Default message payload |
| `include_basic_headers` | Adds `headers` with a reduced set of common headers |
| `include_headers` | Adds `headers` with every header on the message |
| `include_tracking_options` | Adds `tracking_options` (Release R3) |
| `raw_mime` | Returns only `grant_id`, `object`, `id` and `raw_mime` |

## Get a message

`GET /v3/grants/{grant_id}/messages/{message_id}` · Release R1

Returns one message.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `message_id` | string | Message ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `fields` | string | See [Message fields](#message-fields) |
| `select` | string | Comma-separated fields to return |

**Response** `200`: `data` is a [Message](#message-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/msg_8f2c41d0?fields=include_headers" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "msg_8f2c41d0",
    "object": "message",
    "grant_id": "grt_5a1e9b77",
    "subject": "Your application",
    "from": [{ "name": "Admissions", "email": "admissions@acadpak.com" }],
    "to": [{ "email": "student@acadpak.com" }],
    "body": "<p>Thanks for applying.</p>",
    "headers": [{ "name": "Message-ID", "value": "<abc123@acadpak.com>" }]
  }
}
```

## Update a message

`PUT /v3/grants/{grant_id}/messages/{message_id}` · Release R1

Marks a message read or unread, starred or unstarred, moves it between folders or labels, or replaces its metadata. Send only the fields you want to change.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `message_id` | string | Message ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `unread` | boolean | No | `true` marks the message unread, `false` read |
| `starred` | boolean | No | Star or unstar the message |
| `folders` | array of string | No | Folder or label IDs the message should be in; replaces the current set |
| `metadata` | object | No | String key/value pairs; see [Metadata](README.md#metadata) |

**Response** `200`: `data` is the updated [Message](#message-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/msg_8f2c41d0" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "unread": false, "starred": true, "metadata": { "stage": "reviewed" } }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "msg_8f2c41d0", "object": "message", "unread": false, "starred": true, "metadata": { "stage": "reviewed" } }
}
```

## Delete a message

`DELETE /v3/grants/{grant_id}/messages/{message_id}` · Release R1

Deletes a message from the mailbox.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `message_id` | string | Message ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/msg_8f2c41d0" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Send a message

`POST /v3/grants/{grant_id}/messages/send` · Release R1 (tracking options R3)

Sends a message from the grant's account right away, or at a later time if `send_at` is set. The body is JSON, or `multipart/form-data` when you attach files as raw bytes. A raw MIME variant is also available.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `fields` | string | Extra data on the returned message; see [Message fields](#message-fields) |
| `type` | string | `mime` to send a raw MIME message; see [Raw MIME](#raw-mime) |

**Headers**

| Name | Description |
| --- | --- |
| `Idempotency-Key` | Optional. Prevents a retried request from sending twice; see [Idempotency](README.md#idempotency) |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `to` | array of [Email name](#email-name-object) | Yes | Recipients |
| `from` | array of [Email name](#email-name-object) | No | Sender; defaults to the grant's address. Must be an address the account may send as |
| `cc` | array of [Email name](#email-name-object) | No | Cc recipients |
| `bcc` | array of [Email name](#email-name-object) | No | Bcc recipients |
| `reply_to` | array of [Email name](#email-name-object) | No | Overrides the `Reply-To` header |
| `subject` | string | No | Subject line |
| `body` | string | No | HTML body, or plain text when `is_plaintext` is `true` |
| `is_plaintext` | boolean | No | `true` sends `body` as text/plain only, with no HTML part. Default `false` |
| `attachments` | array of [Send attachment](#send-attachment-object) or [Attachment reference](#attachment-reference-object) | No | Files to attach |
| `starred` | boolean | No | Star the sent copy |
| `send_at` | integer | No | Unix timestamp to send at; see [Scheduled sending](#scheduled-sending) |
| `reply_to_message_id` | string | No | ID of the message being answered; see [Replying](#replying) |
| `tracking_options` | [Tracking options](#tracking-options-object) | No | Open, link and reply tracking. Release R3 |
| `custom_headers` | array of [Custom header](#custom-header-object) | No | Extra MIME headers to add |
| `metadata` | object | No | String key/value pairs stored on the sent message; see [Metadata](README.md#metadata) |
| `use_draft` | boolean | No | Send through a provider draft, which helps with large attachments |
| `signature_id` | string | No | Signature to append. Release R3; see [signatures.md](signatures.md) |

**Response** `200`: `data` is the sent [Message](#message-object). A scheduled send also returns `schedule_id` and `send_at`.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/send" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: offer-letter-2026-0412" \
  -d '{
    "to": [{ "name": "Student", "email": "student@acadpak.com" }],
    "subject": "Your offer letter",
    "body": "<p>Congratulations! Your offer is attached.</p>",
    "attachments": [{
      "filename": "offer.pdf",
      "content_type": "application/pdf",
      "content": "JVBERi0xLjcKJ...",
      "size": 48213
    }]
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "msg_a71f0c55",
    "object": "message",
    "grant_id": "grt_5a1e9b77",
    "thread_id": "thr_77d01e3b",
    "subject": "Your offer letter",
    "from": [{ "email": "admissions@acadpak.com" }],
    "to": [{ "name": "Student", "email": "student@acadpak.com" }],
    "date": 1731657600,
    "attachments": [{ "id": "att_19c2", "filename": "offer.pdf", "content_type": "application/pdf", "size": 48213 }]
  }
}
```

### Attachments and multipart requests

Attach small files inline in JSON by putting base64 in `content`. For bigger files, send `multipart/form-data` instead, which avoids the base64 overhead:

- A part named `message` holds the JSON request body above (`Content-Type: application/json`). Leave file bytes out of its `attachments` array; [attachment references](#attachment-reference-object) may stay in it.
- Each file is its own part. Name the part after the attachment's `content_id`, or `file0`, `file1`, … in order. The part's filename and content type become the attachment's `filename` and `content_type`.

The v3 SDKs switch to multipart on their own once attachments total about 3 MB.

**Vercel limit.** On Vercel the whole request body, JSON or multipart, must stay under **4.5 MB** or Weftline returns `413 payload_too_large`. For anything larger, upload the file with an [attachment upload session](attachments.md#large-attachment-uploads) (up to 150 MB) and put the returned ID in `attachments` as `{ "id": "<attachment_id>" }`.

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/send" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -F 'message={"to":[{"email":"student@acadpak.com"}],"subject":"Forms","body":"<p>Two forms attached.</p>"};type=application/json' \
  -F "file0=@enrolment.pdf;type=application/pdf" \
  -F "file1=@consent.pdf;type=application/pdf"
```

### Raw MIME

`POST /v3/grants/{grant_id}/messages/send?type=mime` sends a complete RFC 822 message exactly as you built it, for headers the JSON body can't express. Send `multipart/form-data` with one part named `mime` holding the message (content type `message/rfc822`). The 4.5 MB Vercel limit applies.

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/send?type=mime" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -F "mime=@message.eml;type=message/rfc822"
```

### Scheduled sending

Set `send_at` to a future Unix timestamp to queue the message. The response carries a `schedule_id`; manage the queue with [List scheduled messages](#list-scheduled-messages) and [Stop a scheduled message](#stop-a-scheduled-message).

### Tracking

Release R3. `tracking_options` turns on open tracking, link-click tracking and reply detection for the message, with an optional `label` and a custom tracking hostname in `domain_name`. Tracking results arrive as webhooks and in [metrics.md](metrics.md).

### Replying

Set `reply_to_message_id` to the ID of a message in the same grant to send the new message as a reply to it, in the same thread.

### Custom headers

`custom_headers` adds headers to the outgoing MIME, for example `{ "name": "X-Campaign", "value": "spring-intake" }`. For full control over every header, use [Raw MIME](#raw-mime).

## List scheduled messages

`GET /v3/grants/{grant_id}/messages/schedules` · Release R1

Returns the grant's scheduled sends, including ones that already finished.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Response** `200`: `data` is an array of [Scheduled message](#scheduled-message-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/schedules" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    { "schedule_id": "sch_8cd56334", "status": { "code": "pending", "description": "waiting for send time" } },
    { "schedule_id": "sch_rb856334", "status": { "code": "success", "description": "sent" }, "close_time": 1731657600 }
  ]
}
```

## Get a scheduled message

`GET /v3/grants/{grant_id}/messages/schedules/{schedule_id}` · Release R1

Returns the status of one scheduled send.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `schedule_id` | string | The `schedule_id` returned by the send |

**Response** `200`: `data` is a [Scheduled message](#scheduled-message-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/schedules/sch_8cd56334" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "schedule_id": "sch_8cd56334", "status": { "code": "pending", "description": "waiting for send time" } }
}
```

## Stop a scheduled message

`DELETE /v3/grants/{grant_id}/messages/schedules/{schedule_id}` · Release R1

Cancels a scheduled send that hasn't gone out yet.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `schedule_id` | string | The `schedule_id` returned by the send |

**Response** `200`: `data` is an object with one field, `message` (string), describing the result.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/schedules/sch_8cd56334" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N", "data": { "message": "scheduled send cancelled" } }
```

## Clean messages

`PUT /v3/grants/{grant_id}/messages/clean` · Release R5

Returns a pared-down copy of each message body, with the markup you choose removed, so the text is easier to process, for example by a language model. The stored messages aren't changed.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `message_id` | array of string | Yes | IDs of the messages to clean |
| `ignore_links` | boolean | No | Remove `<a>` tags but keep their text |
| `ignore_images` | boolean | No | Remove images |
| `images_as_markdown` | boolean | No | Turn images into Markdown image syntax |
| `ignore_tables` | boolean | No | Remove table tags but keep the row contents |
| `remove_conclusion_phrases` | boolean | No | Remove sign-offs such as "Best" or "Regards" |
| `html_as_markdown` | boolean | No | Return the cleaned body as Markdown. Can't be `true` while `images_as_markdown` is `false` |

**Response** `200`: `data` is an array of [Message](#message-object), each with an extra `conversation` (string) field holding the cleaned body.

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/clean" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "message_id": ["msg_8f2c41d0"], "ignore_images": true, "remove_conclusion_phrases": true }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    { "id": "msg_8f2c41d0", "object": "message", "grant_id": "grt_5a1e9b77", "subject": "Your application", "conversation": "Thanks for applying. Next steps are below." }
  ]
}
```

## Compose a new message with AI

`POST /v3/grants/{grant_id}/messages/smart-compose` · Release R5

Generates a draft message body from a prompt. Nothing is saved or sent.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `prompt` | string | Yes | What the message should say |

**Response** `200`: `data` is an object with one field, `suggestion` (string), the generated text.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/smart-compose" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "Remind the student that the enrolment deadline is Friday" }'
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N", "data": { "suggestion": "Hi, a quick reminder that enrolment closes this Friday..." } }
```

## Compose a reply with AI

`POST /v3/grants/{grant_id}/messages/{message_id}/smart-compose` · Release R5

Generates a reply to an existing message from a prompt, using that message as context. Nothing is saved or sent.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `message_id` | string | The message to reply to |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `prompt` | string | Yes | What the reply should say |

**Response** `200`: `data` is an object with one field, `suggestion` (string), the generated text.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/msg_8f2c41d0/smart-compose" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "Accept politely and ask for the orientation date" }'
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N", "data": { "suggestion": "Thank you, I am happy to accept. Could you share the orientation date?" } }
```

## Objects

### Message object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Message ID |
| `object` | string | Always `message` |
| `grant_id` | string | Grant the message belongs to |
| `thread_id` | string | Thread the message belongs to |
| `subject` | string | Subject line |
| `from` | array of [Email name](#email-name-object) | Senders |
| `to` | array of [Email name](#email-name-object) | Recipients |
| `cc` | array of [Email name](#email-name-object) | Cc recipients |
| `bcc` | array of [Email name](#email-name-object) | Bcc recipients |
| `reply_to` | array of [Email name](#email-name-object) | `Reply-To` addresses |
| `date` | integer | Unix timestamp when the mail server received the message (not the unverified `Date` header) |
| `created_at` | integer | Unix timestamp when the message was created |
| `unread` | boolean | Whether the message is unread |
| `starred` | boolean | Whether the message is starred |
| `snippet` | string | First 100 characters of the body, with HTML removed |
| `body` | string | Full HTML body; plain-text messages are converted to HTML |
| `attachments` | array of [Attachment](attachments.md#attachment-object) | Files on the message |
| `folders` | array of string | Folder or label IDs the message is in |
| `headers` | array of [Message header](#message-header-object) | Only with `fields=include_headers` or `include_basic_headers` |
| `tracking_options` | [Tracking options](#tracking-options-object) | Only with `fields=include_tracking_options`. Release R3 |
| `raw_mime` | string | Base64url-encoded full MIME message. Only with `fields=raw_mime` |
| `metadata` | object | String key/value pairs |
| `schedule_id` | string | Set when the message was sent with `send_at` |
| `send_at` | integer | Scheduled send time, Unix timestamp |
| `use_draft` | boolean | Whether the send went through a provider draft |

### Email name object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Email address |
| `name` | string | Display name; optional |

### Message header object

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Header name |
| `value` | string | Header value |

### Custom header object

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Header name, for example `X-Campaign` |
| `value` | string | Header value |

### Tracking options object

Release R3.

| Field | Type | Description |
| --- | --- | --- |
| `opens` | boolean | Track opens |
| `links` | boolean | Track link clicks |
| `thread_replies` | boolean | Track replies in the thread |
| `label` | string | Your label for the tracked message, up to 2048 characters |
| `domain_name` | string | Custom hostname for open and link tracking; must be an active domain your organization owns |

### Send attachment object

A file sent inline in the JSON body, or described by a multipart part.

| Field | Type | Description |
| --- | --- | --- |
| `filename` | string | File name shown to the recipient. Required |
| `content_type` | string | MIME type, for example `application/pdf`. Required |
| `content` | string | Base64-encoded file bytes (JSON requests only) |
| `size` | integer | Size in bytes |
| `content_id` | string | Content ID, for referencing an inline image from the body (`cid:`); also the multipart part name |
| `content_disposition` | string | Content disposition, for example `inline` or `attachment` |
| `is_inline` | boolean | Whether the file is shown inline in the body |

### Attachment reference object

Points to a file already uploaded with an [attachment upload session](attachments.md#large-attachment-uploads).

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The `attachment_id` of a completed upload session. Required |
| `content_id` | string | Content ID, for showing the file inline in the body |

### Scheduled message object

| Field | Type | Description |
| --- | --- | --- |
| `schedule_id` | string | Scheduled send ID |
| `status` | [Scheduled message status](#scheduled-message-status-object) | Current state |
| `close_time` | integer | Unix timestamp when the message was sent or failed; absent while pending |

### Scheduled message status object

| Field | Type | Description |
| --- | --- | --- |
| `code` | string | State code, for example `pending` or `success` |
| `description` | string | Human-readable description of the state |
