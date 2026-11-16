# Hosted sign-in, tokens and provider detection

These endpoints connect end-user accounts to your application, issue and inspect tokens, create grants from credentials you already hold, and guess a provider from an email address. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/connect/auth` | Start hosted sign-in (OAuth, PKCE or admin consent) | R1 |
| POST | `/v3/connect/token` | Exchange an authorization code, or refresh a token | R1 |
| GET | `/v3/connect/tokeninfo` | Inspect an access token or ID token | R1 |
| POST | `/v3/connect/revoke` | Revoke a token | R1 |
| POST | `/v3/connect/custom` | Create a grant from your own provider credentials | R1 |
| POST | `/v3/providers/detect` | Detect the provider for an email address | R1 |

## Sign-in flow

1. Your app sends the user's browser to `GET /v3/connect/auth` with your `client_id`, a registered `redirect_uri` and, optionally, a `provider`, `scope`, `state` and PKCE `code_challenge`.
2. Weftline shows its hosted sign-in page. If you passed `provider`, the user goes straight to that provider; otherwise they pick one.
3. The provider asks the user to consent to the requested scopes (or, for IMAP and similar providers, Weftline collects the server settings).
4. Weftline creates or re-authenticates the grant and redirects the browser to your `redirect_uri` with a one-time `code` and your original `state`.
5. Your server calls `POST /v3/connect/token` with the `code` (and the PKCE `code_verifier`, if you used one).
6. The response carries the `grant_id`, the account `email`, an `access_token` and, for `access_type=offline`, a `refresh_token`. Use the `grant_id` in `/v3/grants/{grant_id}/...` paths with your API key, or call grant-scoped routes with the access token.

## Start hosted sign-in

`GET /v3/connect/auth` · Release R1

Opened in the user's browser, not called from your server. Weftline validates the parameters and redirects to its hosted sign-in page. No `Authorization` header is sent.

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `client_id` | string | Required. Your application's ID (`application_id` in [applications.md](applications.md#application-object)). |
| `redirect_uri` | string | Required. Where to send the user afterwards. Must match a registered [redirect URI](applications.md#redirect-uri-object). |
| `response_type` | string | Required. `code` for normal sign-in, `adminconsent` for Microsoft admin consent (see [Admin consent](#admin-consent-and-service-accounts)). |
| `access_type` | string | `online` \| `offline`. `offline` also returns a `refresh_token` from the token exchange. The v3 SDK sends `online` when you don't choose. |
| `provider` | string | Skip the provider picker: `google` \| `microsoft` \| `imap` \| `icloud` \| `yahoo` \| `ews` \| `virtual-calendar` \| `zoom`. |
| `scope` | string | Space-separated provider scopes. When absent, the connector's default `scope` applies. |
| `include_grant_scopes` | boolean | `true` to include scopes the grant already holds in the new consent (incremental authorization). |
| `login_hint` | string | Prefills the sign-in address. If a grant already exists for that address, the flow re-authenticates it. |
| `prompt` | string | Controls the hosted picker: `select_provider` \| `detect` \| `select_provider,detect` \| `detect,select_provider`. |
| `state` | string | Opaque value returned unchanged on the redirect and stored on the grant. |
| `options` | string | `smtp_required` makes the user enter SMTP settings during IMAP sign-in, so sending works later. |
| `credential_id` | string | Use this [credential](connectors.md#credential-object) instead of the connector's `active_credential_id`. Required when `response_type=adminconsent`. |
| `code_challenge` | string | PKCE challenge. See below. |
| `code_challenge_method` | string | `s256` when `code_challenge` is sent. `S256` is accepted too. |

**PKCE.** The v3 SDK generates a random verifier (a UUID string), computes the SHA-256 digest of it as a lowercase **hex** string, Base64-encodes that hex string, and strips trailing `=`. The result is `code_challenge`. Keep the verifier and send it as `code_verifier` to `POST /v3/connect/token`. Weftline recomputes the challenge the same way.

**Response** `302`: a redirect to the hosted sign-in page. After sign-in, Weftline redirects to `redirect_uri` with `code` and `state` query parameters.

**Example**

```text
https://weftline.acadpak.com/v3/connect/auth?client_id=app_4f1c2d&redirect_uri=https%3A%2F%2Facadpak.com%2Foauth%2Fcallback&access_type=offline&response_type=code&provider=google&login_hint=student%40acadpak.com&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly&state=xyz123&code_challenge_method=s256&code_challenge=ZjM2MWU5...
```

After consent the browser lands on:

```text
https://acadpak.com/oauth/callback?code=c_9a8b7c6d5e&state=xyz123
```

## Admin consent and service accounts

Two flows let an organization's administrator connect accounts without each user signing in.

- **Microsoft admin consent.** Create a credential with `credential_type` `adminconsent` under the `microsoft` connector ([connectors.md](connectors.md#create-a-credential)). Then send the administrator to `GET /v3/connect/auth` with `provider=microsoft`, `response_type=adminconsent` and `credential_id` set to that credential. All other query parameters work as above.
- **Google service accounts.** Create a credential with `credential_type` `serviceaccount` under the `google` connector, holding the service account's key. Grants can then be created through [custom authentication](#create-a-grant-with-custom-authentication) with that `credential_id` in `settings`.

Weftline service-account request signing for admin endpoints is a separate mechanism; see [admin.md](admin.md#signed-requests).

## Exchange a code or refresh a token

`POST /v3/connect/token` · Release R1

Swaps an authorization code for tokens, or a refresh token for a new access token. `client_secret` authenticates the call; if you leave it out, Weftline uses the API key in the `Authorization` header instead. Errors use the OAuth format described in the [API README](README.md#errors).

**Request body** (JSON), authorization code

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `grant_type` | string | Yes | `authorization_code` |
| `code` | string | Yes | The `code` from the redirect. Single use. |
| `redirect_uri` | string | Yes | The same `redirect_uri` used to start sign-in. |
| `client_id` | string | Yes | Your application ID. |
| `client_secret` | string | No | Your API key. Defaults to the bearer API key. |
| `code_verifier` | string | No | The PKCE verifier. Required if sign-in sent `code_challenge`. |

**Request body** (JSON), refresh token

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `grant_type` | string | Yes | `refresh_token` |
| `refresh_token` | string | Yes | A refresh token from an earlier exchange. |
| `redirect_uri` | string | Yes | The `redirect_uri` used when the token was first issued. |
| `client_id` | string | Yes | Your application ID. |
| `client_secret` | string | No | Your API key. Defaults to the bearer API key. |

**Response** `200`: a [Token response](#token-response-object) at the top level, with no `request_id`/`data` envelope.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/connect/token" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "c_9a8b7c6d5e",
    "redirect_uri": "https://acadpak.com/oauth/callback",
    "client_id": "app_4f1c2d",
    "code_verifier": "3f0c6a52-6d0e-4a8e-9a57-1b9b0c2d7e41"
  }'
```

