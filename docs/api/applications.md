# Applications and redirect URIs

These endpoints read and change your application's settings and branding, and manage the redirect URIs that hosted sign-in may return to. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/applications` | Get application details | R1 |
| PATCH | `/v3/applications` | Update application details | R1 |
| GET | `/v3/applications/redirect-uris` | List redirect URIs | R1 |
| POST | `/v3/applications/redirect-uris` | Create a redirect URI | R1 |
| GET | `/v3/applications/redirect-uris/{redirect_uri_id}` | Get a redirect URI | R1 |
| PATCH | `/v3/applications/redirect-uris/{redirect_uri_id}` | Update a redirect URI | R1 |
| DELETE | `/v3/applications/redirect-uris/{redirect_uri_id}` | Delete a redirect URI | R1 |

**Alias:** every `/v3/applications/redirect-uris` route is also served at `/v3/applications/callback-uris` with the same methods, bodies and responses. The application is the one the API key belongs to, so no application ID appears in the path. All routes here require an API key.

## Get application details

`GET /v3/applications` · Release R1

Returns the application the API key belongs to.

**Response** `200`: `data` is an [Application](#application-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/applications" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "application_id": "app_4f1c2d",
    "organization_id": "org_19be07",
    "region": "us",
    "environment": "production",
    "branding": {
      "name": "Acadpak",
      "icon_url": "https://acadpak.com/static/icon.png",
      "website_url": "https://acadpak.com",
      "description": "Course mail and calendars"
    },
    "hosted_authentication": {
      "color_primary": "#1F4E8C",
      "title": "Connect your school account",
      "privacy_policy_url": "https://acadpak.com/privacy"
    },
    "callback_uris": [
      { "id": "ruri_0c4e1a", "url": "https://acadpak.com/oauth/callback", "platform": "web" }
    ],
    "created_at": 1731000000,
    "updated_at": 1731650000
  }
}
```

## Update application details

`PATCH /v3/applications` · Release R1

Changes branding, hosted sign-in appearance, identity-provider settings, callback URIs, domain or token settings. Every field is optional. Each nested object you send **replaces** the stored one whole; it is not merged field by field.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `branding` | object | No | [Branding](#branding-object). `name` is optional here. |
| `hosted_authentication` | object | No | [Hosted authentication](#hosted-authentication-object). |
| `idp_settings` | object | No | [IdP settings](#idp-settings-object). |
| `callback_uris` | array of [Callback URI input](#callback-uri-input-object) | No | Full replacement list of redirect URIs. Include `id` to keep or change an existing entry. To change one entry, prefer the redirect URI routes below. |
| `domain` | string | No | White-label domain for hosted sign-in. |
| `additional_settings` | object | No | [Additional settings](#additional-settings-object). Write-only: stored but never returned. |

**Response** `200`: `data` is the updated [Application](#application-object).

**Example**

```bash
curl -s -X PATCH "$WEFTLINE_URL/v3/applications" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "branding": { "name": "Acadpak", "website_url": "https://acadpak.com" },
    "additional_settings": { "rotate_refresh_token": true }
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "application_id": "app_4f1c2d",
    "organization_id": "org_19be07",
    "region": "us",
    "environment": "production",
    "branding": { "name": "Acadpak", "website_url": "https://acadpak.com" },
    "callback_uris": [
      { "id": "ruri_0c4e1a", "url": "https://acadpak.com/oauth/callback", "platform": "web" }
    ],
    "created_at": 1731000000,
    "updated_at": 1731655000
  }
}
```

## List redirect URIs

`GET /v3/applications/redirect-uris` · Release R1

Returns the redirect URIs registered for the application. Also served at `/v3/applications/callback-uris`.

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Redirect URI](#redirect-uri-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/applications/redirect-uris" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    { "id": "ruri_0c4e1a", "url": "https://acadpak.com/oauth/callback", "platform": "web" },
    {
      "id": "ruri_5d22f8",
      "url": "https://acadpak.com/oauth/js-callback",
      "platform": "js",
      "settings": { "origin": "https://acadpak.com" }
    }
  ]
}
```

## Create a redirect URI

`POST /v3/applications/redirect-uris` · Release R1

