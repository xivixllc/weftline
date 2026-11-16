# Webhooks

Webhooks and Pub/Sub channels push a notification to you when something changes in a grant, so you don't have to poll. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/webhooks` | List webhooks | R1 |
| GET | `/v3/webhooks/{webhook_id}` | Get a webhook | R1 |
| POST | `/v3/webhooks` | Create a webhook | R1 |
| PUT | `/v3/webhooks/{webhook_id}` | Update a webhook | R1 |
| DELETE | `/v3/webhooks/{webhook_id}` | Delete a webhook | R1 |
| POST | `/v3/webhooks/rotate-secret/{webhook_id}` | Rotate a webhook secret | R1 |
| GET | `/v3/webhooks/ip-addresses` | List webhook source IP addresses | R1 |
| POST | `/v3/webhooks/mock-payload` | Get a mock payload | R1 |
| POST | `/v3/webhooks/send-test-event` | Send a test event | R1 |
| GET | `/v3/channels/pubsub` | List Pub/Sub channels | R2 |
| GET | `/v3/channels/pubsub/{channel_id}` | Get a Pub/Sub channel | R2 |
| POST | `/v3/channels/pubsub` | Create a Pub/Sub channel | R2 |
| PUT | `/v3/channels/pubsub/{channel_id}` | Update a Pub/Sub channel | R2 |
| DELETE | `/v3/channels/pubsub/{channel_id}` | Delete a Pub/Sub channel | R2 |

All routes on this page use the application API key. Webhooks belong to the application, not to a grant.

## List webhooks

`GET /v3/webhooks` · Release R1

Returns every webhook destination registered for the application. The secret is never included.

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Webhook](#webhook-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/webhooks" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "wh_7c1e9a2f4b6d",
      "description": "Production inbox sync",
      "trigger_types": ["message.created", "grant.expired"],
      "webhook_url": "https://acadpak.com/api/weftline/webhook",
      "status": "active",
      "notification_email_addresses": ["ops@acadpak.com"],
      "status_updated_at": 1763164800,
      "created_at": 1763164800,
      "updated_at": 1763164800
    }
  ]
}
```

## Get a webhook

`GET /v3/webhooks/{webhook_id}` · Release R1

Returns one webhook destination. The secret is not included.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `webhook_id` | string | The webhook's ID |

**Response** `200`: `data` is a [Webhook](#webhook-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/webhooks/wh_7c1e9a2f4b6d" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "wh_7c1e9a2f4b6d",
    "description": "Production inbox sync",
    "trigger_types": ["message.created", "grant.expired"],
    "webhook_url": "https://acadpak.com/api/weftline/webhook",
    "status": "active",
    "notification_email_addresses": ["ops@acadpak.com"],
    "status_updated_at": 1763164800,
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Create a webhook

`POST /v3/webhooks` · Release R1

Registers a destination URL for a set of triggers. Before saving, Weftline checks the URL with the [challenge handshake](#endpoint-challenge), so the receiver must already be running. The response is the only time, apart from [rotation](#rotate-a-webhook-secret), that the signing secret is returned: store it.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `trigger_types` | array of string | Yes | Events to deliver. Values from [Event types](#event-types) |
| `webhook_url` | string | Yes | HTTPS URL that receives notifications |
| `description` | string | No | Free-text label |
| `notification_email_addresses` | array of string | No | Addresses to warn when deliveries keep failing |

**Response** `200`: `data` is a [Webhook](#webhook-object) including `webhook_secret`.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/webhooks" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger_types": ["message.created", "grant.expired"],
    "webhook_url": "https://acadpak.com/api/weftline/webhook",
    "description": "Production inbox sync",
    "notification_email_addresses": ["ops@acadpak.com"]
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "wh_7c1e9a2f4b6d",
    "description": "Production inbox sync",
    "trigger_types": ["message.created", "grant.expired"],
    "webhook_url": "https://acadpak.com/api/weftline/webhook",
    "webhook_secret": "3f9a1c7e5b2d8f0a6c4e1b9d7f3a5c8e",
    "status": "active",
    "notification_email_addresses": ["ops@acadpak.com"],
    "status_updated_at": 1763164800,
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Update a webhook

`PUT /v3/webhooks/{webhook_id}` · Release R1

Changes any of the destination's settings. Omitted fields keep their current values.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `webhook_id` | string | The webhook's ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `trigger_types` | array of string | No | Replaces the trigger list |
| `webhook_url` | string | No | New destination URL |
| `description` | string | No | Free-text label |
| `notification_email_addresses` | array of string | No | Replaces the warning addresses |
| `status` | string | No | Provisional, sent only by the v3 CLI: `active` \| `inactive`, to resume or pause deliveries |

**Response** `200`: `data` is a [Webhook](#webhook-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/webhooks/wh_7c1e9a2f4b6d" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "trigger_types": ["message.created", "message.updated", "grant.expired"] }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "wh_7c1e9a2f4b6d",
    "description": "Production inbox sync",
    "trigger_types": ["message.created", "message.updated", "grant.expired"],
    "webhook_url": "https://acadpak.com/api/weftline/webhook",
    "status": "active",
    "notification_email_addresses": ["ops@acadpak.com"],
    "status_updated_at": 1763164800,
    "created_at": 1763164800,
    "updated_at": 1763168400
  }
}
```

