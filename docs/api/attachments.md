# Attachments

Read attachment metadata, download attachment files, and upload large files for sending. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/attachments/{attachment_id}` | Get attachment metadata | R1 |
| GET | `/v3/grants/{grant_id}/attachments/{attachment_id}/download` | Download an attachment | R1 |
| POST | `/v3/grants/{grant_id}/attachment-uploads` | Create an upload session | R1 |
| POST | `/v3/grants/{grant_id}/attachment-uploads/{attachment_id}/complete` | Complete an upload session | R1 |

## Get attachment metadata

`GET /v3/grants/{grant_id}/attachments/{attachment_id}` · Release R1

Returns the name, type and size of a file attached to a message. Attachment IDs come from a message's `attachments` array.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `attachment_id` | string | Attachment ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `message_id` | string | Required. The message the attachment belongs to |

**Response** `200`: `data` is an [Attachment](#attachment-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/attachments/att_19c2?message_id=msg_a71f0c55" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "att_19c2",
    "grant_id": "grt_5a1e9b77",
    "filename": "offer.pdf",
    "content_type": "application/pdf",
    "size": 48213,
    "is_inline": false,
    "content_disposition": "attachment"
  }
}
```

## Download an attachment

`GET /v3/grants/{grant_id}/attachments/{attachment_id}/download` · Release R1

Returns the file itself. The response body is the raw bytes, not a JSON envelope; errors still use the JSON error format. Weftline streams the download, and Vercel exempts streamed responses from its [4.5 MB body limit](README.md#requests), so files up to 150 MB download in one request.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `attachment_id` | string | Attachment ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `message_id` | string | Required. The message the attachment belongs to |

**Response** `200`: the file bytes; no `data`.

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/attachments/att_19c2/download?message_id=msg_a71f0c55" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -o offer.pdf
```

## Large attachment uploads

Use an upload session to attach a file that is too big for a send or draft request body: anything that would push the request past the 4.5 MB Vercel limit, up to **150 MB** (157286400 bytes) per file.

1. **Create a session** with the file's name, type and size. Weftline returns an `attachment_id` and a pre-signed `url`.
2. **Upload the bytes** with an HTTP `PUT` to that `url`, sending exactly the returned `headers`. Don't send your Weftline `Authorization` header. On Vercel the bytes go straight to blob storage, so they never pass through a Weftline function and the 4.5 MB limit doesn't apply.
3. **Complete the session**. Weftline checks the upload (including the size, if you gave one) and marks it `ready`.
4. **Reference the file** in a [send](messages.md#send-a-message) or [draft](drafts.md#create-a-draft) by adding `{ "id": "<attachment_id>" }` to `attachments` (see [Attachment reference](messages.md#attachment-reference-object)). Add `content_id` to show it inline.

Finish all four steps before `expires_at`; an unfinished session then becomes `expired`.

```bash
# 1. Create the session
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/attachment-uploads" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "filename": "prospectus.pdf", "content_type": "application/pdf", "size": 52428800 }'

# 2. Upload the bytes to the returned url, with the returned headers
curl -s -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary @prospectus.pdf

# 3. Complete it
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/attachment-uploads/att_up_7d21e0/complete" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# 4. Send with it
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/messages/send" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "to": [{ "email": "student@acadpak.com" }], "subject": "Prospectus", "attachments": [{ "id": "att_up_7d21e0" }] }'
```

## Create an upload session

`POST /v3/grants/{grant_id}/attachment-uploads` · Release R1

Starts a large-file upload and returns where to put the bytes.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `filename` | string | Yes | File name as the recipient will see it |
| `content_type` | string | Yes | MIME type, for example `application/pdf` |
| `size` | integer | No | Expected size in bytes, at most 157286400. Recommended: completion fails if the upload doesn't match |

**Response** `200`: `data` is an [Upload session](#upload-session-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/attachment-uploads" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "filename": "prospectus.pdf", "content_type": "application/pdf", "size": 52428800 }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "attachment_id": "att_up_7d21e0",
    "grant_id": "grt_5a1e9b77",
    "method": "PUT",
    "url": "https://blob.example.com/uploads/att_up_7d21e0?sig=...",
    "headers": { "Content-Type": "application/pdf" },
    "expires_at": "2026-11-15T13:00:00Z",
    "max_size": 157286400,
    "size": 52428800,
    "content_type": "application/pdf",
    "filename": "prospectus.pdf"
  }
}
```

## Complete an upload session

`POST /v3/grants/{grant_id}/attachment-uploads/{attachment_id}/complete` · Release R1

Tells Weftline the bytes are uploaded. After this the `attachment_id` can be used in sends and drafts. The request body is empty (`{}`).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `attachment_id` | string | The `attachment_id` from the session |

**Response** `200`: `data` is an [Upload session result](#upload-session-result-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/attachment-uploads/att_up_7d21e0/complete" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "attachment_id": "att_up_7d21e0", "grant_id": "grt_5a1e9b77", "status": "ready" }
}
```

## Objects

### Attachment object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Attachment ID |
| `grant_id` | string | Grant the attachment belongs to |
| `filename` | string | File name; some MIME parts, such as delivery reports, have none |
| `content_type` | string | MIME type |
| `size` | integer | Size in bytes |
| `content_id` | string | Content ID, used to reference inline files from the body |
| `content_disposition` | string | Content disposition, for example `inline` or `attachment` |
| `is_inline` | boolean | Whether the file is shown inline in the body |

### Upload session object

| Field | Type | Description |
| --- | --- | --- |
| `attachment_id` | string | Session ID; use it to complete the session and to reference the file |
| `grant_id` | string | Grant the session belongs to |
| `method` | string | HTTP method for the upload. Always `PUT` |
| `url` | string | Pre-signed upload URL. Needs no Weftline credentials |
| `headers` | object | Headers to send with the upload, as string keys and values |
| `expires_at` | string | When the session expires, RFC 3339 |
| `max_size` | integer | Largest allowed file size in bytes (157286400) |
| `size` | integer | The expected size from the request, or `0` if none was given |
| `content_type` | string | MIME type of the file |
| `filename` | string | File name |

### Upload session result object

| Field | Type | Description |
| --- | --- | --- |
| `attachment_id` | string | Session ID |
| `grant_id` | string | Grant the session belongs to |
| `status` | string | `uploading` \| `ready` \| `failed` \| `expired`; `ready` after a successful completion |