Registers a URL that [hosted sign-in](auth.md#start-hosted-sign-in) may redirect to. Also served at `/v3/applications/callback-uris`.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | The redirect URL. |
| `platform` | string | No | `web` \| `js` \| `ios` \| `android` \| `desktop`. Defaults to `web`. |
| `settings` | object | No | [Redirect URI settings](#redirect-uri-settings-object) for the platform. |

**Response** `200`: `data` is the new [Redirect URI](#redirect-uri-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/applications/redirect-uris" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://acadpak.com/oauth/js-callback", "platform": "js", "settings": { "origin": "https://acadpak.com" } }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "ruri_5d22f8",
    "url": "https://acadpak.com/oauth/js-callback",
    "platform": "js",
    "settings": { "origin": "https://acadpak.com" }
  }
}
```

## Get a redirect URI

`GET /v3/applications/redirect-uris/{redirect_uri_id}` · Release R1

Returns one redirect URI. Also served at `/v3/applications/callback-uris/{redirect_uri_id}`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `redirect_uri_id` | string | Redirect URI ID. |

**Response** `200`: `data` is a [Redirect URI](#redirect-uri-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/applications/redirect-uris/ruri_0c4e1a" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "ruri_0c4e1a", "url": "https://acadpak.com/oauth/callback", "platform": "web" }
}
```

## Update a redirect URI

`PATCH /v3/applications/redirect-uris/{redirect_uri_id}` · Release R1

Changes a redirect URI's URL, platform or settings. Also served at `/v3/applications/callback-uris/{redirect_uri_id}`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `redirect_uri_id` | string | Redirect URI ID. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | No | New redirect URL. |
| `platform` | string | No | `web` \| `js` \| `ios` \| `android` \| `desktop` |
| `settings` | object | No | [Redirect URI settings](#redirect-uri-settings-object). |

**Response** `200`: `data` is the updated [Redirect URI](#redirect-uri-object).

**Example**

```bash
curl -s -X PATCH "$WEFTLINE_URL/v3/applications/redirect-uris/ruri_0c4e1a" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://acadpak.com/auth/callback" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "ruri_0c4e1a", "url": "https://acadpak.com/auth/callback", "platform": "web" }
}
```

## Delete a redirect URI

`DELETE /v3/applications/redirect-uris/{redirect_uri_id}` · Release R1

Removes a redirect URI; sign-in requests naming it are rejected afterwards. Also served at `/v3/applications/callback-uris/{redirect_uri_id}`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `redirect_uri_id` | string | Redirect URI ID. |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/applications/redirect-uris/ruri_5d22f8" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Objects

### Application object

| Field | Type | Description |
| --- | --- | --- |
| `application_id` | string | Application ID. Use it as `client_id` in [hosted sign-in](auth.md#start-hosted-sign-in). |
| `organization_id` | string | ID of the organization that owns the application. |
| `region` | string | Region identifier, for example `us` or `eu`. Free-form. |
| `environment` | string | Environment identifier, for example `production` or `sandbox`. Free-form. |
| `branding` | object | [Branding](#branding-object): Name and public details of the application. |
| `domain` | string | White-label domain. Omitted when not set. |
| `hosted_authentication` | object | [Hosted authentication](#hosted-authentication-object): Appearance of the hosted sign-in pages. |
| `idp_settings` | object | [IdP settings](#idp-settings-object): Allowed origins and issuers. |
| `callback_uris` | array of [Redirect URI](#redirect-uri-object) | Registered redirect URIs. Read-only here; change them with the redirect URI routes or `callback_uris` on update. |
| `created_at` | integer | Creation time, Unix seconds. Omitted when not set. |
| `updated_at` | integer | Last update, Unix seconds. Omitted when not set. |
| `blocked` | boolean | `true` if the application is blocked. Omitted when not set. |

### Branding object

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Application name shown to users. Always present in responses. |
| `icon_url` | string | URL of the application icon. |
| `website_url` | string | Application or publisher website. |
| `description` | string | Short description of the application. |

### Hosted authentication object

| Field | Type | Description |
| --- | --- | --- |
| `background_image_url` | string | URL of the background image. |
| `alignment` | string | Alignment of the background image. |
| `color_primary` | string | Primary color. |
| `color_secondary` | string | Secondary color. |
| `title` | string | Page title. |
| `subtitle` | string | Page subtitle. |
| `background_color` | string | Background color. |
| `spacing` | integer | CSS spacing, in pixels. |
| `terms_of_service_url` | string | Link to your terms of service. |
| `privacy_policy_url` | string | Link to your privacy policy. |

### IdP settings object

| Field | Type | Description |
| --- | --- | --- |
| `origins` | string | Comma-separated allowed origins. Each is an absolute `https` URL (`http` only for `localhost` or `127.0.0.1`) with no path, query, fragment or user info. |
| `issuers` | string | Comma-separated allowed issuers. |

### Additional settings object

Write-only. Accepted by `PATCH /v3/applications`, never returned.

| Field | Type | Description |
| --- | --- | --- |
| `login_url` | string | Login URL. |
| `logout_url` | string | Logout URL. |
| `refresh_token_expiration_absolute` | integer | Maximum refresh-token lifetime, in seconds. |
| `refresh_token_expiration_idle` | integer | Refresh-token lifetime without use, in seconds. |
| `rotate_refresh_token` | boolean | `true` to issue a new refresh token each time one is used. |
| `allow_query_param_in_redirect_uri` | boolean | `true` to allow query strings in redirect URIs. |

### Callback URI input object

An element of `callback_uris` in `PATCH /v3/applications`.

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | ID of an existing entry to keep or change. Omit to add a new one. |
| `url` | string | Required. The redirect URL. |
| `platform` | string | `web` \| `js` \| `ios` \| `android` \| `desktop`. Defaults to `web`. |
| `settings` | object | [Redirect URI settings](#redirect-uri-settings-object): Platform settings. |

### Redirect URI object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Redirect URI ID. |
| `url` | string | The redirect URL. |
| `platform` | string | `web` \| `js` \| `ios` \| `android` \| `desktop` |
| `settings` | object | [Redirect URI settings](#redirect-uri-settings-object): Platform settings. |
| `deleted_at` | integer | When the entry was soft-deleted, Unix seconds. Omitted when not deleted. |

### Redirect URI settings object

| Field | Type | Description |
| --- | --- | --- |
| `origin` | string | `js` platform: the page origin allowed to start sign-in. |
| `bundle_id` | string | `ios` platform: app bundle ID. |
| `app_store_id` | string | `ios` platform: App Store ID. |
| `team_id` | string | `ios` platform: Apple developer team ID. |
| `package_name` | string | `android` platform: application package name. |
| `sha1_certificate_fingerprint` | string | `android` platform: SHA-1 fingerprint of the signing certificate. |
