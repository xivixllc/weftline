# Calendars

Manage a grant's calendars, look up free/busy blocks for a set of addresses, and find meeting times that suit several participants. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/calendars` | List calendars | R2 |
| GET | `/v3/grants/{grant_id}/calendars/{calendar_id}` | Get a calendar | R2 |
| POST | `/v3/grants/{grant_id}/calendars` | Create a calendar | R2 |
| PUT | `/v3/grants/{grant_id}/calendars/{calendar_id}` | Update a calendar | R2 |
| DELETE | `/v3/grants/{grant_id}/calendars/{calendar_id}` | Delete a calendar | R2 |
| POST | `/v3/grants/{grant_id}/calendars/free-busy` | Get free/busy blocks | R2 |
| POST | `/v3/calendars/availability` | Find available meeting times | R2 |

Wherever a route takes `{calendar_id}`, you can pass `primary` for the grant's primary calendar.
Virtual calendars (calendars Weftline hosts itself, with no provider account behind them) use
the same routes and objects as provider calendars.

## List calendars

`GET /v3/grants/{grant_id}/calendars` · Release R2

Returns the calendars the grant can see, including shared calendars it doesn't own.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `metadata_pair` | string | Only calendars whose metadata has this `key:value` pair |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Calendar](#calendar-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/calendars?limit=20" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": [
    {
      "id": "cal_7d1e9a40",
      "grant_id": "grt_3f8a1c2d",
      "object": "calendar",
      "name": "Teaching schedule",
      "timezone": "Asia/Karachi",
      "read_only": false,
      "is_owned_by_user": true,
      "is_primary": true,
      "hex_color": "#0099EE"
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjIwfQ"
}
```

## Get a calendar

`GET /v3/grants/{grant_id}/calendars/{calendar_id}` · Release R2

Returns one calendar.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `calendar_id` | string | Calendar ID, or `primary` |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `select` | string | Comma-separated fields to return |

**Response** `200`: `data` is a [Calendar](#calendar-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/calendars/primary" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "cal_7d1e9a40",
    "grant_id": "grt_3f8a1c2d",
    "object": "calendar",
    "name": "Teaching schedule",
    "timezone": "Asia/Karachi",
    "read_only": false,
    "is_owned_by_user": true,
    "is_primary": true
  }
}
```

## Create a calendar

`POST /v3/grants/{grant_id}/calendars` · Release R2

Creates a secondary calendar on the grant's account, or a virtual calendar for a virtual-calendar grant.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Calendar name |
| `description` | string | No | Free-text description |
| `location` | string | No | Free-text geographic location |
| `timezone` | string | No | IANA time zone, for example `Asia/Karachi` |
| `metadata` | object | No | String key-value pairs; see [Metadata](README.md#metadata) |
| `notetaker` | [Calendar notetaker](#calendar-notetaker-object) | No | Settings for sending a meeting-notes bot to this calendar's events |

**Response** `200`: `data` is the new [Calendar](#calendar-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/calendars" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Parent meetings",
    "description": "Term 2 parent-teacher slots",
    "timezone": "Asia/Karachi",
    "metadata": { "term": "2" }
  }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "cal_92bc0e11",
    "grant_id": "grt_3f8a1c2d",
    "object": "calendar",
    "name": "Parent meetings",
    "description": "Term 2 parent-teacher slots",
    "timezone": "Asia/Karachi",
    "read_only": false,
    "is_owned_by_user": true,
    "is_primary": false,
    "metadata": { "term": "2" }
  }
}
```

## Update a calendar

`PUT /v3/grants/{grant_id}/calendars/{calendar_id}` · Release R2

Changes the fields you send and leaves the others as they are.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `calendar_id` | string | Calendar ID, or `primary` |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | Calendar name |
| `description` | string | No | Free-text description |
| `location` | string | No | Free-text geographic location |
| `timezone` | string | No | IANA time zone |
| `metadata` | object | No | String key-value pairs |
| `notetaker` | [Calendar notetaker](#calendar-notetaker-object) | No | Meeting-notes bot settings |
| `hex_color` | string | No | Background color as hex, for example `#0099EE`; empty means the provider default |
| `hex_foreground_color` | string | No | Foreground color as hex; empty means the provider default. Google only |

**Response** `200`: `data` is the updated [Calendar](#calendar-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/calendars/cal_92bc0e11" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Parent meetings (Term 2)", "hex_color": "#33AA55" }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "cal_92bc0e11",
    "grant_id": "grt_3f8a1c2d",
    "object": "calendar",
    "name": "Parent meetings (Term 2)",
    "timezone": "Asia/Karachi",
    "read_only": false,
    "is_owned_by_user": true,
    "hex_color": "#33AA55"
  }
}
```

## Delete a calendar

`DELETE /v3/grants/{grant_id}/calendars/{calendar_id}` · Release R2

Deletes a calendar the grant owns.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `calendar_id` | string | Calendar ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/calendars/cal_92bc0e11" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M" }
```

