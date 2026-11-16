# Admin

Organization and application administration: sending domains, workspaces that group grants, agent-mailbox policies, rules, lists, and the rule evaluation log. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/admin/domains` | List domains | R3 |
| GET | `/v3/admin/domains/{domain_id}` | Get a domain | R3 |
| POST | `/v3/admin/domains` | Create a domain | R3 |
| PUT | `/v3/admin/domains/{domain_id}` | Update a domain | R3 |
| DELETE | `/v3/admin/domains/{domain_id}` | Delete a domain | R3 |
| POST | `/v3/admin/domains/{domain_id}/info` | Get DNS record details | R3 |
| POST | `/v3/admin/domains/{domain_id}/verify` | Verify a DNS record | R3 |
| GET | `/v3/workspaces` | List workspaces | R4 |
| GET | `/v3/workspaces/{workspace_id}` | Get a workspace | R4 |
| POST | `/v3/workspaces` | Create a workspace | R4 |
| PATCH | `/v3/workspaces/{workspace_id}` | Update a workspace | R4 |
| DELETE | `/v3/workspaces/{workspace_id}` | Delete a workspace | R4 |
| POST | `/v3/workspaces/{workspace_id}/manual-assign` | Assign or remove grants | R4 |
| POST | `/v3/workspaces/auto-group` | Auto-group grants | R4 |
| GET | `/v3/policies` | List policies | R4 |
| GET | `/v3/policies/{policy_id}` | Get a policy | R4 |
| POST | `/v3/policies` | Create a policy | R4 |
| PUT | `/v3/policies/{policy_id}` | Update a policy | R4 |
| DELETE | `/v3/policies/{policy_id}` | Delete a policy | R4 |
| GET | `/v3/rules` | List rules | R4 |
| GET | `/v3/rules/{rule_id}` | Get a rule | R4 |
| POST | `/v3/rules` | Create a rule | R4 |
| PUT | `/v3/rules/{rule_id}` | Update a rule | R4 |
| DELETE | `/v3/rules/{rule_id}` | Delete a rule | R4 |
| GET | `/v3/lists` | List lists | R4 |
| GET | `/v3/lists/{list_id}` | Get a list | R4 |
| POST | `/v3/lists` | Create a list | R4 |
| PUT | `/v3/lists/{list_id}` | Update a list | R4 |
| DELETE | `/v3/lists/{list_id}` | Delete a list | R4 |
| GET | `/v3/lists/{list_id}/items` | List list items | R4 |
| POST | `/v3/lists/{list_id}/items` | Add list items | R4 |
| DELETE | `/v3/lists/{list_id}/items` | Remove list items | R4 |
| GET | `/v3/grants/{grant_id}/rule-evaluations` | List rule evaluations | R4 |

Domain routes need [signed requests](#signed-requests) from a service account and take no `Authorization` header. Every other route here uses the application API key.

## List domains

`GET /v3/admin/domains` · Release R3

Returns the organization's registered sending and receiving domains. Requires [signed request headers](#signed-requests).

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Domain](#domain-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/admin/domains" \
  -H "X-Weftline-Kid: $SA_KEY_ID" \
  -H "X-Weftline-Timestamp: $SA_TIMESTAMP" \
  -H "X-Weftline-Nonce: $SA_NONCE" \
  -H "X-Weftline-Signature: $SA_SIGNATURE"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "dom_3a7f2c91",
      "name": "Acadpak mail",
      "domain_address": "mail.acadpak.com",
      "organization_id": "org_8d21e4b0",
      "branded": false,
      "region": "us",
      "verified_ownership": true,
      "verified_mx": true,
      "verified_spf": true,
      "verified_feedback": false,
      "verified_dkim": true,
      "verified_dmarc": false,
      "verified_arc": false,
      "created_at": 1763164800,
      "updated_at": 1763168400
    }
  ]
}
```

## Get a domain

`GET /v3/admin/domains/{domain_id}` · Release R3

