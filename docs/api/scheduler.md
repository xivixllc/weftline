# Scheduler

Scheduler lets you publish bookable meeting types (configurations), hand a booking page a short-lived session, read open slots, and create, confirm, reschedule and cancel bookings. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/scheduling/configurations` | List configurations | R3 |
| POST | `/v3/grants/{grant_id}/scheduling/configurations` | Create a configuration | R3 |
| GET | `/v3/grants/{grant_id}/scheduling/configurations/{configuration_id}` | Get a configuration | R3 |
| PUT | `/v3/grants/{grant_id}/scheduling/configurations/{configuration_id}` | Update a configuration | R3 |
| DELETE | `/v3/grants/{grant_id}/scheduling/configurations/{configuration_id}` | Delete a configuration | R3 |
| POST | `/v3/scheduling/sessions` | Create a session | R3 |
| DELETE | `/v3/scheduling/sessions/{session_id}` | Delete a session | R3 |
| GET | `/v3/scheduling/availability` | Get available slots | R3 |
| POST | `/v3/scheduling/bookings` | Create a booking | R3 |
| GET | `/v3/scheduling/bookings/{booking_id}` | Get a booking | R3 |
| PUT | `/v3/scheduling/bookings/{booking_id}` | Confirm or decline a pending booking | R3 |
| PATCH | `/v3/scheduling/bookings/{booking_id}` | Reschedule a booking | R3 |
| DELETE | `/v3/scheduling/bookings/{booking_id}` | Cancel a booking | R3 |
| GET | `/v3/grants/{grant_id}/scheduling/configurations/{configuration_id}/group-events` | List group events | R3 |
| POST | `/v3/grants/{grant_id}/scheduling/configurations/{configuration_id}/group-events` | Create a group event | R3 |
| PUT | `/v3/grants/{grant_id}/scheduling/configurations/{configuration_id}/group-events/{group_event_id}` | Update a group event | R3 |
| DELETE | `/v3/grants/{grant_id}/scheduling/configurations/{configuration_id}/group-events/{group_event_id}` | Delete a group event | R3 |
| POST | `/v3/scheduling/configurations/{configuration_id}/import-group-events` | Import calendar events as group events | R3 |

## Authentication for booking pages

Scheduler routes use two kinds of bearer credential:

| Routes | Credential |
| --- | --- |
| Configurations, group events, `POST /v3/scheduling/sessions`, `DELETE /v3/scheduling/sessions/{session_id}` | Application API key (server side only) |
| `GET /v3/scheduling/availability`, all `/v3/scheduling/bookings` routes | The `session_id` from [Create a session](#create-a-session), sent as `Authorization: Bearer <session_id>` |

The v3 SDKs send the API key by default. To call availability or bookings with a session, pass the session ID as a per-request API key override. When a configuration has `requires_session_auth` set to `true`, availability and booking calls without a valid session get `401`. When it's `false`, a booking page may call those routes without a session and must name the configuration with `configuration_id`, or with `slug` plus `client_id`.

## Booking flow

1. Your server creates a configuration with [Create a configuration](#create-a-configuration) (once per meeting type).
2. When a guest opens the booking page, your server calls [Create a session](#create-a-session) with the API key and passes the returned `session_id` to the page.
3. The page calls [Get available slots](#get-available-slots) with the session ID and shows the `time_slots`.
4. The guest picks a slot and the page calls [Create a booking](#create-a-booking).
5. If `event_booking.booking_type` is `booking`, the event is created at once and the booking is `booked`. If it's `organizer-confirmation`, the booking stays `pending` until the organizer calls [Confirm or decline a pending booking](#confirm-or-decline-a-pending-booking).
6. Weftline sends `booking.created`, `booking.pending`, `booking.rescheduled`, `booking.cancelled` and `booking.reminder` webhooks as the booking moves through these steps. See [webhooks.md](webhooks.md).

## List configurations

`GET /v3/grants/{grant_id}/scheduling/configurations` · Release R3

Returns the scheduling configurations owned by a grant.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Configuration](#configuration-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations?limit=10" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A8B2C3D4E5F6G7H8J9K0L",
  "data": [
    {
      "id": "cfg_3Vb9Qx",
      "slug": "office-hours",
      "requires_session_auth": true,
      "participants": [
        {
          "email": "advisor@acadpak.com",
          "name": "Sana Iqbal",
          "is_organizer": true,
          "availability": { "calendar_ids": ["primary"] },
          "booking": { "calendar_id": "primary" }
        }
      ],
      "availability": { "duration_minutes": 30 },
      "event_booking": { "title": "Office hours" }
    }
  ]
}
```