## Delete a webhook

`DELETE /v3/webhooks/{webhook_id}` · Release R1

Removes the destination. Deliveries already in flight may still arrive.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `webhook_id` | string | The webhook's ID |

**Response** `200`: `data` is an object with `status` set to `success`. Unlike most deletes, this response carries `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/webhooks/wh_7c1e9a2f4b6d" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N", "data": { "status": "success" } }
```

## Rotate a webhook secret

`POST /v3/webhooks/rotate-secret/{webhook_id}` · Release R1

Issues a new signing secret. Notifications are signed with the new secret from then on, so update your receiver straight away. Send an empty JSON object as the body. Weftline also accepts `PUT /v3/webhooks/{webhook_id}/rotate-secret`, which some v3 clients send.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `webhook_id` | string | The webhook's ID |

**Response** `200`: `data` is a [Webhook](#webhook-object) including the new `webhook_secret`.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/webhooks/rotate-secret/wh_7c1e9a2f4b6d" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "wh_7c1e9a2f4b6d",
    "description": "Production inbox sync",
    "trigger_types": ["message.created", "grant.expired"],
    "webhook_url": "https://acadpak.com/api/weftline/webhook",
    "webhook_secret": "8b2e6f0a4c9d1e7f3a5b8c2d6e0f4a9b",
    "status": "active",
    "notification_email_addresses": ["ops@acadpak.com"],
    "status_updated_at": 1763164800,
    "created_at": 1763164800,
    "updated_at": 1763172000
  }
}
```

## List webhook source IP addresses

`GET /v3/webhooks/ip-addresses` · Release R1

Returns the addresses Weftline sends notifications from. On Vercel, outbound IPs aren't fixed unless the team buys static IPs, so this list may be empty or change without notice. Receivers should [verify signatures](#verifying-signatures) rather than allow-list IPs.

**Response** `200`: `data` is an [IP address list](#ip-address-list-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/webhooks/ip-addresses" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "ip_addresses": ["203.0.113.10", "203.0.113.11"], "updated_at": 1763164800 }
}
```

## Get a mock payload

`POST /v3/webhooks/mock-payload` · Release R1

> Provisional: this shape comes from client code, not a published contract.

