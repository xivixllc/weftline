# Connectors and provider credentials

A connector holds your application's settings for one provider (OAuth client, default scopes); credentials are extra named secrets under a connector for admin consent, service accounts or alternate OAuth clients. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/connectors` | List connectors | R1 |
| POST | `/v3/connectors` | Create a connector | R1 |
| GET | `/v3/connectors/{provider}` | Get a connector | R1 |
| PATCH | `/v3/connectors/{provider}` | Update a connector (`PUT` also accepted) | R1 |
| DELETE | `/v3/connectors/{provider}` | Delete a connector | R1 |
| GET | `/v3/connectors/{provider}/creds` | List credentials | R1 |
| POST | `/v3/connectors/{provider}/creds` | Create a credential | R1 |
| GET | `/v3/connectors/{provider}/creds/{credential_id}` | Get a credential | R1 |
| PATCH | `/v3/connectors/{provider}/creds/{credential_id}` | Update a credential | R1 |
| DELETE | `/v3/connectors/{provider}/creds/{credential_id}` | Delete a credential | R1 |

An application has at most one connector per provider, so connectors are addressed by `{provider}`: `google` \| `microsoft` \| `imap` \| `icloud` \| `yahoo` \| `ews` \| `virtual-calendar` \| `zoom` | `weftline` (agent mailboxes; the legacy v3 provider value is also accepted). All routes here require an API key.

## List connectors

`GET /v3/connectors` · Release R1

Returns every connector configured for the application.

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Connector](#connector-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/connectors" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "provider": "google",
      "settings": { "client_id": "1234-abc.apps.googleusercontent.com", "topic_name": "projects/acadpak/topics/weftline" },
      "scope": ["https://www.googleapis.com/auth/gmail.modify"],
      "active_credential_id": "cred_51ab90"
    },
    { "provider": "imap" }
  ]
}
```

## Create a connector

`POST /v3/connectors` · Release R1

Adds a connector for one provider. Create it before users sign in with that provider.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Your label for the connector. |
| `provider` | string | Yes | Provider this connector serves. |
| `settings` | object | Google and Microsoft | [Google connector settings](#google-connector-settings-object) or [Microsoft connector settings](#microsoft-connector-settings-object). `imap` and `virtual-calendar` take no settings. |
| `scope` | array of string | No | Default scopes requested at sign-in when `scope` is not passed. |
| `active_credential_id` | string | No | Default [credential](#credential-object) for sign-in. |

**Response** `200`: `data` is the new [Connector](#connector-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/connectors" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acadpak Microsoft",
    "provider": "microsoft",
    "settings": { "client_id": "6f1e...", "client_secret": "s3cr3t", "tenant": "common" },
    "scope": ["Mail.Read", "Calendars.ReadWrite"]
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "provider": "microsoft",
    "settings": { "client_id": "6f1e...", "tenant": "common" },
    "scope": ["Mail.Read", "Calendars.ReadWrite"]
  }
}
```

## Get a connector

`GET /v3/connectors/{provider}` · Release R1

Returns the connector for one provider.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider of the connector. |

**Response** `200`: `data` is a [Connector](#connector-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/connectors/google" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "provider": "google",
    "settings": { "client_id": "1234-abc.apps.googleusercontent.com", "topic_name": "projects/acadpak/topics/weftline" },
    "scope": ["https://www.googleapis.com/auth/gmail.modify"],
    "active_credential_id": "cred_51ab90"
  }
}
```

## Update a connector

`PATCH /v3/connectors/{provider}` · Release R1

Changes a connector's name, settings, default scopes or default credential. `PUT` to the same path is accepted with the same body, because some v3 SDK versions send `PUT`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider of the connector. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New label. |
| `settings` | object | No | Provider settings, same shape as on create. |
| `scope` | array of string | No | New default scopes. |
| `active_credential_id` | string | No | [Credential](#credential-object) to use when sign-in doesn't name one. |

**Response** `200`: `data` is the updated [Connector](#connector-object).

**Example**

```bash
curl -s -X PATCH "$WEFTLINE_URL/v3/connectors/google" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "active_credential_id": "cred_77cd12" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "provider": "google",
    "scope": ["https://www.googleapis.com/auth/gmail.modify"],
    "active_credential_id": "cred_77cd12"
  }
}
```

## Delete a connector

`DELETE /v3/connectors/{provider}` · Release R1

Removes the connector. Users can no longer sign in with that provider until you create it again.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider of the connector. |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/connectors/zoom" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## List credentials

`GET /v3/connectors/{provider}/creds` · Release R1

Returns the credentials stored under a connector.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider of the connector. |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `offset` | integer | Skip this many credentials. Offset paging, accepted alongside `page_token`. |
| `sort_by` | string | `created_at` \| `updated_at`. The camelCase forms `createdAt` and `updatedAt` are also accepted. |
| `order_by` | string | `asc` \| `desc` |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Credential](#credential-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/connectors/google/creds?sort_by=created_at&order_by=desc" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "cred_51ab90",
      "name": "Acadpak GCP project A",
      "credential_type": "connector",
      "hashed_data": "9f2b6c...",
      "created_at": 1731650000,
      "updated_at": 1731650000
    }
  ]
}
```

## Create a credential

`POST /v3/connectors/{provider}/creds` · Release R1