## Create a configuration

`POST /v3/grants/{grant_id}/scheduling/configurations` · Release R3

Creates a bookable meeting type: who attends, when they're free, and how the booked event and booking page behave.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address of the owning account |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `participants` | array of [Configuration participant](#configuration-participant-object) | Yes | Hosts for the meeting. Each needs a grant in this application. At least one must have `availability` and one must have `booking`. |
| `availability` | [Availability](#availability-object) | Yes | Slot length, spacing and availability rules |
| `event_booking` | [Event booking](#event-booking-object) | Yes | Settings for the event that a booking creates |
| `slug` | string | No | Unique, human-readable handle for the configuration, used in page URLs |
| `requires_session_auth` | boolean | No | When `true`, availability and booking calls need a session ID |
| `scheduler` | [Scheduler settings](#scheduler-settings-object) | No | Booking page and email behaviour |
| `appearance` | object | No | Booking page appearance, as string keys and string values |
| `name` | string | No | Display name for the configuration. Provisional: seen in one v3 client only. |

**Response** `200`: `data` is a [Configuration](#configuration-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "office-hours",
    "requires_session_auth": true,
    "participants": [
      {
        "email": "advisor@acadpak.com",
        "name": "Sana Iqbal",
        "is_organizer": true,
        "timezone": "Asia/Karachi",
        "availability": {
          "calendar_ids": ["primary"],
          "open_hours": [
            { "days": [1, 2, 3, 4, 5], "timezone": "Asia/Karachi", "start": "9:00", "end": "17:00", "exdates": [] }
          ]
        },
        "booking": { "calendar_id": "primary" }
      }
    ],
    "availability": {
      "duration_minutes": 30,
      "interval_minutes": 30,
      "availability_rules": { "buffer": { "before": 5, "after": 5 } }
    },
    "event_booking": {
      "title": "Office hours",
      "timezone": "Asia/Karachi",
      "booking_type": "booking",
      "conferencing": { "provider": "Google Meet", "autocreate": {} },
      "reminders": [ { "type": "email", "minutes_before_event": 60, "recipient": "all" } ]
    },
    "scheduler": { "available_days_in_future": 30, "min_booking_notice": 120 }
  }'
```

```json
{
  "request_id": "req_01JD4A9C3D4E5F6G7H8J9K0L1M",
  "data": {
    "id": "cfg_3Vb9Qx",
    "slug": "office-hours",
    "requires_session_auth": true,
    "participants": [ { "email": "advisor@acadpak.com", "name": "Sana Iqbal", "is_organizer": true, "timezone": "Asia/Karachi", "availability": { "calendar_ids": ["primary"] }, "booking": { "calendar_id": "primary" } } ],
    "availability": { "duration_minutes": 30, "interval_minutes": 30 },
    "event_booking": { "title": "Office hours", "booking_type": "booking" },
    "scheduler": { "available_days_in_future": 30, "min_booking_notice": 120 }
  }
}
```

## Get a configuration

`GET /v3/grants/{grant_id}/scheduling/configurations/{configuration_id}` · Release R3

Returns one configuration.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `configuration_id` | string | Configuration ID |

**Response** `200`: `data` is a [Configuration](#configuration-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations/cfg_3Vb9Qx" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4AA4E5F6G7H8J9K0L1M2N",
  "data": { "id": "cfg_3Vb9Qx", "slug": "office-hours", "availability": { "duration_minutes": 30 }, "event_booking": { "title": "Office hours" }, "participants": [] }
}
```

## Update a configuration

`PUT /v3/grants/{grant_id}/scheduling/configurations/{configuration_id}` · Release R3

Changes a configuration. Every body field is optional; send only what changes.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `configuration_id` | string | Configuration ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `participants` | array of [Configuration participant](#configuration-participant-object) | No | Replaces the host list |
| `availability` | [Availability](#availability-object) | No | Slot length, spacing and rules |
| `event_booking` | [Event booking](#event-booking-object) | No | Booked event settings |
| `slug` | string | No | Unique handle |
| `requires_session_auth` | boolean | No | Require a session for availability and bookings |
| `scheduler` | [Scheduler settings](#scheduler-settings-object) | No | Booking page and email behaviour |
| `appearance` | object | No | String-to-string appearance settings |
| `name` | string | No | Display name. Provisional: seen in one v3 client only. |

**Response** `200`: `data` is a [Configuration](#configuration-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations/cfg_3Vb9Qx" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "availability": { "duration_minutes": 45 }, "event_booking": { "title": "Extended office hours" } }'
```

```json
{
  "request_id": "req_01JD4AB5F6G7H8J9K0L1M2N3P",
  "data": { "id": "cfg_3Vb9Qx", "availability": { "duration_minutes": 45 }, "event_booking": { "title": "Extended office hours" }, "participants": [] }
}
```

## Delete a configuration

`DELETE /v3/grants/{grant_id}/scheduling/configurations/{configuration_id}` · Release R3

Deletes a configuration. Its booking page stops working.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `configuration_id` | string | Configuration ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations/cfg_3Vb9Qx" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD4AC6G7H8J9K0L1M2N3P4Q" }
```

## Create a session

`POST /v3/scheduling/sessions` · Release R3

Mints a short-lived session ID that a booking page uses as its bearer token for availability and booking calls. Call it from your server with the API key.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `configuration_id` | string | One of `configuration_id` or `slug` | Configuration the session is for |
| `slug` | string | One of `configuration_id` or `slug` | Configuration slug, instead of the ID |
| `time_to_live` | integer | No | Session lifetime in minutes, at most 30. Default 5. |

**Response** `200`: `data` is a [Session](#session-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/scheduling/sessions" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "configuration_id": "cfg_3Vb9Qx", "time_to_live": 10 }'
```

```json
{ "request_id": "req_01JD4AD7H8J9K0L1M2N3P4Q5R", "data": { "session_id": "ses_9kD2fW4pQ7" } }
```

## Delete a session

`DELETE /v3/scheduling/sessions/{session_id}` · Release R3

Revokes a session before it expires.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `session_id` | string | Session ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/scheduling/sessions/ses_9kD2fW4pQ7" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD4AE8J9K0L1M2N3P4Q5R6S" }
```

## Get available slots

`GET /v3/scheduling/availability` · Release R3

Returns the bookable slots for a configuration within a time window, using the configuration's participants and rules.

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `start_time` | integer | Required. Window start, Unix seconds |
| `end_time` | integer | Required. Window end, Unix seconds |
| `configuration_id` | string | Configuration to use. Not needed with a session. |
| `slug` | string | Configuration slug, instead of `configuration_id` |
| `client_id` | string | Application ID that owns the configuration. Needed with `slug`. |
| `booking_id` | string | When rescheduling, the booking being moved, so its own slot counts as free |

**Response** `200`: `data` is a [Scheduler availability](#scheduler-availability-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/scheduling/availability?start_time=1767585600&end_time=1767672000" \
  -H "Authorization: Bearer $SESSION_ID"
```

```json
{
  "request_id": "req_01JD4AF9K0L1M2N3P4Q5R6S7T",
  "data": {
    "order": [],
    "time_slots": [
      { "emails": ["advisor@acadpak.com"], "start_time": 1767589200, "end_time": 1767591000 },
      { "emails": ["advisor@acadpak.com"], "start_time": 1767591000, "end_time": 1767592800 }
    ]
  }
}
```

## Create a booking

`POST /v3/scheduling/bookings` · Release R3

Books a slot for a guest. Accepts an `Idempotency-Key` header (see [Idempotency](README.md#idempotency)); a slot that's no longer free returns `409 conflict`.

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `configuration_id` | string | Configuration to book against. Not needed with a session. |
| `slug` | string | Configuration slug, instead of `configuration_id` |
| `client_id` | string | Application ID that owns the configuration. Needed with `slug`. |
| `timezone` | string | Time zone for the booking. Defaults to the configuration's. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `start_time` | integer | Yes | Event start, Unix seconds |
| `end_time` | integer | Yes | Event end, Unix seconds |
| `guest` | [Booking guest](#booking-guest-object) | Yes | The person booking |
| `participants` | array of [Booking participant](#booking-participant-object) | No | Subset of configuration participants to include. Default: all. |
| `timezone` | string | No | Guest's time zone for emails. Defaults to the configuration's. |
| `email_language` | string | No | Language of guest emails: `en` \| `es` \| `fr` \| `de` \| `nl` \| `sv` \| `ja` \| `zh` |
| `additional_guests` | array of [Booking guest](#booking-guest-object) | No | Extra people to invite |
| `additional_fields` | object | No | Answers to the configuration's `scheduler.additional_fields`, keyed by field name, string values |

**Response** `200`: `data` is a [Booking](#booking-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/scheduling/bookings" \
  -H "Authorization: Bearer $SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: book-7f3a91" \
  -d '{
    "start_time": 1767589200,
    "end_time": 1767591000,
    "guest": { "email": "student@acadpak.com", "name": "Bilal Ahmed" },
    "timezone": "Asia/Karachi",
    "email_language": "en",
    "additional_fields": { "course": "MATH-201" }
  }'
```

```json
{
  "request_id": "req_01JD4AGAL1M2N3P4Q5R6S7T8U",
  "data": {
    "booking_id": "bkg_5Tn8Rc",
    "event_id": "evt_2Wq7Ym",
    "title": "Office hours",
    "organizer": { "email": "advisor@acadpak.com", "name": "Sana Iqbal" },
    "status": "booked"
  }
}
```

## Get a booking

`GET /v3/scheduling/bookings/{booking_id}` · Release R3

Returns one booking.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `booking_id` | string | Booking ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `configuration_id` | string | Configuration the booking belongs to. Not needed with a session. |
| `slug` | string | Configuration slug, instead of `configuration_id` |
| `client_id` | string | Application ID that owns the configuration. Needed with `slug`. |

**Response** `200`: `data` is a [Booking](#booking-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/scheduling/bookings/bkg_5Tn8Rc" \
  -H "Authorization: Bearer $SESSION_ID"
```

```json
{
  "request_id": "req_01JD4AHBM2N3P4Q5R6S7T8U9V",
  "data": { "booking_id": "bkg_5Tn8Rc", "event_id": "evt_2Wq7Ym", "title": "Office hours", "organizer": { "email": "advisor@acadpak.com" }, "status": "booked" }
}
```

## Confirm or decline a pending booking

`PUT /v3/scheduling/bookings/{booking_id}` · Release R3

The organizer accepts or turns down a `pending` booking made under an `organizer-confirmation` configuration. The `salt` comes from the booking reference in the organizer's confirmation link.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `booking_id` | string | Booking ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `configuration_id` | string | Configuration the booking belongs to. Not needed with a session. |
| `slug` | string | Configuration slug, instead of `configuration_id` |
| `client_id` | string | Application ID that owns the configuration. Needed with `slug`. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `salt` | string | Yes | Salt from the confirmation link, URL-safe base64 without padding |
| `status` | string | Yes | `confirmed` \| `cancelled` |
| `cancellation_reason` | string | No | Reason shown to the guest when declining |

**Response** `200`: `data` is a [Booking](#booking-object) when `status` is `confirmed`; no `data` when it's `cancelled`.

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/scheduling/bookings/bkg_5Tn8Rc" \
  -H "Authorization: Bearer $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{ "salt": "q8Zx2LmT0aYw", "status": "confirmed" }'
```

```json
{
  "request_id": "req_01JD4AJCN3P4Q5R6S7T8U9V0W",
  "data": { "booking_id": "bkg_5Tn8Rc", "event_id": "evt_2Wq7Ym", "title": "Office hours", "organizer": { "email": "advisor@acadpak.com" }, "status": "booked" }
}
```

## Reschedule a booking

`PATCH /v3/scheduling/bookings/{booking_id}` · Release R3

Moves a booking to a new slot. Use [Get available slots](#get-available-slots) with `booking_id` to find free times first.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `booking_id` | string | Booking ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `configuration_id` | string | Configuration the booking belongs to. Not needed with a session. |
| `slug` | string | Configuration slug, instead of `configuration_id` |
| `client_id` | string | Application ID that owns the configuration. Needed with `slug`. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `start_time` | integer | Yes | New start, Unix seconds |
| `end_time` | integer | Yes | New end, Unix seconds |

**Response** `200`: `data` is a [Booking](#booking-object).

**Example**

```bash
curl -s -X PATCH "$WEFTLINE_URL/v3/scheduling/bookings/bkg_5Tn8Rc" \
  -H "Authorization: Bearer $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{ "start_time": 1767675600, "end_time": 1767677400 }'
```

```json
{
  "request_id": "req_01JD4AKDP4Q5R6S7T8U9V0W1X",
  "data": { "booking_id": "bkg_5Tn8Rc", "event_id": "evt_2Wq7Ym", "title": "Office hours", "organizer": { "email": "advisor@acadpak.com" }, "status": "booked" }
}
```

## Cancel a booking

`DELETE /v3/scheduling/bookings/{booking_id}` · Release R3

Cancels a booking and removes its event. The request may carry a JSON body with a reason.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `booking_id` | string | Booking ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `configuration_id` | string | Configuration the booking belongs to. Not needed with a session. |
| `slug` | string | Configuration slug, instead of `configuration_id` |
| `client_id` | string | Application ID that owns the configuration. Needed with `slug`. |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `cancellation_reason` | string | No | Reason passed on to participants |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/scheduling/bookings/bkg_5Tn8Rc" \
  -H "Authorization: Bearer $SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{ "cancellation_reason": "Class rescheduled" }'
```

```json
{ "request_id": "req_01JD4AMEQ5R6S7T8U9V0W1X2Y" }
```

## List group events

`GET /v3/grants/{grant_id}/scheduling/configurations/{configuration_id}/group-events` · Release R3

> Provisional: this shape comes from client code, not a published contract.

Returns the group events (shared slots with a seat limit) under a configuration within a time window.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `configuration_id` | string | Configuration ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar holding the group events |
| `start_time` | integer | Required. Window start, Unix seconds |
| `end_time` | integer | Required. Window end, Unix seconds |

**Response** `200`: `data` is an array of [Group event](#group-event-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations/cfg_3Vb9Qx/group-events?calendar_id=primary&start_time=1767585600&end_time=1768190400" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4ANFR6S7T8U9V0W1X2Y3Z",
  "data": [
    {
      "id": "gev_4Hk1Pz",
      "calendar_id": "primary",
      "title": "Exam review session",
      "capacity": 20,
      "when": { "start_time": 1767787200, "end_time": 1767792600, "start_timezone": "Asia/Karachi", "end_timezone": "Asia/Karachi" }
    }
  ]
}
```

## Create a group event

`POST /v3/grants/{grant_id}/scheduling/configurations/{configuration_id}/group-events` · Release R3

> Provisional: this shape comes from client code, not a published contract.

Creates a shared slot that up to `capacity` guests can book. With no `participants`, the organizer hosts it.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `configuration_id` | string | Configuration ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `calendar_id` | string | Yes | Calendar to create the event in |
| `title` | string | Yes | Event title |
| `capacity` | integer | Yes | Maximum number of guests |
| `when` | [Group event time](#group-event-time-object) | Yes | Start and end |
| `description` | string | No | Event description |
| `location` | string | No | Event location |
| `participants` | array of [Group event participant](#group-event-participant-object) | No | Hosts. Default: the organizer. |

**Response** `200`: `data` is an array of [Group event](#group-event-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations/cfg_3Vb9Qx/group-events" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "calendar_id": "primary",
    "title": "Exam review session",
    "capacity": 20,
    "location": "https://meet.jit.si/acadpak-exam-review",
    "when": { "start_time": 1767787200, "end_time": 1767792600, "start_timezone": "Asia/Karachi", "end_timezone": "Asia/Karachi" }
  }'
```

```json
{
  "request_id": "req_01JD4APGS7T8U9V0W1X2Y3Z4A",
  "data": [ { "id": "gev_4Hk1Pz", "calendar_id": "primary", "title": "Exam review session", "capacity": 20, "location": "https://meet.jit.si/acadpak-exam-review" } ]
}
```

## Update a group event

`PUT /v3/grants/{grant_id}/scheduling/configurations/{configuration_id}/group-events/{group_event_id}` · Release R3

> Provisional: this shape comes from client code, not a published contract.

Changes a group event. Every body field is optional.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `configuration_id` | string | Configuration ID |
| `group_event_id` | string | Group event ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `calendar_id` | string | No | Calendar holding the event |
| `title` | string | No | Event title |
| `capacity` | integer | No | Maximum number of guests |
| `when` | [Group event time](#group-event-time-object) | No | Start and end |
| `description` | string | No | Event description |
| `location` | string | No | Event location |
| `participants` | array of [Group event participant](#group-event-participant-object) | No | Hosts |

**Response** `200`: `data` is an array of [Group event](#group-event-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations/cfg_3Vb9Qx/group-events/gev_4Hk1Pz" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "capacity": 30 }'
```

```json
{ "request_id": "req_01JD4AQHT8U9V0W1X2Y3Z4A5B", "data": [ { "id": "gev_4Hk1Pz", "title": "Exam review session", "capacity": 30 } ] }
```

## Delete a group event

`DELETE /v3/grants/{grant_id}/scheduling/configurations/{configuration_id}/group-events/{group_event_id}` · Release R3

> Provisional: this shape comes from client code, not a published contract.

Deletes a group event.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `configuration_id` | string | Configuration ID |
| `group_event_id` | string | Group event ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/scheduling/configurations/cfg_3Vb9Qx/group-events/gev_4Hk1Pz" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD4ARJU9V0W1X2Y3Z4A5B6C" }
```

## Import calendar events as group events

`POST /v3/scheduling/configurations/{configuration_id}/import-group-events` · Release R3

> Provisional: this shape comes from client code, not a published contract.

Turns existing calendar events into group events under a configuration. This route is not grant-scoped. The body is a bare JSON array, not an object.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `configuration_id` | string | Configuration ID |

**Request body** (JSON): an array of [Group event import item](#group-event-import-item-object), at least one.

**Response** `200`: `data` is an array of [Group event](#group-event-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/scheduling/configurations/cfg_3Vb9Qx/import-group-events" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "calendar_id": "primary",
      "event_id": "evt_8Lr3Nd",
      "capacity": 15,
      "exceptions": [ { "event_id": "evt_8Lr3Nd_20260112", "capacity": 25 } ]
    }
  ]'
```

```json
{ "request_id": "req_01JD4ASKV0W1X2Y3Z4A5B6C7D", "data": [ { "id": "gev_6Mn2Qa", "calendar_id": "primary", "title": "Weekly study circle", "capacity": 15 } ] }
```

## Objects

### Configuration object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Configuration ID |
| `participants` | array of [Configuration participant](#configuration-participant-object) | Hosts for the meeting |
| `availability` | [Availability](#availability-object) | Slot length, spacing and rules |
| `event_booking` | [Event booking](#event-booking-object) | Settings for the booked event |
| `slug` | string | Unique, human-readable handle |
| `requires_session_auth` | boolean | Whether availability and bookings need a session ID |
| `scheduler` | [Scheduler settings](#scheduler-settings-object) | Booking page and email behaviour |
| `appearance` | object | Booking page appearance, string keys and string values |
| `name` | string | Display name. Provisional: seen in one v3 client only. |

### Configuration participant object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Required. Host's email address; must match a grant in the application |
| `availability` | [Participant availability](#participant-availability-object) | Calendars and hours used to find this host's free time. Omit to treat the host as always free. |
| `booking` | [Participant booking](#participant-booking-object) | Where the event is written. Omit to leave the host off the booked event. |
| `name` | string | Host's name |
| `is_organizer` | boolean | Marks the event organizer. One participant must be organizer unless the meeting is round-robin. |
| `timezone` | string | Host's time zone, used for open hours and emails, for example `Asia/Karachi` |

### Participant availability object

| Field | Type | Description |
| --- | --- | --- |
| `calendar_ids` | array of string | Calendars checked for busy time. Default: the primary calendar. |
| `open_hours` | array of [Open hours](#open-hours-object) | Hours this host can be booked, overriding `default_open_hours` |

### Participant booking object

| Field | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar the booked event is created in |

### Open hours object

| Field | Type | Description |
| --- | --- | --- |
| `days` | array of integer | Weekdays the hours apply to, `0` (Sunday) to `6` (Saturday) |
| `timezone` | string | IANA time zone, for example `Asia/Karachi` |
| `start` | string | Start time, 24-hour, no leading zero, for example `9:00` |
| `end` | string | End time, 24-hour, for example `17:00` |
| `exdates` | array of string | Dates excluded from these hours, `YYYY-MM-DD` |

### Availability object

| Field | Type | Description |
| --- | --- | --- |
| `duration_minutes` | integer | Required. Meeting length in minutes |
| `interval_minutes` | integer | Minutes between possible start times |
| `round_to` | integer | Round slot starts to this many minutes; a multiple of 5 |
| `availability_rules` | [Availability rules](#availability-rules-object) | How free time is combined across hosts |

### Availability rules object

| Field | Type | Description |
| --- | --- | --- |
| `availability_method` | string | `collective` (all hosts must be free) \| `max-fairness` (round-robin, spread evenly) \| `max-availability` (round-robin, most open slots) |
| `buffer` | [Meeting buffer](#meeting-buffer-object) | Padding around existing meetings |
| `default_open_hours` | array of [Open hours](#open-hours-object) | Open hours for every host without their own |
| `round_robin_group_id` | string | Marker on events that Weftline counts when working out the round-robin order |
| `tentative_as_busy` | boolean | Whether tentative events block time. Default `true`. Applies to Microsoft and Exchange calendars. |

### Meeting buffer object

| Field | Type | Description |
| --- | --- | --- |
| `before` | integer | Minutes kept free before existing meetings, in steps of 5. Default 0. |
| `after` | integer | Minutes kept free after existing meetings, in steps of 5. Default 0. |

### Event booking object

| Field | Type | Description |
| --- | --- | --- |
| `title` | string | Required. Title of the booked event |
| `description` | string | Event description |
| `location` | string | Event location |
| `timezone` | string | Time zone used for times in confirmation emails and reminders |
| `booking_type` | string | `booking` (create the event at once) \| `organizer-confirmation` (create a pending event and ask the organizer to confirm) |
| `conferencing` | [Conferencing](#conferencing-object) | Video meeting to attach |
| `disable_emails` | boolean | When `true`, Weftline sends no booking, cancellation or reschedule emails |
| `reminders` | array of [Booking reminder](#booking-reminder-object) | Reminders sent before the event |
| `metadata` | object | String key-value pairs copied to bookings. Provisional: seen in one v3 client only. |

### Booking reminder object

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | Required. `email` \| `webhook` |
| `minutes_before_event` | integer | Required. How long before the start to send it |
| `recipient` | string | `host` \| `guest` \| `all` |
| `email_subject` | string | Subject line for email reminders |

### Conferencing object

Give either `details` (an existing meeting) or `autocreate` (ask Weftline to create one).

| Field | Type | Description |
| --- | --- | --- |
| `provider` | string | `Google Meet` \| `Zoom Meeting` \| `Microsoft Teams` \| `GoToMeeting` \| `WebEx` |
| `details` | [Conferencing details](#conferencing-details-object) | Details of an existing meeting |
| `autocreate` | object | Send `{}` to create a meeting link; extra provider settings are passed through unchecked |

### Conferencing details object

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Meeting link, for example `https://meet.google.com/abc-defg-hij` |
| `meeting_code` | string | Meeting code (Zoom) |
| `password` | string | Meeting password (Zoom) |
| `pin` | string | Dial-in PIN (Google Meet) |
| `phone` | array of string | Dial-in numbers (Google Meet) |

### Scheduler settings object

| Field | Type | Description |
| --- | --- | --- |
| `additional_fields` | object | Extra booking-form fields, keyed by field name; each value is an [Additional field](#additional-field-object) |
| `available_days_in_future` | integer | How many days ahead guests can book |
| `min_booking_notice` | integer | Minimum minutes between now and a new booking's start |
| `min_cancellation_notice` | integer | Minimum minutes before the start that a booking can still be cancelled |
| `cancellation_policy` | string | Policy text shown on the booking page |
| `rescheduling_url` | string | Reschedule link placed in confirmation emails |
| `cancellation_url` | string | Cancel link placed in confirmation emails |
| `organizer_confirmation_url` | string | Link in booking-request emails where the organizer confirms or declines |
| `confirmation_redirect_url` | string | Where the page sends the guest after booking |
| `hide_rescheduling_options` | boolean | Hide the reschedule option in confirmations and emails |
| `hide_cancellation_options` | boolean | Hide the cancel option in confirmations and emails |
| `hide_additional_guests` | boolean | Hide the "additional guests" field on the booking page |
| `email_template` | [Email template](#email-template-object) | Booking email customisation |

### Additional field object

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Required. Label shown on the form |
| `type` | string | Required. `text` \| `multi_line_text` \| `email` \| `phone_number` \| `dropdown` \| `date` \| `checkbox` \| `radio_button` |
| `required` | boolean | Required. Whether the guest must fill it in |
| `pattern` | string | Regular expression the value must match |
| `order` | integer | Display position; lower comes first |
| `options` | array of string | Choices for `dropdown` and `radio_button`; required for those types |

### Email template object

| Field | Type | Description |
| --- | --- | --- |
| `logo` | string | Public URL of a logo shown at the top of booking emails |
| `booking_confirmed` | [Booking confirmed template](#booking-confirmed-template-object) | Overrides for the guest's confirmation email |

### Booking confirmed template object

| Field | Type | Description |
| --- | --- | --- |
| `title` | string | Heading that replaces the default "Booking confirmed" heading (not the subject line) |
| `body` | string | Text added after the default body |

### Session object

| Field | Type | Description |
| --- | --- | --- |
| `session_id` | string | Session ID; send it as the bearer token for availability and booking calls |

### Scheduler availability object

| Field | Type | Description |
| --- | --- | --- |
| `order` | array of string | Round-robin only: host emails in the order they're next in line |
| `time_slots` | array of [Time slot](#time-slot-object) | Bookable slots |

### Time slot object

| Field | Type | Description |
| --- | --- | --- |
| `emails` | array of string | Hosts free for this slot |
| `start_time` | integer | Slot start, Unix seconds |
| `end_time` | integer | Slot end, Unix seconds |
| `event_id` | string | Calendar event tied to this slot, if any |
| `master_id` | string | Recurring-series ID of that event, if any |
| `calendar_id` | string | Calendar of that event, if any |

### Booking object

| Field | Type | Description |
| --- | --- | --- |
| `booking_id` | string | Booking ID |
| `event_id` | string | ID of the calendar event the booking created |
| `title` | string | Event title |
| `organizer` | [Booking organizer](#booking-organizer-object) | The organizing host |
| `status` | string | `pending` \| `booked` \| `cancelled` |
| `description` | string | Event description |

### Booking organizer object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Organizer's email address |
| `name` | string | Organizer's name |

### Booking guest object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Required. Guest's email address |
| `name` | string | Required. Guest's name |

### Booking participant object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Required. Email of a configuration participant to include |

### Group event object

> Provisional: this shape comes from client code, not a published contract.

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Group event ID |
| `calendar_id` | string | Calendar holding the event |
| `title` | string | Event title |
| `description` | string | Event description |
| `location` | string | Event location |
| `capacity` | integer | Maximum number of guests |
| `participants` | array of [Group event participant](#group-event-participant-object) | Hosts |
| `when` | [Group event time](#group-event-time-object) | Start and end |

### Group event participant object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Required. Host's email address |
| `name` | string | Host's name |
| `is_organizer` | boolean | Whether this host organizes the event |

### Group event time object

| Field | Type | Description |
| --- | --- | --- |
| `start_time` | integer | Start, Unix seconds |
| `end_time` | integer | End, Unix seconds |
| `start_timezone` | string | IANA time zone of the start |
| `end_timezone` | string | IANA time zone of the end |

### Group event import item object

| Field | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar holding the source event |
| `event_id` | string | Required. Calendar event to import |
| `capacity` | integer | Maximum number of guests |
| `participants` | array of [Group event participant](#group-event-participant-object) | Hosts |
| `exceptions` | array of [Group event import exception](#group-event-import-exception-object) | Per-occurrence capacity overrides for recurring events |

### Group event import exception object

| Field | Type | Description |
| --- | --- | --- |
| `event_id` | string | Occurrence of the recurring event |
| `capacity` | integer | Capacity for that occurrence |
