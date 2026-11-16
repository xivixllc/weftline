# Grants

A grant is one connected account; these endpoints list, inspect, change and remove grants in your application. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants` | List grants | R1 |
| GET | `/v3/grants/{grant_id}` | Get a grant | R1 |
| PATCH | `/v3/grants/{grant_id}` | Update a grant | R1 |
| DELETE | `/v3/grants/{grant_id}` | Delete a grant | R1 |

Grants are created by [hosted sign-in](auth.md#sign-in-flow) or [custom authentication](auth.md#create-a-grant-with-custom-authentication).

## List grants

`GET /v3/grants` · Release R1

Returns the grants in your application. Requires an API key.

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `offset` | integer | Skip this many grants. Offset paging, accepted alongside `page_token`. |
| `sort_by` | string | `created_at` \| `updated_at` |
| `order_by` | string | `asc` \| `desc` |
| `since` | integer | Only grants created at or after this Unix time. |
| `before` | integer | Only grants created before this Unix time. |
| `email` | string | Only grants with this email address. |
| `grant_status` | string | Only grants with this status, for example `valid` or `invalid`. |
| `ip` | string | Only grants whose sign-in came from this IP address. |
| `provider` | string | Only grants for this provider: `google` \| `microsoft` \| `imap` \| `icloud` \| `yahoo` \| `ews` \| `virtual-calendar` \| `zoom` | `weftline` (agent mailboxes; the legacy v3 provider value is also accepted). |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Grant](#grant-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants?provider=google&grant_status=valid&sort_by=created_at&order_by=desc&limit=20" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "grt_7d3a1c9e",
      "provider": "google",
      "grant_status": "valid",
      "email": "student@acadpak.com",
      "name": "Sam Student",
      "scope": ["https://www.googleapis.com/auth/gmail.readonly"],
      "state": "xyz123",
      "ip": "203.0.113.24",
      "user_agent": "Mozilla/5.0",
      "provider_user_id": "108234987123456789012",
      "created_at": 1731650000,
      "updated_at": 1731650000
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjIwfQ"
}
```

## Get a grant

`GET /v3/grants/{grant_id}` · Release R1

Returns one grant. Works with an API key, or with that grant's access token (where `{grant_id}` may be `me`).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or the grant's email address; `me` with a grant access token. |

**Response** `200`: `data` is a [Grant](#grant-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/grt_7d3a1c9e" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "grt_7d3a1c9e",
    "provider": "google",
    "grant_status": "valid",
    "email": "student@acadpak.com",
    "scope": ["https://www.googleapis.com/auth/gmail.readonly"],
    "credential_id": "cred_51ab90",
    "created_at": 1731650000,
    "updated_at": 1731650000
  }
}
```

## Update a grant

`PATCH /v3/grants/{grant_id}` · Release R1

Changes a grant's provider settings, scopes or display name, for example to store a new IMAP password or agent-mailbox app password. Fields you omit keep their values.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or the grant's email address. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `settings` | object | No | Provider settings, in the same shape as [custom authentication](auth.md#create-a-grant-with-custom-authentication) uses for this provider. |
| `scope` | array of string | No | Scopes for the grant. |
| `name` | string | No | Display name for the grant. |

**Response** `200`: `data` is the updated [Grant](#grant-object).

**Example**

```bash
curl -s -X PATCH "$WEFTLINE_URL/v3/grants/grt_2c9e5f10" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "settings": { "imap_password": "new-app-password" }, "name": "Admissions inbox" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "grt_2c9e5f10",
    "provider": "imap",
    "grant_status": "valid",
    "email": "admissions@acadpak.com",
    "name": "Admissions inbox",
    "scope": [],
    "created_at": 1731650000,
    "updated_at": 1731653000
  }
}
```

## Delete a grant

`DELETE /v3/grants/{grant_id}` · Release R1

Removes the grant and revokes its tokens. Requires an API key.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or the grant's email address. |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/grt_2c9e5f10" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Objects

### Grant object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Grant ID. |
| `provider` | string | Provider the account signed in with, for example `google` or `imap`. |
| `scope` | array of string | Scopes granted. |
| `created_at` | integer | Creation time, Unix seconds. |
| `updated_at` | integer | Last update, Unix seconds. |
| `grant_status` | string | `valid` while usable; `invalid` when the user must re-authenticate. |
| `email` | string | Email address of the account. |
| `name` | string | Display name of the account or grant. |
| `user_agent` | string | Browser user agent seen during sign-in. |
| `ip` | string | Client IP address seen during sign-in. |
| `state` | string | The `state` sent when the grant was created. |
| `provider_user_id` | string | The provider's own ID for the user. |
| `settings` | object | Provider settings supplied at creation, for example the [IMAP settings](auth.md#imap-settings-object) or [agent mailbox settings](auth.md#agent-mailbox-settings-object). |
| `credential_id` | string | The [credential](connectors.md#credential-object) used to create the grant. |
| `account_id` | string | Legacy account identifier carried over from a migrated account, if any. |
| `workspace_id` | string | Workspace that holds the grant (agent mailboxes); see [admin.md](admin.md). |
| `blocked` | boolean | `true` if the grant is blocked from use. |
