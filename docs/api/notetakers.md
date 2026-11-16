# Meeting notes (notetakers)

A notetaker is a bot that joins a video meeting, records it and produces a transcript you can download afterwards. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

Every route exists in two forms. Grant-scoped routes (`/v3/grants/{grant_id}/notetakers/...`) tie the notetaker to a connected account. App-level routes (`/v3/notetakers/...`) create and manage notetakers that belong to the application and no grant. Both take the application API key.

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/notetakers` | List a grant's notetakers | R4 |
| GET | `/v3/notetakers` | List app-level notetakers | R4 |
| POST | `/v3/grants/{grant_id}/notetakers` | Invite a notetaker for a grant | R4 |
| POST | `/v3/notetakers` | Invite an app-level notetaker | R4 |
| GET | `/v3/grants/{grant_id}/notetakers/{notetaker_id}` | Get a notetaker | R4 |
| GET | `/v3/notetakers/{notetaker_id}` | Get an app-level notetaker | R4 |
| PATCH | `/v3/grants/{grant_id}/notetakers/{notetaker_id}` | Update a notetaker | R4 |
| PATCH | `/v3/notetakers/{notetaker_id}` | Update an app-level notetaker | R4 |
| DELETE | `/v3/grants/{grant_id}/notetakers/{notetaker_id}` | Delete a notetaker | R4 |
| DELETE | `/v3/grants/{grant_id}/notetakers/{notetaker_id}/cancel` | Cancel a scheduled notetaker | R4 |
| DELETE | `/v3/notetakers/{notetaker_id}/cancel` | Cancel a scheduled app-level notetaker | R4 |
| POST | `/v3/grants/{grant_id}/notetakers/{notetaker_id}/leave` | Make a notetaker leave its meeting | R4 |
| POST | `/v3/notetakers/{notetaker_id}/leave` | Make an app-level notetaker leave its meeting | R4 |
| GET | `/v3/grants/{grant_id}/notetakers/{notetaker_id}/media` | Get recording and transcript links | R4 |
| GET | `/v3/notetakers/{notetaker_id}/media` | Get app-level recording and transcript links | R4 |

## Meeting states

A notetaker's `state` moves through these values. Each change fires a `notetaker.meeting_state` webhook; finished media fires `notetaker.media`. Creation, updates and deletion fire `notetaker.created`, `notetaker.updated` and `notetaker.deleted`. See [webhooks.md](webhooks.md).

| `state` | Meaning |
| --- | --- |
| `scheduled` | Waiting for its join time |
| `connecting` | Opening the meeting link |
| `waiting_for_entry` | In the lobby, waiting to be let in |
| `failed_entry` | Couldn't get into the meeting |
| `attending` | In the meeting and recording |
| `media_processing` | Meeting over; recording and transcript are being prepared |
| `media_available` | Media is ready from [Get recording and transcript links](#get-recording-and-transcript-links) |
| `media_error` | Media processing failed |
| `media_deleted` | Media has expired or been removed |

## List notetakers

`GET /v3/grants/{grant_id}/notetakers` · Release R4

`GET /v3/notetakers` · Release R4

Returns notetakers for a grant, or the application's app-level notetakers.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address (grant-scoped form only) |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `state` | string | Only notetakers in this [state](#meeting-states) |
| `join_time_start` | integer | Only notetakers joining at or after this time, Unix seconds |
| `join_time_end` | integer | Only notetakers joining at or before this time, Unix seconds |
| `order_by` | string | `name` \| `join_time` \| `created_at`. Default `created_at`. |
| `order_direction` | string | `asc` \| `desc`. Default `asc`. |
| `prev_page_token` | string | The `prev_cursor` from a later page, to page backwards |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Notetaker](#notetaker-object). The response also carries `next_cursor` and, after the first page, `prev_cursor`.

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/notetakers?state=scheduled&order_by=join_time" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD5B1A2B3C4D5E6F7G8H9J0K",
  "data": [
    {
      "id": "ntk_6Qp3Vz",
      "object": "notetaker",
      "name": "Acadpak Notes",
      "join_time": 1767589200,
      "meeting_link": "https://meet.google.com/abc-defg-hij",
      "meeting_provider": "Google Meet",
      "state": "scheduled",
      "meeting_settings": { "video_recording": true, "audio_recording": true, "transcription": true }
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjUwfQ"
}
```

## Invite a notetaker

`POST /v3/grants/{grant_id}/notetakers` · Release R4