```json
{
  "access_token": "wl_at_5b2e...",
  "refresh_token": "wl_rt_c41d...",
  "grant_id": "grt_7d3a1c9e",
  "email": "student@acadpak.com",
  "expires_in": 3600,
  "scope": "https://www.googleapis.com/auth/gmail.readonly",
  "id_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "provider": "google"
}
```

## Get token info

`GET /v3/connect/tokeninfo` · Release R1

Decodes and validates a token Weftline issued. Send exactly one of the two query parameters.

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `access_token` | string | A grant access token to inspect. |
| `id_token` | string | An ID token from the token exchange to inspect. |

**Response** `200`: `data` is a [Token info](#token-info-object) object.

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/connect/tokeninfo?access_token=wl_at_5b2e..." \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "iss": "https://weftline.acadpak.com",
    "aud": "app_4f1c2d",
    "iat": 1731650000,
    "exp": 1731653600,
    "sub": "grt_7d3a1c9e",
    "email": "student@acadpak.com"
  }
}
```

## Revoke a token

`POST /v3/connect/revoke` · Release R1

Revokes a grant access token so it can no longer be used. The token goes in the query string, not the body.

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `token` | string | Required. The token to revoke. |

**Response** `200`: no `data`. Errors use the OAuth format described in the [API README](README.md#errors).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/connect/revoke?token=wl_at_5b2e..." \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Create a grant with custom authentication

`POST /v3/connect/custom` · Release R1

Creates a grant directly from credentials you already hold (a provider refresh token, IMAP login, app password), skipping the hosted pages. Also provisions Weftline agent mailboxes.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `provider` | string | Yes | `google` \| `microsoft` \| `imap` \| `icloud` \| `yahoo` \| `ews` \| `virtual-calendar` \| `zoom` | `weftline` (agent mailboxes; the legacy v3 provider value is also accepted). |
| `settings` | object | Yes | Provider-specific settings. See the settings objects below. |
| `state` | string | No | Opaque value stored on the grant. |
| `scope` | array of string | No | Scopes to request. Defaults to the connector's `scope`. Not used for agent mailboxes. |
| `name` | string | No | Display name stored on the grant. |
| `workspace_id` | string | No | Agent mailboxes only: the workspace to place the mailbox in (see [admin.md](admin.md)). |

Settings by provider:

| Provider | Settings object |
| --- | --- |
| `google`, `microsoft` | [OAuth refresh-token settings](#oauth-refresh-token-settings-object) |
| `imap`, `yahoo` | [IMAP settings](#imap-settings-object) |
| `icloud` | [iCloud settings](#icloud-settings-object) |
| `virtual-calendar` | [Virtual calendar settings](#virtual-calendar-settings-object) |
| agent mailbox | [Agent mailbox settings](#agent-mailbox-settings-object) |
| `ews`, `zoom` | No settings shape is defined yet. |

**Response** `200`: `data` is a [Grant](grants.md#grant-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/connect/custom" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "imap",
    "settings": {
      "imap_username": "student@acadpak.com",
      "imap_password": "app-password-here",
      "imap_host": "imap.acadpak.com",
      "imap_port": 993,
      "smtp_host": "smtp.acadpak.com",
      "smtp_port": 465
    },
    "state": "signup-42"
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "grt_2c9e5f10",
    "provider": "imap",
    "grant_status": "valid",
    "email": "student@acadpak.com",
    "scope": [],
    "state": "signup-42",
    "created_at": 1731650000,
    "updated_at": 1731650000
  }
}
```