Returns a sample notification for one trigger so you can test a parser without waiting for a real event. Nothing is delivered.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `trigger_type` | string | Yes | One value from [Event types](#event-types) |

**Response** `200`: the body is the sample [notification](#payload) itself (`specversion`, `type`, `source`, `id`, `data`). The v3 CLI reads it as a plain JSON object.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/webhooks/mock-payload" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "trigger_type": "message.created" }'
```

```json
{
  "specversion": "1.0",
  "type": "message.created",
  "source": "/weftline/mock",
  "id": "evt_mock_01JD3K7Q9V",
  "data": { "object": { "id": "msg_mock_8f2c" } }
}
```

## Send a test event

`POST /v3/webhooks/send-test-event` · Release R1

> Provisional: this shape comes from client code, not a published contract.

Delivers one signed test notification to a URL so you can check the receiver end to end.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `webhook_url` | string | Yes | URL to send the test notification to |

**Response** `200` or `204`: no `data`.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/webhooks/send-test-event" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "webhook_url": "https://acadpak.com/api/weftline/webhook" }'
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## List Pub/Sub channels

`GET /v3/channels/pubsub` · Release R2

> Provisional: this shape comes from client code, not a published contract.

Returns the application's Pub/Sub channels. A channel delivers notifications for its triggers to a Google Cloud Pub/Sub topic instead of an HTTPS URL, which suits high-volume consumers.

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Pub/Sub channel](#pubsub-channel-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/channels/pubsub" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "psc_4d8a2b6e",
      "description": "Mail events to analytics",
      "trigger_types": ["message.created"],
      "topic": "projects/acadpak-prod/topics/weftline-events",
      "status": "active",
      "notification_email_addresses": ["ops@acadpak.com"],
      "created_at": 1763164800,
      "updated_at": 1763164800
    }
  ]
}
```

## Get a Pub/Sub channel

`GET /v3/channels/pubsub/{channel_id}` · Release R2

> Provisional: this shape comes from client code, not a published contract.

Returns one Pub/Sub channel.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `channel_id` | string | The channel's ID |

**Response** `200`: `data` is a [Pub/Sub channel](#pubsub-channel-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/channels/pubsub/psc_4d8a2b6e" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "psc_4d8a2b6e",
    "description": "Mail events to analytics",
    "trigger_types": ["message.created"],
    "topic": "projects/acadpak-prod/topics/weftline-events",
    "status": "active",
    "notification_email_addresses": ["ops@acadpak.com"],
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Create a Pub/Sub channel

`POST /v3/channels/pubsub` · Release R2

> Provisional: this shape comes from client code, not a published contract.

Creates a channel that publishes notifications for the given triggers to a Pub/Sub topic.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `trigger_types` | array of string | Yes | Events to publish. Values from [Event types](#event-types) |
| `topic` | string | Yes | Full topic path, `projects/<project_id>/topics/<topic_id>` |
| `description` | string | No | Free-text label |
| `encryption_key` | string | No | Encryption key identifier |
| `notification_email_addresses` | array of string | No | Addresses to warn when publishing keeps failing |

**Response** `200`: `data` is a [Pub/Sub channel](#pubsub-channel-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/channels/pubsub" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger_types": ["message.created"],
    "topic": "projects/acadpak-prod/topics/weftline-events",
    "description": "Mail events to analytics"
  }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "psc_4d8a2b6e",
    "description": "Mail events to analytics",
    "trigger_types": ["message.created"],
    "topic": "projects/acadpak-prod/topics/weftline-events",
    "status": "active",
    "created_at": 1763164800,
    "updated_at": 1763164800
  }
}
```

## Update a Pub/Sub channel

`PUT /v3/channels/pubsub/{channel_id}` · Release R2

> Provisional: this shape comes from client code, not a published contract.

Changes a channel's settings or pauses it. Omitted fields keep their current values.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `channel_id` | string | The channel's ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `trigger_types` | array of string | No | Replaces the trigger list |
| `topic` | string | No | New topic path, `projects/<project_id>/topics/<topic_id>` |
| `description` | string | No | Free-text label |
| `encryption_key` | string | No | Encryption key identifier |
| `notification_email_addresses` | array of string | No | Replaces the warning addresses |
| `status` | string | No | `active` \| `inactive` |

**Response** `200`: `data` is a [Pub/Sub channel](#pubsub-channel-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/channels/pubsub/psc_4d8a2b6e" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "inactive" }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "id": "psc_4d8a2b6e",
    "description": "Mail events to analytics",
    "trigger_types": ["message.created"],
    "topic": "projects/acadpak-prod/topics/weftline-events",
    "status": "inactive",
    "created_at": 1763164800,
    "updated_at": 1763168400
  }
}
```

## Delete a Pub/Sub channel

`DELETE /v3/channels/pubsub/{channel_id}` · Release R2

> Provisional: this shape comes from client code, not a published contract.

Removes the channel. Nothing more is published to its topic.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `channel_id` | string | The channel's ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/channels/pubsub/psc_4d8a2b6e" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Event types

These are the values accepted in `trigger_types`. The notification's `type` field carries the same value. A linked object type is the same object the REST API returns. An unlinked name is an event record the v3 clients don't model, so its fields aren't part of this contract yet: read the IDs you need and fetch related objects through the API.

| Trigger | Fires when | `data.object` | Release |
| --- | --- | --- | --- |
| `grant.created` | A grant is connected | [Grant](grants.md#grant-object) | R1 |
| `grant.updated` | A grant's settings or scopes change, or it is re-authenticated | [Grant](grants.md#grant-object) | R1 |
| `grant.deleted` | A grant is deleted | [Grant](grants.md#grant-object) | R1 |
| `grant.expired` | The provider credentials stop working and the grant needs re-authentication | [Grant](grants.md#grant-object) | R1 |
| `grant.imap_sync_completed` | The first full sync of an IMAP grant finishes | [Grant](grants.md#grant-object) | R1 |
| `message.created` | A message arrives or is sent in a grant | [Message](messages.md#message-object) | R1 |
| `message.created.truncated` | As `message.created`, but the object is too large to send whole | [Message](messages.md#message-object), body fields dropped | R1 |
| `message.created.cleaned` | As `message.created`, with the message text cleaned | [Message](messages.md#message-object), cleaned text in `conversation` | R5 |
| `message.updated` | A message changes (flags, folders, labels) | [Message](messages.md#message-object) | R1 |
| `message.updated.truncated` | As `message.updated`, but the object is too large to send whole | [Message](messages.md#message-object), body fields dropped | R1 |
| `message.deleted` | A message is deleted | [Message](messages.md#message-object) | R1 |
| `message.send_success` | A scheduled message is sent | [Message](messages.md#message-object) | R1 |
| `message.send_failed` | A scheduled message fails to send | [Message](messages.md#message-object) | R1 |
| `message.bounce_detected` | A bounce notice for a sent message is detected | Bounce record | R3 |
| `message.opened` | A recipient opens a tracked message | Tracking record | R3 |
| `message.opened.legacy` | As `message.opened`, in the older tracking payload layout | Tracking record | R1 |
| `message.link_clicked` | A recipient clicks a tracked link | Tracking record | R3 |
| `message.link_clicked.legacy` | As `message.link_clicked`, in the older tracking payload layout | Tracking record | R1 |
| `thread.replied` | Someone replies to a tracked thread | Tracking record | R3 |
| `thread.replied.legacy` | As `thread.replied`, in the older tracking payload layout | Tracking record | R1 |
| `message.delivered` | An agent mailbox's outbound message is accepted by the recipient's server | Delivery record | R3 |
| `message.bounced` | An agent mailbox's outbound message bounces | Delivery record | R3 |
| `message.complaint` | A recipient reports an agent mailbox's message as spam | Delivery record | R3 |
| `message.rejected` | An agent mailbox's outbound message is refused before sending | Delivery record | R3 |
| `message.transactional.delivered` | A domain-send message is accepted by the recipient's server | Delivery record | R3 |
| `message.transactional.bounced` | A domain-send message bounces | Delivery record | R3 |
| `message.transactional.complaint` | A recipient reports a domain-send message as spam | Delivery record | R3 |
| `message.transactional.rejected` | A domain-send message is refused before sending | Delivery record | R3 |
| `message.intelligence.order` | Order details are extracted from an incoming message | Extracted order | R5 |
| `message.intelligence.tracking` | Shipment tracking details are extracted from an incoming message | Extracted shipment | R5 |
| `folder.created` | A folder or label is created | [Folder](folders.md#folder-object) | R1 |
| `folder.updated` | A folder or label changes | [Folder](folders.md#folder-object) | R1 |
| `folder.deleted` | A folder or label is deleted | [Folder](folders.md#folder-object) | R1 |
| `calendar.created` | A calendar is created | [Calendar](calendars.md#calendar-object) | R2 |
| `calendar.updated` | A calendar changes | [Calendar](calendars.md#calendar-object) | R2 |
| `calendar.deleted` | A calendar is deleted | [Calendar](calendars.md#calendar-object) | R2 |
| `event.created` | An event is created | [Event](events.md#event-object) | R2 |
| `event.updated` | An event changes, including RSVPs | [Event](events.md#event-object) | R2 |
| `event.deleted` | An event is deleted or cancelled | [Event](events.md#event-object) | R2 |
| `contact.updated` | A contact is created or changes (there is no `contact.created`) | [Contact](contacts.md#contact-object) | R2 |
| `contact.deleted` | A contact is deleted | [Contact](contacts.md#contact-object) | R2 |
| `booking.created` | A scheduler booking is confirmed | [Booking](scheduler.md#booking-object) | R3 |
| `booking.pending` | A booking awaits organizer confirmation | [Booking](scheduler.md#booking-object) | R3 |
| `booking.rescheduled` | A booking moves to a new time | [Booking](scheduler.md#booking-object) | R3 |
| `booking.cancelled` | A booking is cancelled | [Booking](scheduler.md#booking-object) | R3 |
| `booking.reminder` | A booking reminder with type `webhook` comes due | [Booking](scheduler.md#booking-object) | R3 |
| `notetaker.created` | A notetaker is scheduled | [Notetaker](notetakers.md#notetaker-object) | R4 |
| `notetaker.updated` | A notetaker's settings or status change | [Notetaker](notetakers.md#notetaker-object) | R4 |
| `notetaker.deleted` | A notetaker is cancelled or deleted | [Notetaker](notetakers.md#notetaker-object) | R4 |
| `notetaker.meeting_state` | The notetaker joins, waits in, or leaves the meeting | [Notetaker](notetakers.md#notetaker-object) | R4 |
| `notetaker.media` | Recording or transcript files are ready to download | [Notetaker](notetakers.md#notetaker-object) | R4 |

Contact triggers depend on the provider: iCloud supports both, Yahoo supports neither (even for changes made through Weftline).

## Payload

Each delivery is a `POST` with a JSON body laid out as a CloudEvents-style envelope. The v3 clients read these fields:

| Field | Type | Description |
| --- | --- | --- |
| `specversion` | string | Envelope version, `1.0` |
| `type` | string | The trigger, one value from [Event types](#event-types) |
| `source` | string | Where the event came from |
| `id` | string | Unique event ID. Retries of the same event reuse it |
| `time` | string | When the event happened, as an RFC 3339 timestamp. Optional |
| `data` | object | Holds the changed object |
| `data.object` | object | The object named in [Event types](#event-types). Per-grant objects carry `grant_id` |

```json
{
  "specversion": "1.0",
  "type": "message.created",
  "source": "/weftline/grants",
  "id": "evt_01JD3M2A7B9C4D6E8F0G1H2J3K",
  "time": "2026-11-15T09:30:00Z",
  "data": {
    "object": {
      "id": "msg_8f2c41d7",
      "object": "message",
      "grant_id": "grt_5b1e9c3a",
      "subject": "Quarterly report",
      "date": 1763199000
    }
  }
}
```

### `.truncated` variants

When the object would push the request body past the size Weftline delivers, Weftline sends `message.created.truncated` or `message.updated.truncated` instead of the plain trigger. The object keeps its IDs and headers but drops the body fields. Fetch the full message by ID with [`GET /v3/grants/{grant_id}/messages/{message_id}`](messages.md). Subscribe to the plain trigger and the `.truncated` trigger together, or you'll miss large messages.

### `.cleaned` variants

`message.created.cleaned` delivers the new message with its text already cleaned (quoted replies, signatures and markup removed), in the same form as the [message cleaning endpoint](messages.md) returns, with the cleaned text in `conversation`. Subscribe to it instead of `message.created` when you only need the readable text.

## Verifying signatures

Every delivery carries `X-Weftline-Signature`: the lowercase hex HMAC-SHA256 of the **raw** request body, keyed with the webhook's secret. Compute the same digest over the exact bytes you received, before any JSON parsing, and compare with a constant-time function. Reject the request with `401` if the header is missing and `403` if it doesn't match. Some receivers also accept a `sha256=` prefix on the header value; Weftline doesn't send one. See [the API README](README.md#webhook-signatures) for `WEFTLINE_LEGACY_HEADERS`.

Node.js (Express):

```js
import crypto from 'node:crypto';
import express from 'express';

const app = express();
const secret = process.env.WEFTLINE_WEBHOOK_SECRET;

app.post('/api/weftline/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const received = Buffer.from(req.get('X-Weftline-Signature') ?? '', 'utf8');
  const expected = Buffer.from(
    crypto.createHmac('sha256', secret).update(req.body).digest('hex'),
    'utf8',
  );
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return res.sendStatus(403);
  }
  const event = JSON.parse(req.body.toString('utf8'));
  res.sendStatus(200); // answer fast, then process
  queueEvent(event);
});
```

Python (Flask):

```python
import hashlib
import hmac
import os

from flask import Flask, abort, request

app = Flask(__name__)
SECRET = os.environ["WEFTLINE_WEBHOOK_SECRET"].encode()

@app.post("/api/weftline/webhook")
def weftline_webhook():
    raw = request.get_data()  # raw bytes, before JSON parsing
    expected = hmac.new(SECRET, raw, hashlib.sha256).hexdigest()
    received = request.headers.get("X-Weftline-Signature", "")
    if not hmac.compare_digest(received, expected):
        abort(403)
    queue_event(request.get_json())
    return "", 200
```

## Delivery and retries

- Return any `2xx` within **10 seconds**. Do slow work after you answer, from a queue.
- Weftline retries every non-`2xx` response, timeout or connection error, waiting longer between each attempt. A destination that keeps failing moves to `failing` and then `failed`, and the addresses in `notification_email_addresses` are warned.
- Retries and rare duplicates reuse the event `id`. Record the IDs you've processed and skip repeats.
- Events can arrive out of order. When order matters, fetch the current object by ID rather than trusting the payload.

### Endpoint challenge

When you create a webhook, Weftline first sends a `GET` to the URL with a `challenge` query parameter. Answer `200` with the parameter's value, unchanged, as the plain-text body, within 10 seconds. Until it answers correctly the webhook is not created.

```http
GET /api/weftline/webhook?challenge=a1b2c3d4e5 HTTP/1.1
Host: acadpak.com
```

```http
HTTP/1.1 200 OK
Content-Type: text/plain

a1b2c3d4e5
```

## Objects

### Webhook object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The webhook's ID |
| `description` | string | Free-text label. Optional |
| `trigger_types` | array of string | Subscribed triggers, from [Event types](#event-types) |
| `webhook_url` | string | Destination URL |
| `webhook_secret` | string | Signing secret. Returned only by create and rotate |
| `status` | string | `active` \| `failing` \| `failed` \| `pause` |
| `notification_email_addresses` | array of string | Addresses warned when deliveries keep failing |
| `status_updated_at` | integer | When `status` last changed, Unix seconds |
| `created_at` | integer | When the webhook was created, Unix seconds |
| `updated_at` | integer | When the webhook was last changed, Unix seconds |

### IP address list object

| Field | Type | Description |
| --- | --- | --- |
| `ip_addresses` | array of string | Addresses notifications are sent from |
| `updated_at` | integer | When the list last changed, Unix seconds |

### Pub/Sub channel object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | The channel's ID |
| `object` | string | Object type |
| `description` | string | Free-text label. Optional |
| `trigger_types` | array of string | Subscribed triggers, from [Event types](#event-types) |
| `topic` | string | Topic path, `projects/<project_id>/topics/<topic_id>` |
| `encryption_key` | string | Encryption key identifier. Optional |
| `status` | string | `active` \| `inactive` |
| `notification_email_addresses` | array of string | Addresses warned when publishing keeps failing |
| `created_at` | integer | When the channel was created, Unix seconds |
| `updated_at` | integer | When the channel was last changed, Unix seconds |
