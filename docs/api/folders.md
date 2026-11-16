# Folders

Manage a grant's mail folders, which are labels on Gmail and nested folders on Microsoft 365. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/folders` | List folders | R1 |
| GET | `/v3/grants/{grant_id}/folders/{folder_id}` | Get a folder | R1 |
| POST | `/v3/grants/{grant_id}/folders` | Create a folder | R1 |
| PUT | `/v3/grants/{grant_id}/folders/{folder_id}` | Update a folder | R1 |
| DELETE | `/v3/grants/{grant_id}/folders/{folder_id}` | Delete a folder | R1 |

Some fields only apply to one provider:

- **Gmail labels** have colours: `text_color` and `background_color`, as hex strings such as `#0099EE`. Gmail accepts only colours from its own fixed palette.
- **Microsoft 365 folders** nest: `parent_id` places a folder under another, and `child_count` counts its direct children.

## List folders

`GET /v3/grants/{grant_id}/folders` · Release R1

Returns the grant's folders or labels, system folders included.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `parent_id` | string | Only the child folders of this folder (Microsoft 365 and Exchange) |
| `include_hidden_folders` | boolean | Include hidden folders (Microsoft 365). Default `false` |
| `single_level` | boolean | `true` returns one level of the hierarchy only; `false` returns all levels (Microsoft 365). Default `false` |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Folder](#folder-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/folders" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    { "id": "SENT", "object": "folder", "grant_id": "grt_5a1e9b77", "name": "SENT", "system_folder": true, "attributes": ["\\Sent"], "total_count": 312, "unread_count": 0 },
    { "id": "Label_42", "object": "folder", "grant_id": "grt_5a1e9b77", "name": "Applications", "system_folder": false, "text_color": "#ffffff", "background_color": "#16a766", "total_count": 57, "unread_count": 4 }
  ]
}
```

## Get a folder

`GET /v3/grants/{grant_id}/folders/{folder_id}` · Release R1

Returns one folder.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `folder_id` | string | Folder ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `include_hidden_folders` | boolean | Allow a hidden folder to be returned (Microsoft 365). Default `false` |
| `select` | string | Comma-separated fields to return |

**Response** `200`: `data` is a [Folder](#folder-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/folders/Label_42" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "Label_42", "object": "folder", "grant_id": "grt_5a1e9b77", "name": "Applications", "total_count": 57, "unread_count": 4 }
}
```

## Create a folder

`POST /v3/grants/{grant_id}/folders` · Release R1

Creates a folder, or a label on Gmail.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name, 1 to 1024 characters |
| `parent_id` | string | No | Folder to create this one inside (Microsoft 365) |
| `text_color` | string | No | Label text colour as hex, for example `#0099EE` (Gmail) |
| `background_color` | string | No | Label background colour as hex, for example `#0099EE` (Gmail) |

**Response** `200`: `data` is the new [Folder](#folder-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/folders" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Applications", "text_color": "#ffffff", "background_color": "#16a766" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "Label_42", "object": "folder", "grant_id": "grt_5a1e9b77", "name": "Applications", "text_color": "#ffffff", "background_color": "#16a766", "system_folder": false }
}
```

## Update a folder

`PUT /v3/grants/{grant_id}/folders/{folder_id}` · Release R1

Renames, recolours or moves a folder. Send only the fields you want to change.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `folder_id` | string | Folder ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New display name, 1 to 1024 characters |
| `parent_id` | string | No | Move the folder under this folder (Microsoft 365) |
| `text_color` | string | No | Label text colour as hex (Gmail) |
| `background_color` | string | No | Label background colour as hex (Gmail) |

**Response** `200`: `data` is the updated [Folder](#folder-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/folders/AAMkAGI2TG93AAA=" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "2026 intake", "parent_id": "AAMkAGI2THVSAAA=" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "AAMkAGI2TG93AAA=", "object": "folder", "grant_id": "grt_5a1e9b77", "name": "2026 intake", "parent_id": "AAMkAGI2THVSAAA=", "child_count": 0 }
}
```

## Delete a folder

`DELETE /v3/grants/{grant_id}/folders/{folder_id}` · Release R1

Deletes a folder or label.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `folder_id` | string | Folder ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/folders/Label_42" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Objects

### Folder object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Folder ID |
| `object` | string | Always `folder` |
| `grant_id` | string | Grant the folder belongs to |
| `name` | string | Display name |
| `attributes` | array of string | Common role markers for system folders, the same across providers; for example the Sent folder has `["\\Sent"]`. IMAP folders report the server's own attributes |
| `system_folder` | boolean | `true` for provider-created folders, `false` for user-created (Gmail) |
| `text_color` | string | Label text colour as hex (Gmail) |
| `background_color` | string | Label background colour as hex (Gmail) |
| `parent_id` | string | Parent folder ID (Microsoft 365) |
| `child_count` | integer | Number of direct child folders (Microsoft 365) |
| `total_count` | integer | Number of items in the folder |
| `unread_count` | integer | Number of unread items in the folder |
