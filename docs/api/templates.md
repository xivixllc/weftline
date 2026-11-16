# Templates

Store reusable email subjects and bodies with placeholders, at application or grant level, and render them with your own variables. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

> Provisional: request and response shapes in this file come from client code, not a published contract. Confirm them before relying on them.

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/templates` | List application templates | R3 |
| POST | `/v3/templates` | Create an application template | R3 |
| GET | `/v3/templates/{template_id}` | Get an application template | R3 |
| PUT | `/v3/templates/{template_id}` | Update an application template | R3 |
| DELETE | `/v3/templates/{template_id}` | Delete an application template | R3 |
| POST | `/v3/templates/{template_id}/render` | Render a stored application template | R3 |
| POST | `/v3/templates/render` | Render an inline template body | R3 |
| GET | `/v3/grants/{grant_id}/templates` | List grant templates | R3 |
| POST | `/v3/grants/{grant_id}/templates` | Create a grant template | R3 |
| GET | `/v3/grants/{grant_id}/templates/{template_id}` | Get a grant template | R3 |
| PUT | `/v3/grants/{grant_id}/templates/{template_id}` | Update a grant template | R3 |
| DELETE | `/v3/grants/{grant_id}/templates/{template_id}` | Delete a grant template | R3 |
| POST | `/v3/grants/{grant_id}/templates/{template_id}/render` | Render a stored grant template | R3 |
| POST | `/v3/grants/{grant_id}/templates/render` | Render an inline template body for a grant | R3 |

Every operation exists in two scopes with the same request and response shapes:

- **Application templates** live under `/v3/templates` and are shared by every grant in the application. Their `app_id` is set.
- **Grant templates** live under `/v3/grants/{grant_id}/templates` and belong to one connected account. Their `grant_id` is set.

Each section below shows both paths.

Placeholders use the syntax of the template's `engine`. With the default `mustache` engine a subject such as `Welcome {{student.first_name}}` reads `first_name` from the `student` object in `variables`. [Workflows](workflows.md) reference templates by `template_id`.

## List templates

`GET /v3/templates` · `GET /v3/grants/{grant_id}/templates` · Release R3

Returns one page of templates in the chosen scope.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `limit` | integer | Page size. See [pagination](README.md#pagination-and-field-selection). |
| `page_token` | string | `next_cursor` from the previous page. |

**Response** `200`: `data` is an array of [Template](#template-object), with `next_cursor` when more pages exist.

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/templates?limit=25" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "tpl_7c1e2a90",
      "app_id": "app_51f0c3",
      "engine": "mustache",
      "name": "Admission offer",
      "subject": "Your offer from Acadpak, {{student.first_name}}",
      "body": "<p>Hi {{student.first_name}}, your place on {{course}} is confirmed.</p>",
      "created_at": 1730000000,
      "updated_at": 1730000400,
      "object": "template"
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjI1fQ"
}
```

## Create a template

`POST /v3/templates` · `POST /v3/grants/{grant_id}/templates` · Release R3

Stores a new template in the chosen scope.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name. |
| `subject` | string | Yes | Subject line. May contain placeholders. |
| `body` | string | Yes | HTML body. May contain placeholders. |
| `engine` | string | No | Placeholder syntax: `handlebars` \| `mustache` \| `nunjucks` \| `twig`. Weftline uses `mustache` when omitted. |

**Response** `200`: `data` is a [Template](#template-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/templates" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Interview invite",
    "subject": "Interview for {{course}}",
    "body": "<p>Hi {{student.first_name}}, please pick a slot: {{booking_url}}</p>",
    "engine": "mustache"
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "tpl_3b9d44e1",
    "grant_id": "grt_9a8b7c6d",
    "app_id": null,
    "engine": "mustache",
    "name": "Interview invite",
    "subject": "Interview for {{course}}",
    "body": "<p>Hi {{student.first_name}}, please pick a slot: {{booking_url}}</p>",
    "created_at": 1730001000,
    "updated_at": 1730001000,
    "object": "template"
  }
}
```

## Get a template

`GET /v3/templates/{template_id}` · `GET /v3/grants/{grant_id}/templates/{template_id}` · Release R3

Returns one template. An unknown ID returns `404 not_found_error`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |
| `template_id` | string | Template ID. |

**Response** `200`: `data` is a [Template](#template-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/templates/tpl_7c1e2a90" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD...", "data": { "id": "tpl_7c1e2a90", "object": "template", "engine": "mustache", "name": "Admission offer" } }
```