Stores a named credential under a connector. Pass its `id` as `credential_id` to [hosted sign-in](auth.md#start-hosted-sign-in) or [custom authentication](auth.md#oauth-refresh-token-settings-object), or make it the connector's `active_credential_id`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider of the connector. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Unique name for the credential. |
| `credential_type` | string | Yes | `adminconsent` \| `serviceaccount` \| `connector` |
| `credential_data` | object | Yes | Depends on `credential_type`: [Admin consent data](#admin-consent-data-object), [Service account data](#service-account-data-object) or [Connector override data](#connector-override-data-object). |

**Response** `200`: `data` is the new [Credential](#credential-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/connectors/microsoft/creds" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acadpak tenant admin consent",
    "credential_type": "adminconsent",
    "credential_data": { "client_id": "6f1e...", "client_secret": "s3cr3t" }
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "cred_a03f44",
    "name": "Acadpak tenant admin consent",
    "credential_type": "adminconsent",
    "hashed_data": "1c7e0b...",
    "created_at": 1731650000,
    "updated_at": 1731650000
  }
}
```

## Get a credential

`GET /v3/connectors/{provider}/creds/{credential_id}` · Release R1

Returns one credential. The secret itself is never returned, only `hashed_data`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider of the connector. |
| `credential_id` | string | Credential ID. |

**Response** `200`: `data` is a [Credential](#credential-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/connectors/microsoft/creds/cred_a03f44" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "cred_a03f44",
    "name": "Acadpak tenant admin consent",
    "credential_type": "adminconsent",
    "hashed_data": "1c7e0b...",
    "created_at": 1731650000,
    "updated_at": 1731650000
  }
}
```

## Update a credential

`PATCH /v3/connectors/{provider}/creds/{credential_id}` · Release R1

Renames a credential or replaces its secret data. `credential_type` can't be changed.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider of the connector. |
| `credential_id` | string | Credential ID. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New unique name. |
| `credential_data` | object | No | Replacement data, in the shape for the credential's type. |

**Response** `200`: `data` is the updated [Credential](#credential-object).

**Example**

```bash
curl -s -X PATCH "$WEFTLINE_URL/v3/connectors/microsoft/creds/cred_a03f44" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "credential_data": { "client_id": "6f1e...", "client_secret": "rotated-s3cr3t" } }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "cred_a03f44",
    "name": "Acadpak tenant admin consent",
    "credential_type": "adminconsent",
    "hashed_data": "e45a91...",
    "created_at": 1731650000,
    "updated_at": 1731654000
  }
}
```

## Delete a credential

`DELETE /v3/connectors/{provider}/creds/{credential_id}` · Release R1

Removes a credential from the connector.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider of the connector. |
| `credential_id` | string | Credential ID. |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/connectors/google/creds/cred_51ab90" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Objects

### Connector object

| Field | Type | Description |
| --- | --- | --- |
| `provider` | string | Provider the connector serves. Also its identifier in paths. |
| `settings` | object | Provider settings: [Google connector settings](#google-connector-settings-object) or [Microsoft connector settings](#microsoft-connector-settings-object). Absent for providers without settings. |
| `scope` | array of string | Default scopes requested at sign-in. |
| `active_credential_id` | string | Credential used when sign-in or custom authentication doesn't name one. |

### Google connector settings object

| Field | Type | Description |
| --- | --- | --- |
| `client_id` | string | Required on create. Google OAuth client ID. |
| `client_secret` | string | Required on create. Google OAuth client secret. |
| `topic_name` | string | Google Cloud Pub/Sub topic for real-time mailbox change notifications. |

### Microsoft connector settings object

| Field | Type | Description |
| --- | --- | --- |
| `client_id` | string | Required on create. Microsoft Entra application (client) ID. |
| `client_secret` | string | Required on create. Microsoft client secret. |
| `tenant` | string | Microsoft tenant ID, or `common` for multi-tenant apps. |

### Credential object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Credential ID. |
| `name` | string | Unique name for the credential. |
| `credential_type` | string | `adminconsent` \| `serviceaccount` \| `connector` |
| `hashed_data` | string | Hash of the stored credential data, for comparing without revealing it. |
| `created_at` | integer | Creation time, Unix seconds. |
| `updated_at` | integer | Last update, Unix seconds. |

### Admin consent data object

`credential_data` when `credential_type` is `adminconsent` (Microsoft).

| Field | Type | Description |
| --- | --- | --- |
| `client_id` | string | Required. Client ID of the Microsoft application the administrator consents to. |
| `client_secret` | string | Required. Client secret of that application. |

Additional string fields are accepted and stored.

### Service account data object

`credential_data` when `credential_type` is `serviceaccount` (Google).

| Field | Type | Description |
| --- | --- | --- |
| `private_key_id` | string | Required. Key ID from the service account's JSON key file. |
| `private_key` | string | Required. PEM private key from the key file. |
| `client_email` | string | Required. The service account's email address. |

Additional string fields from the key file are accepted and stored.

### Connector override data object

`credential_data` when `credential_type` is `connector`. Replaces the connector's own OAuth client for grants that use this credential, so it takes the same fields as the connector's settings: [Google connector settings](#google-connector-settings-object) or [Microsoft connector settings](#microsoft-connector-settings-object).
