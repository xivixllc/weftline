# Domain send

Send transactional email from a verified domain without connecting a user mailbox. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| POST | `/v3/domains/{domain_name}/messages/send` | Send from a domain | R3 |

## Send from a domain

`POST /v3/domains/{domain_name}/messages/send` · Release R3

Sends a message from any address on a domain your organization has verified (see [admin.md](admin.md)), using the application API key instead of a grant. Use it for receipts, notifications and other system mail. The body is JSON, or `multipart/form-data` in the same layout as a [grant send](messages.md#attachments-and-multipart-requests); the 4.5 MB Vercel limit applies, so use [upload sessions](attachments.md#large-attachment-uploads) for larger files.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `domain_name` | string | The verified sending domain, for example `acadpak.com` |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `fields` | string | Extra data on the returned message; see [Message fields](messages.md#message-fields) |

**Headers**

| Name | Description |
| --- | --- |
| `Idempotency-Key` | Optional. Prevents a retried request from sending twice; see [Idempotency](README.md#idempotency) |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | [Email name](messages.md#email-name-object) | Yes | Sender, a single object (not an array). The address must be on `domain_name` |
| `to` | array of [Email name](messages.md#email-name-object) | Yes | Recipients |
| `cc` | array of [Email name](messages.md#email-name-object) | No | Cc recipients |
| `bcc` | array of [Email name](messages.md#email-name-object) | No | Bcc recipients |
| `reply_to` | array of [Email name](messages.md#email-name-object) | No | Overrides the `Reply-To` header |
| `subject` | string | No | Subject line; may come from `template` instead |
| `body` | string | No | HTML body, or plain text when `is_plaintext` is `true`; may come from `template` instead |
| `is_plaintext` | boolean | No | `true` sends `body` as text/plain only |
| `template` | [Template selection](#template-selection-object) | No | Render a stored template instead of passing `subject` and `body` |
| `attachments` | array of [Send attachment](messages.md#send-attachment-object) | No | Files to attach |
| `send_at` | integer | No | Unix timestamp to send at |
| `reply_to_message_id` | string | No | ID of the message being answered |
| `tracking_options` | [Tracking options](messages.md#tracking-options-object) | No | Open, link and reply tracking; `domain_name` inside it picks a custom tracking hostname |
| `custom_headers` | array of [Custom header](messages.md#custom-header-object) | No | Extra MIME headers to add |
| `metadata` | object | No | String key/value pairs; see [Metadata](README.md#metadata) |

**Response** `200`: `data` is the sent [Message](messages.md#message-object). It also carries `message_id` (string), the same value as `id`.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/domains/acadpak.com/messages/send" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: receipt-INV-20931" \
  -d '{
    "from": { "name": "Admissions", "email": "admissions@acadpak.com" },
    "to": [{ "email": "student@acadpak.com" }],
    "template": { "id": "tpl_receipt_v2", "strict": true, "variables": { "invoice": "INV-20931", "amount": "250.00" } }
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "msg_d0f3b8a6",
    "message_id": "msg_d0f3b8a6",
    "object": "message",
    "subject": "Your receipt INV-20931",
    "from": [{ "name": "Admissions", "email": "admissions@acadpak.com" }],
    "to": [{ "email": "student@acadpak.com" }]
  }
}
```

## Objects

### Template selection object

Templates are managed in [templates.md](templates.md).

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Template ID. Required |
| `strict` | boolean | `true` rejects the send if the template uses a variable you didn't supply |
| `variables` | object | Values substituted into the template, by variable name |