## Update a template

`PUT /v3/templates/{template_id}` · `PUT /v3/grants/{grant_id}/templates/{template_id}` · Release R3

Changes only the fields you send. Fields you leave out keep their current values.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |
| `template_id` | string | Template ID. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New display name. |
| `subject` | string | No | New subject line. |
| `body` | string | No | New HTML body. |
| `engine` | string | No | `handlebars` \| `mustache` \| `nunjucks` \| `twig`. |

**Response** `200`: `data` is the updated [Template](#template-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/templates/tpl_3b9d44e1" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Interview invite (autumn intake)" }'
```

```json
{ "request_id": "req_01JD...", "data": { "id": "tpl_3b9d44e1", "name": "Interview invite (autumn intake)", "object": "template" } }
```

## Delete a template

`DELETE /v3/templates/{template_id}` · `DELETE /v3/grants/{grant_id}/templates/{template_id}` · Release R3

Removes the template.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |
| `template_id` | string | Template ID. |

**Response** `200`: the delete envelope, with no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/templates/tpl_7c1e2a90" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Render a stored template

`POST /v3/templates/{template_id}/render` · `POST /v3/grants/{grant_id}/templates/{template_id}/render` · Release R3

Fills a stored template's subject and body with the variables you pass and returns the result. Nothing is sent.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |
| `template_id` | string | Template ID. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `variables` | object | No | Values for the placeholders. Keys can nest; `{{student.first_name}}` reads `variables.student.first_name`. |
| `strict` | boolean | No | When `true`, a placeholder with no matching variable fails the request with `400 invalid_request_error`. v3 clients send `true` unless told otherwise. |

**Response** `200`: `data` is a [Render result](#render-result-object) with `subject` and `body`.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/templates/tpl_7c1e2a90/render" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "strict": true,
    "variables": { "student": { "first_name": "Amina" }, "course": "BSc Computing" }
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "subject": "Your offer from Acadpak, Amina",
    "body": "<p>Hi Amina, your place on BSc Computing is confirmed.</p>"
  }
}
```

## Render an inline template

`POST /v3/templates/render` · `POST /v3/grants/{grant_id}/templates/render` · Release R3

Renders a template body you send in the request, without storing it. Useful for previewing a draft before you create the template.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `body` | string | Yes | Template HTML to render. |
| `engine` | string | Yes | `handlebars` \| `mustache` \| `nunjucks` \| `twig`. |
| `variables` | object | No | Values for the placeholders. |
| `strict` | boolean | No | Fail on a placeholder with no matching variable, as above. |

**Response** `200`: `data` is a [Render result](#render-result-object) with `html`.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/templates/render" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "engine": "mustache",
    "body": "<p>Hi {{student.first_name}}</p>",
    "variables": { "student": { "first_name": "Amina" } }
  }'
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N", "data": { "html": "<p>Hi Amina</p>" } }
```

## Objects

### Template object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Template ID. |
| `object` | string | Always `template`. |
| `grant_id` | string | Owning grant. Set on grant templates only. |
| `app_id` | string | Owning application. Set on application templates; `null` on grant templates. |
| `engine` | string | Placeholder syntax: `handlebars` \| `mustache` \| `nunjucks` \| `twig`. |
| `name` | string | Display name. |
| `subject` | string | Subject line, with placeholders unrendered. |
| `body` | string | HTML body, with placeholders unrendered. |
| `created_at` | integer | Creation time, Unix seconds. |
| `updated_at` | integer | Last change, Unix seconds. |

### Render result object

An open object. v3 clients print the keys below when present and otherwise show the raw JSON.

| Field | Type | Description |
| --- | --- | --- |
| `subject` | string | Rendered subject. Returned when rendering a stored template. |
| `body` | string | Rendered HTML body. Returned when rendering a stored template. |
| `html` | string | Rendered HTML. Returned when rendering an inline body. |