Returns one domain. Requires [signed request headers](#signed-requests).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `domain_id` | string | The domain's ID, or the domain address itself (for example `mail.acadpak.com`) |

**Response** `200`: `data` is a [Domain](#domain-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/admin/domains/mail.acadpak.com" \
  -H "X-Weftline-Kid: $SA_KEY_ID" \
  -H "X-Weftline-Timestamp: $SA_TIMESTAMP" \
  -H "X-Weftline-Nonce: $SA_NONCE" \
  -H "X-Weftline-Signature: $SA_SIGNATURE"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "dom_3a7f2c91",
    "name": "Acadpak mail",
    "domain_address": "mail.acadpak.com",
    "organization_id": "org_8d21e4b0",
    "branded": false,
    "region": "us",
    "verified_ownership": true,
    "verified_mx": true,
    "verified_spf": true,
    "verified_feedback": false,
    "verified_dkim": true,
    "verified_dmarc": false,
    "verified_arc": false,
    "created_at": 1763164800,
    "updated_at": 1763168400
  }
}
```

## Create a domain

`POST /v3/admin/domains` · Release R3

Registers a domain for domain send and inbound mail. Weftline sets the ID, region, `branded`, the verification flags and the timestamps. Requires [signed request headers](#signed-requests).

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display label |
| `domain_address` | string | Yes | Domain to register. Stored lowercase. Must not already exist in the organization |

**Response** `200`: `data` is a [Domain](#domain-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/admin/domains" \
  -H "X-Weftline-Kid: $SA_KEY_ID" \
  -H "X-Weftline-Timestamp: $SA_TIMESTAMP" \
  -H "X-Weftline-Nonce: $SA_NONCE" \
  -H "X-Weftline-Signature: $SA_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{"domain_address":"mail.acadpak.com","name":"Acadpak mail"}'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "dom_3a7f2c91",
    "name": "Acadpak mail",
    "domain_address": "mail.acadpak.com",
    "organization_id": "org_8d21e4b0",
    "branded": false,
    "region": "us",
    "verified_ownership": false,
    "verified_mx": false,
    "verified_spf": false,
    "verified_feedback": false,
    "verified_dkim": false,
    "verified_dmarc": false,
    "verified_arc": false,
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Update a domain

`PUT /v3/admin/domains/{domain_id}` · Release R3

Renames a domain. Only `name` can change; to use a different address, delete the domain and create a new one. The response holds only the changed fields, so fetch the domain again if you need the full record. Requires [signed request headers](#signed-requests).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `domain_id` | string | The domain's ID, or the domain address itself |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New display label |

**Response** `200`: `data` is a partial [Domain](#domain-object), usually just `name` and `updated_at`.

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/admin/domains/dom_3a7f2c91" \
  -H "X-Weftline-Kid: $SA_KEY_ID" \
  -H "X-Weftline-Timestamp: $SA_TIMESTAMP" \
  -H "X-Weftline-Nonce: $SA_NONCE" \
  -H "X-Weftline-Signature: $SA_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acadpak outbound"}'
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N", "data": { "name": "Acadpak outbound", "updated_at": 1763172000 } }
```

## Delete a domain

`DELETE /v3/admin/domains/{domain_id}` · Release R3