`POST /v3/notetakers` · Release R4

Sends a notetaker to a meeting link, now or at a set time.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address (grant-scoped form only) |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `meeting_link` | string | Yes | Meeting URL the bot joins (Google Meet, Microsoft Teams or Zoom) |
| `join_time` | integer | No | When to join, Unix seconds. Omit to join right away; a past time returns `400`. |
| `name` | string | No | Display name shown in the meeting. Weftline uses a default name if omitted. |
| `meeting_settings` | [Meeting settings](#meeting-settings-object) | No | What to capture. Each setting defaults to `true`. |

**Response** `200`: `data` is a [Notetaker](#notetaker-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/notetakers" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_link": "https://meet.google.com/abc-defg-hij",
    "join_time": 1767589200,
    "name": "Acadpak Notes",
    "meeting_settings": { "video_recording": false, "audio_recording": true, "transcription": true }
  }'
```

```json
{
  "request_id": "req_01JD5B2B3C4D5E6F7G8H9J0K1L",
  "data": {
    "id": "ntk_6Qp3Vz",
    "object": "notetaker",
    "name": "Acadpak Notes",
    "join_time": 1767589200,
    "meeting_link": "https://meet.google.com/abc-defg-hij",
    "meeting_provider": "Google Meet",
    "state": "scheduled",
    "meeting_settings": { "video_recording": false, "audio_recording": true, "transcription": true }
  }
}
```

## Get a notetaker

`GET /v3/grants/{grant_id}/notetakers/{notetaker_id}` · Release R4

`GET /v3/notetakers/{notetaker_id}` · Release R4

Returns one notetaker and its current state.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address (grant-scoped form only) |
| `notetaker_id` | string | Notetaker ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `select` | string | Comma-separated fields to return |

**Response** `200`: `data` is a [Notetaker](#notetaker-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/notetakers/ntk_8Wd1Kc" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD5B3C4D5E6F7G8H9J0K1L2M",
  "data": {
    "id": "ntk_8Wd1Kc",
    "object": "notetaker",
    "name": "Acadpak Notes",
    "join_time": 1767592800,
    "meeting_link": "https://meet.jit.si/acadpak-faculty-sync",
    "state": "attending",
    "meeting_settings": { "video_recording": true, "audio_recording": true, "transcription": true }
  }
}
```

## Update a notetaker

`PATCH /v3/grants/{grant_id}/notetakers/{notetaker_id}` · Release R4

`PATCH /v3/notetakers/{notetaker_id}` · Release R4

Changes a notetaker that hasn't joined yet. Send only the fields to change.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address (grant-scoped form only) |
| `notetaker_id` | string | Notetaker ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `join_time` | integer | No | New join time, Unix seconds; must not be in the past |
| `name` | string | No | New display name |
| `meeting_settings` | [Meeting settings](#meeting-settings-object) | No | Settings to change; omitted settings keep their values |

**Response** `200`: `data` is a [Notetaker](#notetaker-object).

**Example**

```bash
curl -s -X PATCH "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/notetakers/ntk_6Qp3Vz" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "join_time": 1767596400, "meeting_settings": { "video_recording": true } }'
```

```json
{
  "request_id": "req_01JD5B4D5E6F7G8H9J0K1L2M3N",
  "data": {
    "id": "ntk_6Qp3Vz",
    "object": "notetaker",
    "name": "Acadpak Notes",
    "join_time": 1767596400,
    "meeting_link": "https://meet.google.com/abc-defg-hij",
    "state": "scheduled",
    "meeting_settings": { "video_recording": true, "audio_recording": true, "transcription": true }
  }
}
```

## Delete a notetaker

`DELETE /v3/grants/{grant_id}/notetakers/{notetaker_id}` · Release R4

> Provisional: this shape comes from client code, not a published contract.

Removes a grant's notetaker. No app-level form of this route is known; use [Cancel a scheduled notetaker](#cancel-a-scheduled-notetaker) for app-level notetakers.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `notetaker_id` | string | Notetaker ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/notetakers/ntk_6Qp3Vz" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD5B5E6F7G8H9J0K1L2M3N4P" }
```

## Cancel a scheduled notetaker

`DELETE /v3/grants/{grant_id}/notetakers/{notetaker_id}/cancel` · Release R4

`DELETE /v3/notetakers/{notetaker_id}/cancel` · Release R4

Calls off a notetaker before it joins its meeting.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address (grant-scoped form only) |
| `notetaker_id` | string | Notetaker ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/notetakers/ntk_6Qp3Vz/cancel" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD5B6F7G8H9J0K1L2M3N4P5Q" }
```

## Make a notetaker leave its meeting

`POST /v3/grants/{grant_id}/notetakers/{notetaker_id}/leave` · Release R4

`POST /v3/notetakers/{notetaker_id}/leave` · Release R4

Tells a notetaker that's in a meeting to leave now. The notetaker and any media it produces are kept. Send no body.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address (grant-scoped form only) |
| `notetaker_id` | string | Notetaker ID |

**Response** `200`: `data` is a [Leave result](#leave-result-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/notetakers/ntk_8Wd1Kc/leave" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD5B7G8H9J0K1L2M3N4P5Q6R",
  "data": { "id": "ntk_8Wd1Kc", "object": "notetaker_leave_response", "message": "Notetaker is leaving the meeting" }
}
```

## Get recording and transcript links

`GET /v3/grants/{grant_id}/notetakers/{notetaker_id}/media` · Release R4

`GET /v3/notetakers/{notetaker_id}/media` · Release R4

Returns time-limited download links for a notetaker's media once its state is `media_available`. Each file has its own `expires_at`; call again for fresh links.

The known contract covers `recording` and `transcript` only. Summary, action-item and thumbnail files aren't part of it yet, so Weftline doesn't promise fields for them.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address (grant-scoped form only) |
| `notetaker_id` | string | Notetaker ID |

**Response** `200`: `data` is a [Notetaker media](#notetaker-media-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/grt_7Hq2Lm/notetakers/ntk_6Qp3Vz/media" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD5B8H9J0K1L2M3N4P5Q6R7S",
  "data": {
    "recording": {
      "url": "https://weftline.acadpak.com/media/ntk_6Qp3Vz/recording.mp4?sig=4f9a",
      "name": "recording.mp4",
      "type": "video/mp4",
      "size": 48213504,
      "created_at": 1767598200,
      "expires_at": 1768203000,
      "ttl": 604800
    },
    "transcript": {
      "url": "https://weftline.acadpak.com/media/ntk_6Qp3Vz/transcript.json?sig=8c21",
      "name": "transcript.json",
      "type": "application/json",
      "size": 51234,
      "created_at": 1767598200,
      "expires_at": 1768203000,
      "ttl": 604800
    }
  }
}
```

## Objects

### Notetaker object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Notetaker ID |
| `object` | string | Always `notetaker` |
| `name` | string | Display name shown in the meeting |
| `join_time` | integer | When the notetaker joins (or joined), Unix seconds |
| `meeting_link` | string | Meeting URL |
| `meeting_provider` | string | `Google Meet` \| `Microsoft Teams` \| `Zoom Meeting` |
| `state` | string | Current [meeting state](#meeting-states): `scheduled` \| `connecting` \| `waiting_for_entry` \| `failed_entry` \| `attending` \| `media_processing` \| `media_available` \| `media_error` \| `media_deleted` |
| `meeting_settings` | [Meeting settings](#meeting-settings-object) | What the notetaker captures |
| `calendar_id` | string | Calendar of the linked event, when the notetaker was added through an event |
| `event_id` | string | Linked calendar event, when the notetaker was added through an event |
| `message` | string | Status message; present on some responses only |

### Meeting settings object

| Field | Type | Description |
| --- | --- | --- |
| `video_recording` | boolean | Record video. Default `true`. |
| `audio_recording` | boolean | Record audio. Default `true`. |
| `transcription` | boolean | Transcribe the audio. Default `true`. Needs `audio_recording` set to `true`. |

### Notetaker media object

| Field | Type | Description |
| --- | --- | --- |
| `recording` | [Media file](#media-file-object) | The meeting recording, usually `video/mp4`; absent if not captured |
| `transcript` | [Media file](#media-file-object) | The transcript, usually `application/json`; absent if not captured |

### Media file object

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Download link |
| `name` | string | File name |
| `type` | string | MIME type |
| `size` | integer | Size in bytes |
| `created_at` | integer | When the file was stored, Unix seconds |
| `expires_at` | integer | When the file is deleted and the link stops working, Unix seconds |
| `ttl` | integer | Seconds left until `expires_at` |

### Leave result object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Notetaker ID |
| `object` | string | Always `notetaker_leave_response` |
| `message` | string | Human-readable outcome |
