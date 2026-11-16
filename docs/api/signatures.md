# Signatures

Store named HTML email signatures for a grant and attach one when you send a message or draft. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

> Provisional: request and response shapes in this file come from client code, not a published contract. Confirm them before relying on them.

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/signatures` | List signatures | R3 |
| POST | `/v3/grants/{grant_id}/signatures` | Create a signature | R3 |
| GET | `/v3/grants/{grant_id}/signatures/{signature_id}` | Get a signature | R3 |
| PUT | `/v3/grants/{grant_id}/signatures/{signature_id}` | Update a signature | R3 |
| DELETE | `/v3/grants/{grant_id}/signatures/{signature_id}` | Delete a signature | R3 |

To use a signature, pass its ID as `signature_id` when you [send a message](messages.md#send-a-message), create a [draft](drafts.md) or send a draft. Weftline appends the signature's `body` to the message body.

## List signatures

`GET /v3/grants/{grant_id}/signatures` · Release R3

Returns the grant's stored signatures.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. |

**Response** `200`: `data` is an array of [Signature](#signature-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/signatures" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "sig_4e2a71b0",
      "name": "Admissions team",
      "body": "<p>Kind regards,<br>Admissions Office, Acadpak</p>",
      "created_at": 1730000000,
      "updated_at": 1730000000
    }
  ]
}
```

## Create a signature

`POST /v3/grants/{grant_id}/signatures` · Release R3

Stores a new signature for the grant. v3 clients don't retry this call, so a timed-out request may still have created the signature; list before you retry.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name, used to pick the signature. |
| `body` | string | Yes | Signature HTML. |

**Response** `200`: `data` is a [Signature](#signature-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/signatures" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Admissions team", "body": "<p>Kind regards,<br>Admissions Office, Acadpak</p>" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "sig_4e2a71b0",
    "name": "Admissions team",
    "body": "<p>Kind regards,<br>Admissions Office, Acadpak</p>",
    "created_at": 1730000000,
    "updated_at": 1730000000
  }
}
```

## Get a signature

`GET /v3/grants/{grant_id}/signatures/{signature_id}` · Release R3

Returns one signature. An unknown ID returns `404 not_found_error`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. |
| `signature_id` | string | Signature ID. |

**Response** `200`: `data` is a [Signature](#signature-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/signatures/sig_4e2a71b0" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD...", "data": { "id": "sig_4e2a71b0", "name": "Admissions team", "body": "<p>Kind regards,...</p>", "created_at": 1730000000, "updated_at": 1730000000 } }
```

## Update a signature

`PUT /v3/grants/{grant_id}/signatures/{signature_id}` · Release R3

Changes only the fields you send. Not retried by v3 clients.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. |
| `signature_id` | string | Signature ID. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New display name. |
| `body` | string | No | New signature HTML. |

**Response** `200`: `data` is the updated [Signature](#signature-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/signatures/sig_4e2a71b0" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "body": "<p>Best wishes,<br>Admissions Office, Acadpak</p>" }'
```

```json
{ "request_id": "req_01JD...", "data": { "id": "sig_4e2a71b0", "name": "Admissions team", "body": "<p>Best wishes,<br>Admissions Office, Acadpak</p>", "created_at": 1730000000, "updated_at": 1730050000 } }
```

## Delete a signature

`DELETE /v3/grants/{grant_id}/signatures/{signature_id}` · Release R3

Removes the signature. Messages already sent keep the text they were sent with.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. |
| `signature_id` | string | Signature ID. |

**Response** `200`: the delete envelope, with no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/signatures/sig_4e2a71b0" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Objects

### Signature object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Signature ID. |
| `name` | string | Display name. |
| `body` | string | Signature HTML. |
| `created_at` | integer | Creation time, Unix seconds. |
| `updated_at` | integer | Last change, Unix seconds. |