Removes a domain from the organization. Requires [signed request headers](#signed-requests).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `domain_id` | string | The domain's ID, or the domain address itself |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/admin/domains/dom_3a7f2c91" \
  -H "X-Weftline-Kid: $SA_KEY_ID" \
  -H "X-Weftline-Timestamp: $SA_TIMESTAMP" \
  -H "X-Weftline-Nonce: $SA_NONCE" \
  -H "X-Weftline-Signature: $SA_SIGNATURE"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Get DNS record details

`POST /v3/admin/domains/{domain_id}/info` · Release R3

Returns the DNS record you must publish for one verification type. Requires [signed request headers](#signed-requests).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `domain_id` | string | The domain's ID, or the domain address itself |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | Yes | `ownership` \| `mx` \| `spf` \| `dkim` \| `feedback` |
| `options` | [Verification options](#verification-options-object) | No | Extra settings for the type. Most callers omit it |

**Response** `200`: `data` is a [Domain verification result](#domain-verification-result-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/admin/domains/dom_3a7f2c91/info" \
  -H "X-Weftline-Kid: $SA_KEY_ID" \
  -H "X-Weftline-Timestamp: $SA_TIMESTAMP" \
  -H "X-Weftline-Nonce: $SA_NONCE" \
  -H "X-Weftline-Signature: $SA_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{"type":"spf"}'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "domain_id": "dom_3a7f2c91",
    "attempt": {
      "type": "spf",
      "host": "mail.acadpak.com",
      "value": "v=spf1 include:spf.weftline.acadpak.com ~all"
    },
    "status": "pending",
    "created_at": 1763164800,
    "expires_at": 1763251200,
    "message": "Add this TXT record at your DNS provider, then call verify."
  }
}
```

## Verify a DNS record

`POST /v3/admin/domains/{domain_id}/verify` · Release R3

Checks DNS now for one verification type and updates the matching `verified_*` flag on the domain. Requires [signed request headers](#signed-requests).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `domain_id` | string | The domain's ID, or the domain address itself |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | Yes | `ownership` \| `mx` \| `spf` \| `dkim` \| `feedback` |
| `options` | [Verification options](#verification-options-object) | No | Extra settings for the type. Most callers omit it |

**Response** `200`: `data` is a [Domain verification result](#domain-verification-result-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/admin/domains/dom_3a7f2c91/verify" \
  -H "X-Weftline-Kid: $SA_KEY_ID" \
  -H "X-Weftline-Timestamp: $SA_TIMESTAMP" \
  -H "X-Weftline-Nonce: $SA_NONCE" \
  -H "X-Weftline-Signature: $SA_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{"type":"spf"}'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "domain_id": "dom_3a7f2c91",
    "attempt": { "type": "spf", "status": "done" },
    "status": "done",
    "created_at": 1763168400
  }
}
```

## List workspaces

`GET /v3/workspaces` · Release R4

Returns every workspace in the application. A workspace groups grants, usually by email domain. This list isn't paginated and takes no query parameters.

**Response** `200`: `data` is an array of [Workspace](#workspace-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/workspaces" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "workspace_id": "ws_6e2b9d14",
      "application_id": "app_1f4c7a20",
      "name": "Acadpak staff",
      "domain": "acadpak.com",
      "auto_group": true,
      "default": false,
      "policy_id": "pol_9c3e5a71",
      "rule_ids": ["rul_2a8d4f60"],
      "created_at": 1763164800,
      "updated_at": 1763164800
    }
  ]
}
```

## Get a workspace

`GET /v3/workspaces/{workspace_id}` · Release R4

Returns one workspace.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `workspace_id` | string | The workspace's ID, or its domain |

**Response** `200`: `data` is a [Workspace](#workspace-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/workspaces/acadpak.com" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "workspace_id": "ws_6e2b9d14",
    "application_id": "app_1f4c7a20",
    "name": "Acadpak staff",
    "domain": "acadpak.com",
    "auto_group": true,
    "default": false,
    "policy_id": "pol_9c3e5a71",
    "rule_ids": ["rul_2a8d4f60"],
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Create a workspace

`POST /v3/workspaces` · Release R4

Creates a workspace. The owning application comes from the API key, not the body.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name |
| `domain` | string | No | Top-level email domain. Omit (with `auto_group`) for a workspace with no domain |
| `auto_group` | boolean | No | Assign new grants whose email domain matches `domain`. Defaults to `true` when `domain` is set, otherwise `false` |
| `policy_id` | string | No | [Policy](#policy-object) to attach |
| `rule_ids` | array of string | No | [Rules](#rule-object) to attach |

**Response** `200`: `data` is a [Workspace](#workspace-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/workspaces" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Acadpak staff", "domain": "acadpak.com", "policy_id": "pol_9c3e5a71" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "workspace_id": "ws_6e2b9d14",
    "application_id": "app_1f4c7a20",
    "name": "Acadpak staff",
    "domain": "acadpak.com",
    "auto_group": true,
    "policy_id": "pol_9c3e5a71",
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Update a workspace

`PATCH /v3/workspaces/{workspace_id}` · Release R4

Changes a workspace. Send at least one field; omitted fields keep their values. The domain can't be changed after creation.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `workspace_id` | string | The workspace's ID. A domain is not accepted here |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New display name |
| `domain` | string | No | Rejected if it differs from the current domain |
| `auto_group` | boolean | No | Can't be `true` on a workspace with an empty domain |
| `policy_id` | string | No | A policy ID sets it, `null` clears it, omitting keeps it |
| `rule_ids` | array of string | No | An array (even empty) replaces the list; `null` or omitting keeps it |

**Response** `200`: `data` is a [Workspace](#workspace-object).

**Example**

```bash
curl -s -X PATCH "$WEFTLINE_URL/v3/workspaces/ws_6e2b9d14" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "policy_id": null, "rule_ids": [] }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "workspace_id": "ws_6e2b9d14",
    "application_id": "app_1f4c7a20",
    "name": "Acadpak staff",
    "domain": "acadpak.com",
    "auto_group": true,
    "rule_ids": [],
    "created_at": 1763164800,
    "updated_at": 1763168400
  }
}
```

## Delete a workspace

`DELETE /v3/workspaces/{workspace_id}` · Release R4

Deletes a workspace.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `workspace_id` | string | The workspace's ID, or its domain |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/workspaces/ws_6e2b9d14" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Assign or remove grants

`POST /v3/workspaces/{workspace_id}/manual-assign` · Release R4

Moves specific grants into or out of a workspace. Send at least one non-empty list; each list takes up to 500 grant IDs.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `workspace_id` | string | The workspace's ID, or its domain |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `assign_grants` | array of string | No | Grant IDs to add, up to 500 |
| `remove_grants` | array of string | No | Grant IDs to remove, up to 500 |

**Response** `200`: `data` is a [Manual assignment result](#manual-assignment-result-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/workspaces/ws_6e2b9d14/manual-assign" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "assign_grants": ["grt_5b1e9c3a", "grt_7d2f0e4b"], "remove_grants": ["grt_1a9c8e6d"] }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "application_id": "app_1f4c7a20",
    "workspace_id": "ws_6e2b9d14",
    "domain": "acadpak.com",
    "grants_assigned": ["grt_5b1e9c3a", "grt_7d2f0e4b"],
    "grants_removed": null
  }
}
```

## Auto-group grants

`POST /v3/workspaces/auto-group` · Release R4

Starts a background job that sorts existing grants into workspaces by email domain. Allowed once a minute per application. All body fields are optional filters.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `after_created_at` | integer | No | Only grants created at or after this time, Unix seconds |
| `invalid_also` | boolean | No | Include invalid grants. Defaults to `false` |
| `specific_domain` | string | No | Only grants with this email domain |

