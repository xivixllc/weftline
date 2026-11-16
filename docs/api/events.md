# Events

Read, create, change and delete calendar events, reply to invitations, run several changes in one call, and pull a calendar's events for import. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/events` | List events | R2 |
| GET | `/v3/grants/{grant_id}/events/{event_id}` | Get an event | R2 |
| POST | `/v3/grants/{grant_id}/events` | Create an event | R2 |
| PUT | `/v3/grants/{grant_id}/events/{event_id}` | Update an event | R2 |
| DELETE | `/v3/grants/{grant_id}/events/{event_id}` | Delete an event | R2 |
| POST | `/v3/grants/{grant_id}/events/{event_id}/send-rsvp` | Reply to an invitation | R2 |
| POST | `/v3/grants/{grant_id}/events/batch` | Create, update and delete events in one call | R2 |
| GET | `/v3/grants/{grant_id}/events/import` | List events for import | R2 |

Every event route needs a `calendar_id` query parameter; `primary` means the grant's primary
calendar. Virtual calendars (calendars Weftline hosts itself, with no provider account) use the
same routes, parameters and objects as provider calendars; the one exception noted below is the
`attendees` list filter.

## Event times

An event's `when` is one of four shapes. Responses include `object` to say which one; in
requests, leave `object` out and send only the fields of the shape you want.