## Detect a provider

`POST /v3/providers/detect` · Release R1

Guesses which provider hosts an email address, for example to pre-select `provider` before sign-in. Parameters go in the query string; there is no body.

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `email` | string | Required. The address to check. |
| `all_provider_types` | boolean | `true` to match against every provider, not only those with a connector in your application. Default `false`. |

**Response** `200`: `data` is a [Provider detection](#provider-detection-object) object.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/providers/detect?email=student%40acadpak.com&all_provider_types=true" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "email_address": "student@acadpak.com",
    "detected": true,
    "provider": "google",
    "type": "google"
  }
}
```

## Objects

### Token response object

| Field | Type | Description |
| --- | --- | --- |
| `access_token` | string | Grant access token. Use it as a bearer token for that grant. |
| `grant_id` | string | ID of the grant created or re-authenticated. |
| `email` | string | Email address of the grant. |
| `expires_in` | integer | Seconds until `access_token` expires. |
| `scope` | string | Space-separated scopes held by the token. |
| `refresh_token` | string | Present only when sign-in used `access_type=offline`, and on refresh. |
| `id_token` | string | Signed JWT with the user's identity. Inspect it with [`GET /v3/connect/tokeninfo`](#get-token-info). |
| `token_type` | string | Always `Bearer`. |
| `provider` | string | Provider the grant belongs to, for example `google`. |

### Token info object

| Field | Type | Description |
| --- | --- | --- |
| `iss` | string | Token issuer. |
| `aud` | string | Token audience. |
| `iat` | integer | Issued-at time, Unix seconds. |
| `exp` | integer | Expiry time, Unix seconds. |
| `sub` | string | Token subject. |
| `email` | string | Email address of the grant the token belongs to. |

### Provider detection object

| Field | Type | Description |
| --- | --- | --- |
| `email_address` | string | The address that was checked. |
| `detected` | boolean | Whether a provider was found. |
| `provider` | string | The detected provider, when `detected` is `true`. |
| `type` | string | For IMAP hosts, the specific IMAP provider found. |

### OAuth refresh-token settings object

Used with `provider` `google` or `microsoft`.

| Field | Type | Description |
| --- | --- | --- |
| `refresh_token` | string | The provider's OAuth refresh token for the user. |
| `credential_id` | string | Optional [credential](connectors.md#credential-object) whose client ID and secret issued the refresh token. Defaults to the connector's `active_credential_id`. |

### IMAP settings object

Used with `provider` `imap`. For Yahoo, send `provider` `imap` with `type` `yahoo`, or `provider` `yahoo`.

| Field | Type | Description |
| --- | --- | --- |
| `imap_username` | string | IMAP login, usually the email address. |
| `imap_password` | string | IMAP password or app password. |
| `imap_host` | string | IMAP server host name. |
| `imap_port` | integer | IMAP server port, usually `993`. |
| `smtp_host` | string | SMTP server host name. Needed to send mail. |
| `smtp_port` | integer | SMTP server port, usually `465`. |
| `type` | string | Known IMAP provider, for example `yahoo`. |

### iCloud settings object

Used with `provider` `icloud`.

| Field | Type | Description |
| --- | --- | --- |
| `username` | string | iCloud email address. |
| `password` | string | App-specific password. |

### Virtual calendar settings object

Used with `provider` `virtual-calendar`, typically with `scope` `["calendar"]`.

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Identifier for the virtual calendar account, in email-address form. |

### Agent mailbox settings object

Used when provisioning a Weftline agent mailbox.

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Required. The mailbox address, on a domain registered in [admin.md](admin.md). |
| `policy_id` | string | Policy to apply to the mailbox. |
| `app_password` | string | Password for IMAP and SMTP-submission access to the mailbox. |