## Get free/busy blocks

`POST /v3/grants/{grant_id}/calendars/free-busy` · Release R2

Returns the busy periods for each listed address in a time window, as seen from the grant's
account. Each address gets its own entry; an address that can't be read gets an error entry
instead of failing the whole request.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `start_time` | integer | Yes | Window start, Unix seconds |
| `end_time` | integer | Yes | Window end, Unix seconds |
| `emails` | array of string | Yes | Addresses to check |
| `tentative_as_busy` | boolean | No | Count tentative events as busy. Default `true` |

**Response** `200`: `data` is an array with one entry per address, each either a [Free/busy](#freebusy-object) or a [Free/busy error](#freebusy-error-object). Tell them apart by `object`.

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/calendars/free-busy" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": 1767240000,
    "end_time": 1767272400,
    "emails": ["teacher@acadpak.com", "principal@acadpak.com"]
  }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": [
    {
      "object": "free_busy",
      "email": "teacher@acadpak.com",
      "time_slots": [
        { "start_time": 1767247200, "end_time": 1767250800, "status": "busy" }
      ]
    },
    {
      "object": "error",
      "email": "principal@acadpak.com",
      "error": "Unable to read this calendar"
    }
  ]
}
```

## Find available meeting times

`POST /v3/calendars/availability` · Release R2

Computes the time slots in a window when the participants are free for a meeting of a given
length, honoring open hours, buffers and rounding. With a round-robin method it also returns the
order in which participants should be booked. This route is application-level: there is no
`{grant_id}`, and participants are identified by email address.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `start_time` | integer | Yes | Window start, Unix seconds |
| `end_time` | integer | Yes | Window end, Unix seconds |
| `participants` | array of [Availability participant](#availability-participant-object) | Yes | Whose calendars to check |
| `duration_minutes` | integer | Yes | Length of the meeting in minutes |
| `interval_minutes` | integer | No | Step between candidate start times, in minutes. For example 30-minute meetings with a 15-minute interval give 10:00–10:30, 10:15–10:45, … |
| `round_to` | integer | No | Round slot starts to this many minutes; a multiple of 5, at most 60. Default 15. Overrides `round_to_30_minutes` |
| `round_to_30_minutes` | boolean | No | Deprecated; use `round_to`. Start slots only on the hour or half hour |
| `availability_rules` | [Availability rules](#availability-rules-object) | No | Method, buffers, default open hours and round-robin settings |

**Response** `200`: `data` is an [Availability result](#availability-result-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/calendars/availability" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": 1767240000,
    "end_time": 1767326400,
    "duration_minutes": 30,
    "interval_minutes": 15,
    "participants": [
      { "email": "teacher@acadpak.com", "calendar_ids": ["primary"] },
      {
        "email": "counselor@acadpak.com",
        "open_hours": [
          { "days": [1, 2, 3, 4, 5], "timezone": "Asia/Karachi", "start": "9:00", "end": "14:00", "exdates": ["2026-01-02"] }
        ]
      }
    ],
    "availability_rules": {
      "availability_method": "max-fairness",
      "buffer": { "before": 10, "after": 5 },
      "default_open_hours": [
        { "days": [1, 2, 3, 4, 5], "timezone": "Asia/Karachi", "start": "8:00", "end": "16:00", "exdates": [] }
      ],
      "round_robin_event_id": "parent-meeting"
    }
  }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "order": ["counselor@acadpak.com", "teacher@acadpak.com"],
    "time_slots": [
      { "emails": ["teacher@acadpak.com"], "start_time": 1767243600, "end_time": 1767245400 },
      { "emails": ["counselor@acadpak.com", "teacher@acadpak.com"], "start_time": 1767244500, "end_time": 1767246300 }
    ]
  }
}
```

## Objects