**Response** `200`: `data` is an [Auto-group job](#auto-group-job-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/workspaces/auto-group" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "specific_domain": "acadpak.com" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "job_id": "job_0b7e3d58", "message": "Auto-group job started" }
}
```

## List policies

`GET /v3/policies` · Release R4

Returns the application's policies. A policy sets limits, spam handling and options for agent mailboxes.

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Policy](#policy-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/policies" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "pol_9c3e5a71",
      "name": "Standard agent inbox",
      "application_id": "app_1f4c7a20",
      "organization_id": "org_8d21e4b0",
      "options": { "additional_folders": ["Receipts"], "use_cidr_aliasing": false },
      "limits": { "limit_attachment_size_limit": 10485760, "limit_count_daily_email_sent": 500 },
      "rules": ["rul_2a8d4f60"],
      "spam_detection": { "use_list_dnsbl": true, "use_header_anomaly_detection": true, "spam_sensitivity": 5 },
      "created_at": 1763164800,
      "updated_at": 1763164800
    }
  ]
}
```

## Get a policy

`GET /v3/policies/{policy_id}` · Release R4

Returns one policy.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `policy_id` | string | The policy's ID |

**Response** `200`: `data` is a [Policy](#policy-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/policies/pol_9c3e5a71" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "pol_9c3e5a71",
    "name": "Standard agent inbox",
    "application_id": "app_1f4c7a20",
    "organization_id": "org_8d21e4b0",
    "limits": { "limit_count_daily_email_sent": 500 },
    "rules": ["rul_2a8d4f60"],
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Create a policy

`POST /v3/policies` · Release R4

Creates a policy.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name |
| `options` | [Policy options](#policy-options-object) | No | Folder and aliasing options |
| `limits` | [Policy limits](#policy-limits-object) | No | Size, count and retention limits |
| `rules` | array of string | No | [Rule](#rule-object) IDs applied to inbound mail |
| `spam_detection` | [Policy spam detection](#policy-spam-detection-object) | No | Spam filtering settings |

**Response** `200`: `data` is a [Policy](#policy-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/policies" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Standard agent inbox",
    "limits": { "limit_count_daily_email_sent": 500, "limit_inbox_retention_period": 90 },
    "spam_detection": { "use_list_dnsbl": true, "spam_sensitivity": 5 }
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "pol_9c3e5a71",
    "name": "Standard agent inbox",
    "application_id": "app_1f4c7a20",
    "organization_id": "org_8d21e4b0",
    "limits": { "limit_count_daily_email_sent": 500, "limit_inbox_retention_period": 90 },
    "spam_detection": { "use_list_dnsbl": true, "spam_sensitivity": 5 },
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Update a policy

`PUT /v3/policies/{policy_id}` · Release R4

Changes a policy. Send only the fields to change.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `policy_id` | string | The policy's ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | Display name |
| `options` | [Policy options](#policy-options-object) | No | Folder and aliasing options |
| `limits` | [Policy limits](#policy-limits-object) | No | Size, count and retention limits |
| `rules` | array of string | No | [Rule](#rule-object) IDs applied to inbound mail |
| `spam_detection` | [Policy spam detection](#policy-spam-detection-object) | No | Spam filtering settings |

**Response** `200`: `data` is a [Policy](#policy-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/policies/pol_9c3e5a71" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "rules": ["rul_2a8d4f60", "rul_5f1b7c93"] }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "pol_9c3e5a71",
    "name": "Standard agent inbox",
    "rules": ["rul_2a8d4f60", "rul_5f1b7c93"],
    "created_at": 1763164800,
    "updated_at": 1763168400
  }
}
```

## Delete a policy

`DELETE /v3/policies/{policy_id}` · Release R4

Deletes a policy.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `policy_id` | string | The policy's ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/policies/pol_9c3e5a71" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## List rules

`GET /v3/rules` · Release R4

Returns the application's rules. A rule matches agent-mailbox mail by sender or recipient and applies actions such as blocking or filing.

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Rule](#rule-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/rules" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "rul_2a8d4f60",
      "name": "Block known spam domains",
      "priority": 10,
      "enabled": true,
      "trigger": "inbound",
      "match": {
        "operator": "any",
        "conditions": [ { "field": "from.domain", "operator": "in_list", "value": ["lst_4c0e8a26"] } ]
      },
      "actions": [ { "type": "block" } ],
      "application_id": "app_1f4c7a20",
      "organization_id": "org_8d21e4b0",
      "created_at": 1763164800,
      "updated_at": 1763164800
    }
  ]
}
```

## Get a rule

`GET /v3/rules/{rule_id}` · Release R4

Returns one rule.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `rule_id` | string | The rule's ID |

**Response** `200`: `data` is a [Rule](#rule-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/rules/rul_2a8d4f60" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "rul_2a8d4f60",
    "name": "Block known spam domains",
    "priority": 10,
    "enabled": true,
    "trigger": "inbound",
    "match": { "operator": "any", "conditions": [ { "field": "from.domain", "operator": "in_list", "value": ["lst_4c0e8a26"] } ] },
    "actions": [ { "type": "block" } ],
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Create a rule

`POST /v3/rules` · Release R4

Creates a rule. Attach it to a [policy](#policy-object) or [workspace](#workspace-object) for it to run.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name |
| `description` | string | No | What the rule is for |
| `priority` | integer | No | Run order. Lower numbers run first |
| `enabled` | boolean | No | Whether the rule runs |
| `trigger` | string | No | `inbound` \| `outbound` |
| `match` | [Rule match](#rule-match-object) | Yes | Conditions to test |
| `actions` | array of [Rule action](#rule-action-object) | Yes | What to do on a match |

**Response** `200`: `data` is a [Rule](#rule-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/rules" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "File invoices",
    "trigger": "inbound",
    "match": { "conditions": [ { "field": "from.address", "operator": "is", "value": "billing@acadpak.com" } ] },
    "actions": [ { "type": "assign_to_folder", "value": "fld_3e9b1c55" }, { "type": "mark_as_read" } ]
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "rul_5f1b7c93",
    "name": "File invoices",
    "enabled": true,
    "trigger": "inbound",
    "match": { "operator": "all", "conditions": [ { "field": "from.address", "operator": "is", "value": "billing@acadpak.com" } ] },
    "actions": [ { "type": "assign_to_folder", "value": "fld_3e9b1c55" }, { "type": "mark_as_read" } ],
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Update a rule

`PUT /v3/rules/{rule_id}` · Release R4

Changes a rule. Send only the fields to change; `match` and `actions` are replaced whole.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `rule_id` | string | The rule's ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | Display name |
| `description` | string | No | What the rule is for |
| `priority` | integer | No | Run order. Lower numbers run first |
| `enabled` | boolean | No | Whether the rule runs |
| `trigger` | string | No | `inbound` \| `outbound` |
| `match` | [Rule match](#rule-match-object) | No | Conditions to test |
| `actions` | array of [Rule action](#rule-action-object) | No | What to do on a match |

**Response** `200`: `data` is a [Rule](#rule-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/rules/rul_5f1b7c93" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "rul_5f1b7c93",
    "name": "File invoices",
    "enabled": false,
    "trigger": "inbound",
    "match": { "operator": "all", "conditions": [ { "field": "from.address", "operator": "is", "value": "billing@acadpak.com" } ] },
    "actions": [ { "type": "assign_to_folder", "value": "fld_3e9b1c55" }, { "type": "mark_as_read" } ],
    "created_at": 1763164800,
    "updated_at": 1763168400
  }
}
```

## Delete a rule

`DELETE /v3/rules/{rule_id}` · Release R4

Deletes a rule.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `rule_id` | string | The rule's ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/rules/rul_5f1b7c93" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## List lists

`GET /v3/lists` · Release R4

Returns the application's lists. A list holds domains, TLDs or addresses that rule conditions reference with the `in_list` operator.

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [List](#list-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/lists" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "lst_4c0e8a26",
      "name": "Blocked domains",
      "description": "Senders we never accept",
      "type": "domain",
      "items_count": 3,
      "application_id": "app_1f4c7a20",
      "organization_id": "org_8d21e4b0",
      "created_at": 1763164800,
      "updated_at": 1763168400
    }
  ]
}
```

## Get a list

`GET /v3/lists/{list_id}` · Release R4

Returns one list, without its items.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `list_id` | string | The list's ID |

**Response** `200`: `data` is a [List](#list-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/lists/lst_4c0e8a26" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "lst_4c0e8a26",
    "name": "Blocked domains",
    "description": "Senders we never accept",
    "type": "domain",
    "items_count": 3,
    "created_at": 1763164800,
    "updated_at": 1763168400
  }
}
```

## Create a list

`POST /v3/lists` · Release R4

Creates an empty list. Weftline sets the ID, counts, owners and timestamps.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name |
| `description` | string | No | What the list is for |
| `type` | string | Yes | `domain` \| `tld` \| `address`. Can't be changed later |

**Response** `200`: `data` is a [List](#list-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/lists" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Blocked domains", "type": "domain" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "lst_4c0e8a26",
    "name": "Blocked domains",
    "type": "domain",
    "items_count": 0,
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Update a list

`PUT /v3/lists/{list_id}` · Release R4

Renames a list or changes its description. The `type` is fixed.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `list_id` | string | The list's ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | Display name |
| `description` | string | No | What the list is for |

**Response** `200`: `data` is a [List](#list-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/lists/lst_4c0e8a26" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "description": "Senders we never accept" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "lst_4c0e8a26",
    "name": "Blocked domains",
    "description": "Senders we never accept",
    "type": "domain",
    "items_count": 0,
    "created_at": 1763164800,
    "updated_at": 1763168400
  }
}
```

## Delete a list

`DELETE /v3/lists/{list_id}` · Release R4

Deletes a list and its items.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `list_id` | string | The list's ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/lists/lst_4c0e8a26" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## List list items

`GET /v3/lists/{list_id}/items` · Release R4

Returns the values in a list.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `list_id` | string | The list's ID |

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [List item](#list-item-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/lists/lst_4c0e8a26/items" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    { "id": "lsi_0a1b2c3d", "list_id": "lst_4c0e8a26", "value": "spam-example.net", "created_at": 1763168400 }
  ]
}
```

## Add list items

`POST /v3/lists/{list_id}/items` · Release R4

Adds values to a list. Weftline normalizes each value to the list's `type`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `list_id` | string | The list's ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | array of string | Yes | Values to add |

**Response** `200`: `data` is the updated [List](#list-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/lists/lst_4c0e8a26/items" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "items": ["spam-example.net", "phish-example.org"] }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "lst_4c0e8a26", "name": "Blocked domains", "type": "domain", "items_count": 2, "created_at": 1763164800, "updated_at": 1763168400 }
}
```

## Remove list items

`DELETE /v3/lists/{list_id}/items` · Release R4

Removes values from a list. This `DELETE` carries a JSON body.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `list_id` | string | The list's ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `items` | array of string | Yes | Values to remove |

**Response** `200`: `data` is the updated [List](#list-object).

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/lists/lst_4c0e8a26/items" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "items": ["phish-example.org"] }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "lst_4c0e8a26", "name": "Blocked domains", "type": "domain", "items_count": 1, "created_at": 1763164800, "updated_at": 1763172000 }
}
```

## List rule evaluations

`GET /v3/grants/{grant_id}/rule-evaluations` · Release R4

Returns the log of rule evaluations for one agent mailbox: what was checked, which rules matched and what was done.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | The grant's ID or email address |

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Rule evaluation](#rule-evaluation-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/grt_5b1e9c3a/rule-evaluations?limit=20" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "rev_7e4a1d09",
      "grant_id": "grt_5b1e9c3a",
      "evaluated_at": 1763168400,
      "evaluation_stage": "smtp_rcpt",
      "evaluation_input": { "from_address": "x@spam-example.net", "from_domain": "spam-example.net", "from_tld": "net" },
      "applied_actions": { "blocked": true },
      "matched_rule_ids": ["rul_2a8d4f60"],
      "application_id": "app_1f4c7a20",
      "organization_id": "org_8d21e4b0",
      "created_at": 1763168400,
      "updated_at": 1763168400
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjIwfQ"
}
```

## Signed requests

Domain routes are called by a **service account**, not with an API key. Each request carries four headers built from an RSA key pair; no `Authorization` header is sent.

| Header | Value |
| --- | --- |
| `X-Weftline-Kid` | The key ID: `private_key_id` from the service account's credentials file |
| `X-Weftline-Timestamp` | Current time in Unix seconds, as a decimal string |
| `X-Weftline-Nonce` | A fresh random string for every request: 20 characters from `A-Z`, `a-z`, `0-9` |
| `X-Weftline-Signature` | Base64 RSA signature over the signing string below |

Weftline also accepts the legacy v3 header names, so the existing v3 SDK signers work unchanged.

**What is signed.** Build a JSON object with these keys:

| Key | Type | Value |
| --- | --- | --- |
| `method` | string | HTTP method in lowercase, for example `post` |
| `nonce` | string | Same value as `X-Weftline-Nonce` |
| `path` | string | Request path without host or query string, with path IDs percent-encoded as sent, for example `/v3/admin/domains/dom_3a7f2c91/verify` |
| `timestamp` | integer | Same value as `X-Weftline-Timestamp`, as a number |
| `payload` | string | Only for `post`, `put` and `patch` with a body: the canonical JSON of the body, as a string |

Serialize that object as **canonical JSON**: object keys sorted at every level, no whitespace, standard JSON string escaping. The result is the signing string. For `POST`, `PUT` and `PATCH`, send the canonical body bytes as the request body too, so the body Weftline receives matches the signed `payload` exactly.

**Algorithm.** RSA PKCS #1 v1.5 with SHA-256 (`RSA-SHA256`) over the UTF-8 signing string, Base64-encoded. The private key is PEM (PKCS #1 or PKCS #8).

**Checks.** Weftline looks up the public key by `X-Weftline-Kid`, verifies the signature, and rejects a timestamp far from server time or a nonce it has already seen, with `401 unauthorized`.

```js
import crypto from 'node:crypto';

const canonical = (v) =>
  Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : v && typeof v === 'object'
    ? `{${Object.keys(v).filter((k) => v[k] !== undefined).sort()
        .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
    : JSON.stringify(v);

function signRequest({ method, path, body, keyId, privateKeyPem }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const nonce = Array.from({ length: 20 }, () => chars[crypto.randomInt(chars.length)]).join('');
  const m = method.toLowerCase();
  const payload = body && ['post', 'put', 'patch'].includes(m) ? canonical(body) : undefined;
  const envelope = { method: m, nonce, path, timestamp, ...(payload && { payload }) };
  const signature = crypto.createSign('RSA-SHA256').update(canonical(envelope)).sign(privateKeyPem, 'base64');
  return {
    headers: {
      'X-Weftline-Kid': keyId,
      'X-Weftline-Timestamp': String(timestamp),
      'X-Weftline-Nonce': nonce,
      'X-Weftline-Signature': signature,
    },
    body: payload, // send exactly this string as the request body
  };
}
```

## Objects

### Domain object

Every field is optional; Weftline returns only the fields it has set.

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The domain's ID |
| `name` | string | Display label |
| `domain_address` | string | The registered domain, lowercase |
| `organization_id` | string | Owning organization, taken from the credentials |
| `branded` | boolean | Whether the domain is a subdomain of the Weftline operator's own branded domain. Set by Weftline |
| `region` | string | Hosting region. Set by Weftline |
| `verified_ownership` | boolean | Ownership TXT record verified |
| `verified_mx` | boolean | MX record verified |
| `verified_spf` | boolean | SPF record verified |
| `verified_feedback` | boolean | Feedback (bounce) MX record verified |
| `verified_dkim` | boolean | DKIM record verified |
| `verified_dmarc` | boolean | DMARC record verified |
| `verified_arc` | boolean | ARC record verified |
| `created_at` | integer | When the domain was registered, Unix seconds |
| `updated_at` | integer | When the domain last changed, Unix seconds |

### Verification options object

| Field | Type | Description |
| --- | --- | --- |
| `key_length` | integer | For `dkim`, the preferred key length |

### Domain verification result object

Returned by both info and verify. Every field is optional.

| Field | Type | Description |
| --- | --- | --- |
| `domain_id` | string | The domain checked |
| `attempt` | [Domain verification attempt](#domain-verification-attempt-object) | The record to publish, or the record checked |
| `status` | string | `pending` \| `done` \| `failed` |
| `created_at` | integer | When this attempt was recorded, Unix seconds |
| `expires_at` | integer | When this attempt expires, Unix seconds |
| `details` | object | Intermediate state, free-form |
| `message` | string | Human-readable instructions for the DNS record |

### Domain verification attempt object

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | `ownership` \| `mx` \| `spf` \| `dkim` \| `feedback` \| `dmarc` \| `arc` |
| `options` | object | DNS record values to configure, free-form |
| `host` | string | DNS host name for the record |
| `value` | string | DNS record value |
| `status` | string | Status of this attempt |

### Workspace object

| Field | Type | Description |
| --- | --- | --- |
| `workspace_id` | string | The workspace's ID |
| `application_id` | string | Owning application, taken from the API key |
| `name` | string | Display name |
| `domain` | string | Top-level email domain. Empty string when none |
| `auto_group` | boolean | New grants with a matching email domain join automatically |
| `default` | boolean | Whether this is the application's default workspace. Optional |
| `policy_id` | string | Attached [Policy](#policy-object). Optional |
| `rule_ids` | array of string | Attached [Rules](#rule-object). Optional |
| `created_at` | integer | When the workspace was created, Unix seconds |
| `updated_at` | integer | When the workspace last changed, Unix seconds |

### Auto-group job object

| Field | Type | Description |
| --- | --- | --- |
| `job_id` | string | ID of the background job |
| `message` | string | Human-readable status |

### Manual assignment result object

| Field | Type | Description |
| --- | --- | --- |
| `application_id` | string | Owning application |
| `workspace_id` | string | The workspace changed |
| `domain` | string | The workspace's domain. Empty string when none |
| `grants_assigned` | array of string | Grants actually added. `null`, not `[]`, when none matched |
| `grants_removed` | array of string | Grants actually removed. `null`, not `[]`, when none matched |

### Policy object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The policy's ID |
| `name` | string | Display name |
| `application_id` | string | Owning application. Optional |
| `organization_id` | string | Owning organization. Optional |
| `options` | [Policy options](#policy-options-object) | Folder and aliasing options. Optional |
| `limits` | [Policy limits](#policy-limits-object) | Size, count and retention limits. Optional |
| `rules` | array of string | [Rule](#rule-object) IDs applied to inbound mail. Optional |
| `spam_detection` | [Policy spam detection](#policy-spam-detection-object) | Spam filtering settings. Optional |
| `created_at` | integer | When the policy was created, Unix seconds. Optional |
| `updated_at` | integer | When the policy last changed, Unix seconds. Optional |

### Policy options object

| Field | Type | Description |
| --- | --- | --- |
| `additional_folders` | array of string | Extra folders created in each mailbox using the policy |
| `use_cidr_aliasing` | boolean | Turn on CIDR-based address aliasing |

### Policy limits object

All fields are optional.

| Field | Type | Description |
| --- | --- | --- |
| `limit_attachment_size_limit` | integer | Largest single attachment, in bytes |
| `limit_attachment_count_limit` | integer | Most attachments on one message |
| `limit_attachment_allowed_types` | array of string | Allowed attachment MIME types |
| `limit_size_total_mime` | integer | Largest total message size, in bytes |
| `limit_storage_total` | integer | Storage cap per mailbox, in bytes |
| `limit_count_daily_message_received` | integer | Messages each grant may receive per day. `-1` means unlimited |
| `limit_count_daily_email_sent` | integer | Messages each grant may send per day. `-1` means unlimited |
| `limit_count_daily_message_per_grant` | integer | Daily message cap per grant, as sent by some v3 clients in place of the two fields above |
| `limit_inbox_retention_period` | integer | Days messages stay in the inbox |
| `limit_spam_retention_period` | integer | Days messages stay in the spam folder |

### Policy spam detection object

| Field | Type | Description |
| --- | --- | --- |
| `use_list_dnsbl` | boolean | Check senders against DNS block lists |
| `use_header_anomaly_detection` | boolean | Flag messages with suspicious headers |
| `spam_sensitivity` | number | How aggressive filtering is. Higher marks more mail as spam |

### Rule object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The rule's ID |
| `name` | string | Display name |
| `description` | string | What the rule is for. Optional |
| `priority` | integer | Run order. Lower numbers run first. Optional |
| `enabled` | boolean | Whether the rule runs. Optional |
| `trigger` | string | `inbound` \| `outbound`. Optional |
| `match` | [Rule match](#rule-match-object) | Conditions to test |
| `actions` | array of [Rule action](#rule-action-object) | What to do on a match |
| `application_id` | string | Owning application. Optional |
| `organization_id` | string | Owning organization. Optional |
| `created_at` | integer | When the rule was created, Unix seconds. Optional |
| `updated_at` | integer | When the rule last changed, Unix seconds. Optional |

### Rule match object

| Field | Type | Description |
| --- | --- | --- |
| `operator` | string | `all` \| `any`. Defaults to `all` |
| `conditions` | array of [Rule condition](#rule-condition-object) | Conditions to combine |

### Rule condition object

| Field | Type | Description |
| --- | --- | --- |
| `field` | string | `from.address` \| `from.domain` \| `from.tld` \| `recipient.address` \| `recipient.domain` \| `recipient.tld` \| `outbound.type` |
| `operator` | string | `is` \| `is_not` \| `contains` \| `in_list` |
| `value` | string or array of string | Value to compare. For `in_list`, one or more [List](#list-object) IDs. For `outbound.type`, `compose` \| `reply` |

### Rule action object

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | `block` \| `mark_as_spam` \| `assign_to_folder` \| `mark_as_read` \| `mark_as_starred` \| `archive` \| `trash` |
| `value` | string | Folder ID. Required when `type` is `assign_to_folder` |

### List object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The list's ID |
| `name` | string | Display name |
| `description` | string | What the list is for. Optional |
| `type` | string | `domain` \| `tld` \| `address` |
| `items_count` | integer | Number of items. Optional |
| `application_id` | string | Owning application. Optional |
| `organization_id` | string | Owning organization. Optional |
| `created_at` | integer | When the list was created, Unix seconds. Optional |
| `updated_at` | integer | When the list last changed, Unix seconds. Optional |

### List item object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The item's ID |
| `list_id` | string | The list holding the item |
| `value` | string | The normalized value |
| `created_at` | integer | When the item was added, Unix seconds. Optional |

### Rule evaluation object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The evaluation record's ID |
| `grant_id` | string | The grant evaluated |
| `message_id` | string | The message or stored sent copy. Absent for `smtp_rcpt` evaluations and for sends with no stored copy |
| `evaluated_at` | integer | When the evaluation ran, Unix seconds. Optional |
| `evaluation_stage` | string | `smtp_rcpt` \| `inbox_processing` \| `outbound_send`. Optional |
| `evaluation_input` | [Rule evaluation input](#rule-evaluation-input-object) | The values rules were matched against. Optional |
| `applied_actions` | [Rule evaluation applied actions](#rule-evaluation-applied-actions-object) | What was done. Optional |
| `matched_rule_ids` | array of string | Rules that matched. Optional |
| `application_id` | string | Owning application. Optional |
| `organization_id` | string | Owning organization. Optional |
| `created_at` | integer | When the record was created, Unix seconds. Optional |
| `updated_at` | integer | When the record last changed, Unix seconds. Optional |

### Rule evaluation input object

All fields are optional.

| Field | Type | Description |
| --- | --- | --- |
| `from_address` | string | Normalized sender address |
| `from_domain` | string | Normalized sender domain |
| `from_tld` | string | Normalized sender top-level domain |
| `recipient_addresses` | array of string | Outbound recipient addresses |
| `recipient_domains` | array of string | Outbound recipient domains |
| `recipient_tlds` | array of string | Outbound recipient top-level domains |
| `outbound_type` | string | `compose` \| `reply` |

### Rule evaluation applied actions object

All fields are optional.

| Field | Type | Description |
| --- | --- | --- |
| `blocked` | boolean | The message or send was blocked |
| `blocked_by_evaluation_error` | boolean | Blocked because evaluation failed and Weftline failed closed, not because a rule matched |
| `marked_as_spam` | boolean | Moved to spam |
| `marked_as_read` | boolean | Marked as read |
| `marked_starred` | boolean | Starred |
| `archived` | boolean | Archived |
| `trashed` | boolean | Moved to trash |
| `folder_ids` | array of string | Folders assigned by matching rules |
