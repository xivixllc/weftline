# Workflows

Send a stored template automatically, after an optional delay, when a scheduling event happens, at application or grant level. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

> Provisional: request and response shapes in this file come from client code, not a published contract. Confirm them before relying on them.

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/workflows` | List application workflows | R5 |
| POST | `/v3/workflows` | Create an application workflow | R5 |
| GET | `/v3/workflows/{workflow_id}` | Get an application workflow | R5 |
| PUT | `/v3/workflows/{workflow_id}` | Update an application workflow | R5 |
| DELETE | `/v3/workflows/{workflow_id}` | Delete an application workflow | R5 |
| GET | `/v3/grants/{grant_id}/workflows` | List grant workflows | R5 |
| POST | `/v3/grants/{grant_id}/workflows` | Create a grant workflow | R5 |
| GET | `/v3/grants/{grant_id}/workflows/{workflow_id}` | Get a grant workflow | R5 |
| PUT | `/v3/grants/{grant_id}/workflows/{workflow_id}` | Update a grant workflow | R5 |
| DELETE | `/v3/grants/{grant_id}/workflows/{workflow_id}` | Delete a grant workflow | R5 |

A workflow has one trigger and one action. The trigger is a `trigger_event`; the action is sending the [template](templates.md) named by `template_id`, `delay` minutes later, from the optional `from` sender. Template variables are filled from the triggering event.

Every operation exists in two scopes with the same shapes: application workflows under `/v3/workflows`, and grant workflows under `/v3/grants/{grant_id}/workflows`. Each section below shows both paths.

## How triggers run in Weftline

Weftline's workflow engine runs on its internal event bus, the same stream that feeds webhooks. Trigger values are names from the webhook [event types](webhooks.md#event-types). v3 clients accept only these values:

| `trigger_event` | Fires when |
| --- | --- |
| `booking.created` | A booking is made. |
| `booking.pending` | A booking is waiting for confirmation. |
| `booking.rescheduled` | A booking moves to a new time. |
| `booking.cancelled` | A booking is cancelled. |
| `booking.reminder` | A reminder is due before a booking. |

Bookings come from the [scheduler](scheduler.md).

## List workflows

`GET /v3/workflows` · `GET /v3/grants/{grant_id}/workflows` · Release R5

Returns one page of workflows in the chosen scope.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `limit` | integer | Page size. See [pagination](README.md#pagination-and-field-selection). |
| `page_token` | string | `next_cursor` from the previous page. |

**Response** `200`: `data` is an array of [Workflow](#workflow-object), with `next_cursor` when more pages exist.

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/workflows?limit=10" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "wfl_5d20b7c3",
      "app_id": "app_51f0c3",
      "is_enabled": true,
      "name": "Interview confirmation",
      "trigger_event": "booking.created",
      "delay": 1,
      "template_id": "tpl_3b9d44e1",
      "from": { "name": "Acadpak Admissions", "email": "admissions@acadpak.com" },
      "date_created": 1730000000,
      "object": "workflow"
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjEwfQ"
}
```

## Create a workflow

`POST /v3/workflows` · `POST /v3/grants/{grant_id}/workflows` · Release R5

Creates a workflow in the chosen scope.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Display name. |
| `trigger_event` | string | Yes | `booking.cancelled` \| `booking.created` \| `booking.pending` \| `booking.reminder` \| `booking.rescheduled`. |
| `template_id` | string | Yes | [Template](templates.md#template-object) to send. |
| `delay` | integer | No | Minutes to wait after the trigger before sending. Omitted means no delay. |
| `is_enabled` | boolean | No | Whether the workflow runs. |
| `from` | [Workflow sender](#workflow-sender-object) | No | Sender name and address for the outgoing message. |

**Response** `200`: `data` is a [Workflow](#workflow-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/workflows" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Interview confirmation",
    "trigger_event": "booking.created",
    "template_id": "tpl_3b9d44e1",
    "delay": 1,
    "is_enabled": true,
    "from": { "name": "Acadpak Admissions", "email": "admissions@acadpak.com" }
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "wfl_5d20b7c3",
    "grant_id": "grt_9a8b7c6d",
    "is_enabled": true,
    "name": "Interview confirmation",
    "trigger_event": "booking.created",
    "delay": 1,
    "template_id": "tpl_3b9d44e1",
    "from": { "name": "Acadpak Admissions", "email": "admissions@acadpak.com" },
    "date_created": 1730000000,
    "object": "workflow"
  }
}
```

## Get a workflow

`GET /v3/workflows/{workflow_id}` · `GET /v3/grants/{grant_id}/workflows/{workflow_id}` · Release R5

Returns one workflow. An unknown ID returns `404 not_found_error`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |
| `workflow_id` | string | Workflow ID. |

**Response** `200`: `data` is a [Workflow](#workflow-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/workflows/wfl_5d20b7c3" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD...", "data": { "id": "wfl_5d20b7c3", "is_enabled": true, "trigger_event": "booking.created", "template_id": "tpl_3b9d44e1", "delay": 1 } }
```

## Update a workflow

`PUT /v3/workflows/{workflow_id}` · `PUT /v3/grants/{grant_id}/workflows/{workflow_id}` · Release R5

Changes only the fields you send. To pause a workflow without deleting it, send `{ "is_enabled": false }`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |
| `workflow_id` | string | Workflow ID. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New display name. |
| `trigger_event` | string | No | New trigger; same values as on create. |
| `template_id` | string | No | New template. |
| `delay` | integer | No | New delay in minutes. Send `0` to remove the delay. |
| `is_enabled` | boolean | No | Turn the workflow on or off. |
| `from` | [Workflow sender](#workflow-sender-object) | No | New sender. |

**Response** `200`: `data` is the updated [Workflow](#workflow-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/workflows/wfl_5d20b7c3" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Interview confirmation (delayed)", "delay": 5, "is_enabled": false }'
```

```json
{ "request_id": "req_01JD...", "data": { "id": "wfl_5d20b7c3", "name": "Interview confirmation (delayed)", "delay": 5, "is_enabled": false, "trigger_event": "booking.created", "template_id": "tpl_3b9d44e1" } }
```

## Delete a workflow

`DELETE /v3/workflows/{workflow_id}` · `DELETE /v3/grants/{grant_id}/workflows/{workflow_id}` · Release R5

Removes the workflow. The template it used is not deleted.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address. Grant scope only. |
| `workflow_id` | string | Workflow ID. |

**Response** `200`: the delete envelope, with no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/admissions@acadpak.com/workflows/wfl_5d20b7c3" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Objects

### Workflow object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Workflow ID. |
| `object` | string | Object type, `workflow`. |
| `grant_id` | string | Owning grant. Set on grant workflows only. |
| `app_id` | string | Owning application. Set on application workflows; `null` otherwise. |
| `is_enabled` | boolean | Whether the workflow runs. |
| `name` | string | Display name. |
| `trigger_event` | string | `booking.cancelled` \| `booking.created` \| `booking.pending` \| `booking.reminder` \| `booking.rescheduled`. |
| `delay` | integer | Minutes between the trigger and the send. |
| `template_id` | string | [Template](templates.md#template-object) that is sent. |
| `from` | [Workflow sender](#workflow-sender-object) | Sender for the outgoing message. Absent when not set. |
| `date_created` | integer | Creation time, Unix seconds. Workflows have no `updated_at`. |

### Workflow sender object

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Sender display name. |
| `email` | string | Sender address. |