### Calendar object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Calendar ID |
| `grant_id` | string | Grant the calendar belongs to |
| `object` | string | Always `calendar` |
| `name` | string | Calendar name |
| `timezone` | string | IANA time zone |
| `read_only` | boolean | Whether the calendar's events can't be edited through this grant |
| `is_owned_by_user` | boolean | Whether the grant's account owns the calendar (rather than having it shared) |
| `description` | string | Free-text description |
| `location` | string | Free-text geographic location |
| `hex_color` | string | Background color as hex; empty means the provider default |
| `hex_foreground_color` | string | Foreground color as hex; empty means the provider default. Google only |
| `is_primary` | boolean | Whether this is the account's primary calendar |
| `metadata` | object | String key-value pairs set by your application |
| `notetaker` | [Calendar notetaker](#calendar-notetaker-object) | Meeting-notes bot settings |

### Calendar notetaker object

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | Display name the bot joins meetings with |
| `meeting_settings` | [Notetaker meeting settings](#notetaker-meeting-settings-object) | What the bot records |
| `rules` | [Calendar notetaker rules](#calendar-notetaker-rules-object) | Which events the bot joins |

### Notetaker meeting settings object

| Field | Type | Description |
| --- | --- | --- |
| `video_recording` | boolean | Record video |
| `audio_recording` | boolean | Record audio |
| `transcription` | boolean | Produce a transcript; requires `audio_recording` |

### Calendar notetaker rules object

| Field | Type | Description |
| --- | --- | --- |
| `event_selection` | array of string | Event kinds the bot joins; the union of the values given. `internal` (all participants share the host's domain) \| `external` (some participant has another domain) \| `own_events` (the grant is the host) \| `participant_only` (the grant attends but doesn't host) \| `all` |
| `participant_filter` | [Participant filter](#participant-filter-object) | Limits on participant count, applied on top of `event_selection`. Absent means no limit |

### Participant filter object

| Field | Type | Description |
| --- | --- | --- |
| `participants_gte` | integer | Join only events with at least this many participants |
| `participants_lte` | integer | Join only events with at most this many participants |

### Free/busy object

| Field | Type | Description |
| --- | --- | --- |
| `object` | string | `free_busy` |
| `email` | string | The address checked |
| `time_slots` | array of [Free/busy time slot](#freebusy-time-slot-object) | Busy periods in the window |

### Free/busy time slot object

| Field | Type | Description |
| --- | --- | --- |
| `start_time` | integer | Slot start, Unix seconds |
| `end_time` | integer | Slot end, Unix seconds |
| `status` | string | Slot status, normally `busy` |

### Free/busy error object

| Field | Type | Description |
| --- | --- | --- |
| `object` | string | `error` |
| `email` | string | The address that couldn't be checked |
| `error` | string | Why the lookup failed |

### Availability participant object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Participant's address. Required |
| `calendar_ids` | array of string | Calendars to check; defaults to the participant's primary calendar |
| `open_hours` | array of [Open hours](#open-hours-object) | This participant's bookable hours; replaces `default_open_hours` |
| `specific_time_availability` | array of [Specific time availability](#specific-time-availability-object) | Per-date hours that replace `open_hours` on those dates |

### Open hours object

| Field | Type | Description |
| --- | --- | --- |
| `days` | array of integer | Weekdays the hours apply to, `0` (Sunday) to `6` (Saturday) |
| `timezone` | string | IANA time zone for `start` and `end` |
| `start` | string | Start time, 24-hour, no leading zero, for example `9:00` |
| `end` | string | End time, 24-hour, no leading zero, for example `17:00` |
| `exdates` | array of string | Dates (`YYYY-MM-DD`) excluded from these hours |

### Specific time availability object

| Field | Type | Description |
| --- | --- | --- |
| `date` | string | The date, `YYYY-MM-DD` |
| `start` | string | Start time, 24-hour, no leading zero |
| `end` | string | End time, 24-hour, no leading zero |
| `timezone` | string | IANA time zone for `start` and `end` |

### Availability rules object

| Field | Type | Description |
| --- | --- | --- |
| `availability_method` | string | How slots are chosen. `collective` (everyone must be free) \| `max-fairness` (round-robin, spreading bookings evenly across participants) \| `max-availability` (round-robin, offering as many slots as possible) |
| `buffer` | [Meeting buffer](#meeting-buffer-object) | Gap to keep around existing meetings |
| `default_open_hours` | array of [Open hours](#open-hours-object) | Open hours for every participant that has none of its own |
| `round_robin_event_id` | string | Identifier, stored on events, used to work out the round-robin order |
| `round_robin_group_id` | string | Alternate name for `round_robin_event_id` sent by some v3 SDK versions; treated the same |
| `tentative_as_busy` | boolean | Count tentative events as busy. Default `true`. Applies to Microsoft and Exchange calendars |

### Meeting buffer object

| Field | Type | Description |
| --- | --- | --- |
| `before` | integer | Minutes to keep free before existing meetings, in steps of 5. Default 0 |
| `after` | integer | Minutes to keep free after existing meetings, in steps of 5. Default 0 |

### Availability result object

| Field | Type | Description |
| --- | --- | --- |
| `order` | array of string | Round-robin methods only: participant emails in the order they should be booked next |
| `time_slots` | array of [Availability time slot](#availability-time-slot-object) | Bookable slots |

### Availability time slot object

| Field | Type | Description |
| --- | --- | --- |
| `emails` | array of string | Participants free for this slot |
| `start_time` | integer | Slot start, Unix seconds |
| `end_time` | integer | Slot end, Unix seconds |