| Shape | `object` | Fields | Use for |
| --- | --- | --- | --- |
| [Time](#time-object) | `time` | `time`, `timezone` | A single instant, such as a reminder-style event |
| [Timespan](#timespan-object) | `timespan` | `start_time`, `end_time`, `start_timezone`, `end_timezone` | A meeting with a start and end time |
| [Date](#date-object) | `date` | `date` | A whole day, such as a holiday |
| [Datespan](#datespan-object) | `datespan` | `start_date`, `end_date` | Several whole days, such as an exam week |

## Recurring events

Set `recurrence` to a list of RFC 5545 `RRULE` and `EXDATE` lines, for example
`["RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10", "EXDATE:20260112T090000Z"]`. Listing with
`expand_recurring=true` returns one event per occurrence in the time range; each occurrence
carries `master_event_id` (the series) and `original_start_time` (its slot in the series).
Without it, a series comes back as its single master event.

## List events

`GET /v3/grants/{grant_id}/events` · Release R2

Returns the events in one calendar, by default those between now and a month from now.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar to list, or `primary` |
| `start` | integer | Only events starting after this time, Unix seconds. Default now. Ignored with `metadata_pair` |
| `end` | integer | Only events ending before this time, Unix seconds. Default one month from now. Ignored with `metadata_pair` |
| `expand_recurring` | boolean | Return each occurrence of a recurring event instead of the master event. Default `false`. Can't be combined with `metadata_pair` |
| `show_cancelled` | boolean | Include cancelled events. Cancelled occurrences of recurring events can appear regardless; providers differ in what counts as cancelled |
| `title` | string | Only events matching this title |
| `description` | string | Only events matching this description. Not supported for Microsoft |
| `location` | string | Only events matching this location |
| `busy` | boolean | Only events with this `busy` value |
| `attendees` | string | Only events that include this address; repeat the parameter for several. Not supported for virtual calendars |
| `master_event_id` | string | Only occurrences of this recurring series |
| `ical_uid` | string | Only events with this iCalendar UID |
| `event_type` | string | Google only. `default` \| `outOfOffice` \| `focusTime` \| `workingLocation`; repeat the parameter for several |
| `order_by` | string | Sort order; only `start` is supported |
| `metadata_pair` | string | Only events whose metadata has this `key:value` pair |
| `tentative_as_busy` | boolean | Report tentative events with `busy: true`. Default `true`. Microsoft and Exchange only |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Event](#event-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/events?calendar_id=primary&start=1767225600&end=1767830400&expand_recurring=true" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": [
    {
      "id": "evt_5c2a90d1_20260105T040000Z",
      "grant_id": "grt_3f8a1c2d",
      "object": "event",
      "calendar_id": "cal_7d1e9a40",
      "title": "Grade 7 science",
      "busy": true,
      "read_only": false,
      "visibility": "default",
      "status": "confirmed",
      "when": {
        "object": "timespan",
        "start_time": 1767585600,
        "end_time": 1767589200,
        "start_timezone": "Asia/Karachi",
        "end_timezone": "Asia/Karachi"
      },
      "participants": [
        { "email": "teacher@acadpak.com", "name": "Ayesha Khan", "status": "yes" }
      ],
      "master_event_id": "evt_5c2a90d1",
      "original_start_time": 1767585600
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjUwfQ"
}
```

## Get an event

`GET /v3/grants/{grant_id}/events/{event_id}` · Release R2

Returns one event.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `event_id` | string | Event ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar the event is in, or `primary` |
| `tentative_as_busy` | boolean | Report a tentative event with `busy: true`. Default `true`. Microsoft and Exchange only |

**Response** `200`: `data` is an [Event](#event-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/events/evt_8e41b7c0?calendar_id=primary" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "evt_8e41b7c0",
    "grant_id": "grt_3f8a1c2d",
    "object": "event",
    "calendar_id": "cal_7d1e9a40",
    "title": "Parent-teacher meeting",
    "busy": true,
    "read_only": false,
    "visibility": "private",
    "when": { "object": "timespan", "start_time": 1767848400, "end_time": 1767850200, "start_timezone": "Asia/Karachi", "end_timezone": "Asia/Karachi" },
    "participants": [
      { "email": "parent@acadpak.com", "name": "Bilal Ahmed", "status": "noreply" }
    ],
    "organizer": { "email": "teacher@acadpak.com", "name": "Ayesha Khan" }
  }
}
```

## Create an event

`POST /v3/grants/{grant_id}/events` · Release R2

Creates an event in a calendar and, if asked, emails the invitation to its participants.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar to create the event in, or `primary` |
| `notify_participants` | boolean | Email the invitation to every participant |
| `tentative_as_busy` | boolean | Report tentative events with `busy: true`. Default `true`. Microsoft and Exchange only |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `when` | object | Yes | A [Time](#time-object), [Timespan](#timespan-object), [Date](#date-object) or [Datespan](#datespan-object), without `object` |
| `title` | string | No | Event title |
| `description` | string | No | Event description |
| `location` | string | No | Free-text location, such as an address or room name |
| `busy` | boolean | No | Whether the time shows as busy to others |
| `participants` | array of [Participant](#participant-object) | No | People to invite. Leave `status` out |
| `resources` | array of [Event resource](#event-resource-object) | No | Rooms or equipment to book |
| `conferencing` | object | No | A [Conferencing details](#conferencing-details-object) or a [Conferencing autocreate](#conferencing-autocreate-object) |
| `reminders` | [Reminders](#reminders-object) | No | Reminder settings. Omit to use the provider defaults |
| `recurrence` | array of string | No | `RRULE` and `EXDATE` lines; see [Recurring events](#recurring-events) |
| `visibility` | string | No | `default` \| `public` \| `private`. `default` is Google only and follows the calendar's sharing settings; Microsoft and Exchange reject it with `400` |
| `read_only` | boolean | No | Whether participants are prevented from editing the event |
| `capacity` | integer | No | Most participants allowed to attend |
| `hide_participants` | boolean | No | Hide the participant list from participants |
| `metadata` | object | No | String key-value pairs; see [Metadata](README.md#metadata) |
| `notetaker` | [Event notetaker](#event-notetaker-object) | No | Send a meeting-notes bot to this event |
| `calendar_id` | string | No | Accepted for compatibility; the `calendar_id` query parameter chooses the calendar |

**Response** `200`: `data` is the new [Event](#event-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/events?calendar_id=primary&notify_participants=true" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Parent-teacher meeting",
    "when": { "start_time": 1767848400, "end_time": 1767850200, "start_timezone": "Asia/Karachi", "end_timezone": "Asia/Karachi" },
    "participants": [ { "email": "parent@acadpak.com", "name": "Bilal Ahmed" } ],
    "conferencing": { "provider": "Google Meet", "autocreate": {} },
    "reminders": { "use_default": false, "overrides": [ { "reminder_minutes": 15, "reminder_method": "popup" } ] },
    "metadata": { "student_id": "s_1042" }
  }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "evt_8e41b7c0",
    "grant_id": "grt_3f8a1c2d",
    "object": "event",
    "calendar_id": "cal_7d1e9a40",
    "title": "Parent-teacher meeting",
    "busy": true,
    "read_only": false,
    "visibility": "default",
    "when": { "object": "timespan", "start_time": 1767848400, "end_time": 1767850200, "start_timezone": "Asia/Karachi", "end_timezone": "Asia/Karachi" },
    "participants": [ { "email": "parent@acadpak.com", "name": "Bilal Ahmed", "status": "noreply" } ],
    "conferencing": {
      "provider": "Google Meet",
      "details": { "url": "https://meet.google.com/abc-defg-hij", "pin": "123456789", "phone": ["+92 21 1234 5678"] }
    },
    "reminders": { "use_default": false, "overrides": [ { "reminder_minutes": 15, "reminder_method": "popup" } ] },
    "metadata": { "student_id": "s_1042" },
    "organizer": { "email": "teacher@acadpak.com", "name": "Ayesha Khan" }
  }
}
```

## Update an event

`PUT /v3/grants/{grant_id}/events/{event_id}` · Release R2

Changes the fields you send and leaves the others as they are. `resources`, when sent, replaces
the whole list: omit it to keep the current resources, or send `[]` to clear them.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `event_id` | string | Event ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar the event is in, or `primary` |
| `notify_participants` | boolean | Email the change to every participant |
| `tentative_as_busy` | boolean | Report tentative events with `busy: true`. Default `true`. Microsoft and Exchange only |

**Request body** (JSON)

The same fields as [Create an event](#create-an-event), all optional. Inside `when`,
`conferencing` and `reminders` you may also send only the sub-fields you're changing. Each
resource in `resources` needs an `email`.

**Response** `200`: `data` is the updated [Event](#event-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/events/evt_8e41b7c0?calendar_id=primary&notify_participants=true" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Room 12, Main Campus",
    "resources": [ { "email": "room-12@acadpak.com" } ]
  }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "evt_8e41b7c0",
    "grant_id": "grt_3f8a1c2d",
    "object": "event",
    "calendar_id": "cal_7d1e9a40",
    "title": "Parent-teacher meeting",
    "location": "Room 12, Main Campus",
    "busy": true,
    "read_only": false,
    "visibility": "default",
    "when": { "object": "timespan", "start_time": 1767848400, "end_time": 1767850200, "start_timezone": "Asia/Karachi", "end_timezone": "Asia/Karachi" },
    "participants": [ { "email": "parent@acadpak.com", "name": "Bilal Ahmed", "status": "yes" } ],
    "resources": [ { "email": "room-12@acadpak.com", "name": "Room 12", "capacity": 8, "building": "Main Campus" } ]
  }
}
```

## Delete an event

`DELETE /v3/grants/{grant_id}/events/{event_id}` · Release R2

Deletes an event and, if asked, tells its participants it was cancelled.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `event_id` | string | Event ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar the event is in, or `primary` |
| `notify_participants` | boolean | Email the cancellation to every participant |
| `tentative_as_busy` | boolean | Accepted for consistency with the other event routes. Microsoft and Exchange only |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/events/evt_8e41b7c0?calendar_id=primary&notify_participants=true" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M" }
```

## Reply to an invitation

`POST /v3/grants/{grant_id}/events/{event_id}/send-rsvp` · Release R2

Records the grant's answer to an event it was invited to and sends the reply to the organizer.
The organizer can't RSVP to their own event, and an invitee changes their answer here rather
than by updating the event.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `event_id` | string | Event ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar the event is in, or `primary` |
| `tentative_as_busy` | boolean | Report tentative events with `busy: true`. Default `true`. Microsoft and Exchange only |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | string | Yes | `yes` \| `no` \| `maybe` |

**Response** `200`: no `data`. If the answer was saved but the reply email couldn't be sent, the
body also has `send_ics_error`, an [Error detail](#error-detail-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/events/evt_31f0aa72/send-rsvp?calendar_id=primary" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "status": "yes" }'
```

```json
{ "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M" }
```

## Create, update and delete events in one call

`POST /v3/grants/{grant_id}/events/batch` · Release R2

Runs a list of event operations against one calendar and returns one result per operation, in
the same order. Supported for Google and Microsoft grants. Failed operations aren't retried or
split up for you.

If the request itself is invalid, Weftline returns `400` and runs nothing. Otherwise it returns
`200` when every operation succeeds and `207` when any fail; check each result's `status`.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters** (apply to every operation)

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar every operation acts on, or `primary` |
| `notify_participants` | boolean | Email participants about each change. Default `true`; Microsoft rejects `false` |
| `tentative_as_busy` | boolean | Report tentative events with `busy: true`. Default `true`. Microsoft only |
| `grant_email` | string | Address of the grant to act as; create operations default to the grant's own address |
| `select` | string | Comma-separated fields to return in each result's event |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `operations` | array of [Batch operation](#batch-operation-object) | Yes | Operations to run, in order |

**Response** `200` or `207`: `data` is an array of [Batch result](#batch-result-object), one per operation.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/events/batch?calendar_id=primary" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      { "method": "create", "body": { "title": "Staff briefing", "when": { "start_time": 1767934800, "end_time": 1767936600 } } },
      { "method": "update", "event_id": "evt_8e41b7c0", "body": { "title": "Parent-teacher meeting (moved)" } },
      { "method": "delete", "event_id": "evt_00000000" }
    ]
  }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": [
    { "status": 200, "data": { "id": "evt_d93c1e20", "object": "event", "calendar_id": "cal_7d1e9a40", "title": "Staff briefing" } },
    { "status": 200, "data": { "id": "evt_8e41b7c0", "object": "event", "calendar_id": "cal_7d1e9a40", "title": "Parent-teacher meeting (moved)" } },
    { "status": 404, "error": { "type": "not_found_error", "message": "event not found", "provider_error": null } }
  ]
}
```

## List events for import

`GET /v3/grants/{grant_id}/events/import` · Release R2

Returns every event in a calendar for a time range, for copying a calendar into your own store.
Unlike [List events](#list-events) it takes no content filters. Beta.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `calendar_id` | string | Required. Calendar to import, or `primary` (`primary` isn't supported for iCloud) |
| `start` | integer | Only events starting at or after this time, Unix seconds. Default now |
| `end` | integer | Only events ending at or before this time, Unix seconds. Default one month from now |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Event](#event-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/events/import?calendar_id=cal_7d1e9a40&start=1767225600&end=1782864000&limit=200" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": [
    {
      "id": "evt_2b7f6e19",
      "grant_id": "grt_3f8a1c2d",
      "object": "event",
      "calendar_id": "cal_7d1e9a40",
      "title": "Sports day",
      "busy": false,
      "read_only": false,
      "when": { "object": "date", "date": "2026-02-14" },
      "participants": []
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjIwMH0"
}
```

## Objects

### Event object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Event ID |
| `grant_id` | string | Grant the event belongs to |
| `object` | string | Always `event` |
| `calendar_id` | string | Calendar the event is in |
| `title` | string | Event title |
| `description` | string | Event description |
| `location` | string | Free-text location |
| `when` | object | A [Time](#time-object), [Timespan](#timespan-object), [Date](#date-object) or [Datespan](#datespan-object) |
| `busy` | boolean | Whether the time shows as busy to others |
| `read_only` | boolean | Whether participants are prevented from editing the event |
| `participants` | array of [Participant](#participant-object) | Invitees; may include rooms |
| `resources` | array of [Event resource](#event-resource-object) | Booked rooms and equipment |
| `conferencing` | object | A [Conferencing details](#conferencing-details-object) or [Conferencing autocreate](#conferencing-autocreate-object) |
| `visibility` | string | `default` \| `public` \| `private` |
| `status` | string | `confirmed` \| `tentative` \| `maybe` \| `cancelled` |
| `capacity` | integer | Most participants allowed to attend |
| `hide_participants` | boolean | Whether the participant list is hidden from participants |
| `ical_uid` | string | iCalendar UID, shared across calendar systems. Occurrences of a series may share it; may be absent on old events |
| `html_link` | string | Link to the event in the provider's web app |
| `creator` | [Email name](#email-name-object) | Who created the event. Not every provider reports it |
| `organizer` | [Email name](#email-name-object) | The event's organizer |
| `recurrence` | array of string | `RRULE` and `EXDATE` lines; see [Recurring events](#recurring-events) |
| `master_event_id` | string | For an occurrence of a recurring event, the series' event ID |
| `original_start_time` | integer | For an occurrence of a recurring event, its original start, Unix seconds |
| `reminders` | [Reminders](#reminders-object) | Reminder settings |
| `metadata` | object | String key-value pairs set by your application |
| `notetaker` | [Event notetaker](#event-notetaker-object) | Meeting-notes bot settings |
| `created_at` | integer | Creation time, Unix seconds |
| `updated_at` | integer | Last update time, Unix seconds |

### Time object

| Field | Type | Description |
| --- | --- | --- |
| `object` | string | `time` (responses only) |
| `time` | integer | The instant, Unix seconds |
| `timezone` | string | IANA time zone the time is shown in |

### Timespan object

| Field | Type | Description |
| --- | --- | --- |
| `object` | string | `timespan` (responses only) |
| `start_time` | integer | Start, Unix seconds |
| `end_time` | integer | End, Unix seconds |
| `start_timezone` | string | IANA time zone of the start |
| `end_timezone` | string | IANA time zone of the end |

### Date object

| Field | Type | Description |
| --- | --- | --- |
| `object` | string | `date` (responses only) |
| `date` | string | The day, `YYYY-MM-DD` |

### Datespan object

| Field | Type | Description |
| --- | --- | --- |
| `object` | string | `datespan` (responses only) |
| `start_date` | string | First day, `YYYY-MM-DD` |
| `end_date` | string | Last day, `YYYY-MM-DD` |

### Participant object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Participant's address. Needed for every provider except Microsoft |
| `name` | string | Participant's name |
| `status` | string | Participant's answer: `noreply` \| `yes` \| `no` \| `maybe` |
| `comment` | string | Participant's comment on their answer |
| `phone_number` | string | Participant's phone number |

### Event resource object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Resource address; required when writing. Also usable as a calendar ID; see [resources.md](resources.md) |
| `name` | string | Display name |
| `capacity` | integer | How many people it holds |
| `building` | string | Building it's in |
| `floor_name` | string | Floor name |
| `floor_section` | string | Section of the floor. Google only |
| `floor_number` | integer | Floor number. Microsoft only |

### Conferencing details object

Use this to attach an existing meeting link. The fields that matter depend on the provider:
`meeting_code` and `password` for Zoom, `pin` and `phone` for Google Meet, `url` for all.

| Field | Type | Description |
| --- | --- | --- |
| `provider` | string | `Google Meet` \| `Zoom Meeting` \| `Microsoft Teams` \| `GoToMeeting` \| `WebEx`. Responses may also show `unknown` |
| `details` | [Conferencing config](#conferencing-config-object) | Joining details |

### Conferencing config object

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Join link |
| `meeting_code` | string | Meeting ID. Zoom |
| `password` | string | Meeting password. Zoom |
| `pin` | string | Dial-in PIN. Google Meet |
| `phone` | array of string | Dial-in numbers. Google Meet |

### Conferencing autocreate object

Use this on create or update to have the provider generate a new meeting link.

| Field | Type | Description |
| --- | --- | --- |
| `provider` | string | `Google Meet` \| `Zoom Meeting` \| `Microsoft Teams` \| `GoToMeeting` \| `WebEx` |
| `autocreate` | object | Send `{}` to request a link. Provider-specific options may go in `autocreate.settings`; Weftline passes them through without checking them |

### Reminders object

| Field | Type | Description |
| --- | --- | --- |
| `use_default` | boolean | Use the calendar's default reminders |
| `overrides` | array of [Reminder override](#reminder-override-object) | Reminders to use when `use_default` is `false` |

### Reminder override object

| Field | Type | Description |
| --- | --- | --- |
| `reminder_minutes` | integer | Minutes before the start to remind |
| `reminder_method` | string | `email` \| `popup` \| `sound` \| `display`. Google only |

### Email name object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Email address |
| `name` | string | Display name |

### Event notetaker object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | ID of the meeting-notes bot assigned to the event (responses) |
| `name` | string | Display name the bot joins with |
| `meeting_settings` | [Notetaker meeting settings](#notetaker-meeting-settings-object) | What the bot records |

### Notetaker meeting settings object

| Field | Type | Description |
| --- | --- | --- |
| `video_recording` | boolean | Record video |
| `audio_recording` | boolean | Record audio |
| `transcription` | boolean | Produce a transcript; requires `audio_recording` |

### Batch operation object

| Field | Type | Description |
| --- | --- | --- |
| `method` | string | `create` \| `update` \| `delete` |
| `event_id` | string | Event to change. Required for `update` and `delete` |
| `body` | object | For `create`, the [Create an event](#create-an-event) body; for `update`, the [Update an event](#update-an-event) body. Not used for `delete` |

### Batch result object

| Field | Type | Description |
| --- | --- | --- |
| `status` | integer | HTTP status of this operation |
| `data` | [Event](#event-object) | The created or updated event. Absent for deletes and failures |
| `error` | [Error detail](#error-detail-object) | Present when the operation failed |
| `retry_after` | integer | Seconds to wait before retrying a throttled operation; may be `0` |
| `provider_event_created` | boolean | The provider created the event before a later step failed. Don't retry this operation, or you'll get a duplicate |

### Error detail object

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | Error type, as in [Errors](README.md#errors) |
| `message` | string | What went wrong |
| `provider_error` | object | The provider's own error, when there is one |
