# Send and tracking activity, metrics and alerts

Inspect per-recipient delivery events and open/click events, read aggregated send and engagement metrics, and manage rules that alert you when send health degrades. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

> Provisional: request and response shapes in this file come from client code, not a published contract. Confirm them before relying on them.

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/activity/send` | List send events | R3 |
| GET | `/v3/activity/send/{event_id}` | Get a send event | R3 |
| GET | `/v3/activity/send/messages/{message_id}` | Get send activity for a message | R3 |
| GET | `/v3/activity/tracking` | List tracking events | R3 |
| GET | `/v3/activity/tracking/{event_id}` | Get a tracking event | R3 |
| GET | `/v3/activity/tracking/messages/{message_id}` | Get tracking activity for a message | R3 |
| GET | `/v3/metrics/send` | Send metrics breakdown | R3 |
| GET | `/v3/metrics/send/summary` | Send health and totals | R3 |
| GET | `/v3/metrics/send/timeseries` | Send metrics over time | R3 |
| GET | `/v3/metrics/tracking` | Engagement metrics breakdown | R3 |
| GET | `/v3/metrics/tracking/summary` | Engagement totals and rates | R3 |
| GET | `/v3/metrics/tracking/timeseries` | Engagement metrics over time | R3 |
| GET | `/v3/alerts/send` | List send alert rules | R3 |
| POST | `/v3/alerts/send` | Create a send alert rule | R3 |
| GET | `/v3/alerts/send/{alert_id}` | Get a send alert rule | R3 |
| PUT | `/v3/alerts/send/{alert_id}` | Update a send alert rule | R3 |
| DELETE | `/v3/alerts/send/{alert_id}` | Delete a send alert rule | R3 |

Notes that apply to every route in this file:

- **Application API key only.** These routes cover the whole application. A grant access token gets `403 forbidden`. Narrow results to one account with the `grant_id` filter instead.
- **90-day retention.** Activity events are kept for 90 days. An activity window that ends earlier returns nothing.
- **Don't send empty filters.** A query parameter with an empty value returns `400 invalid_request_error`. Leave unused filters out.
- **Rates are percentages** from 0 to 100. A rate of `null` means there was no data to compute it, which is different from `0`.
- **Two time formats.** Activity routes take `start` and `end` as Unix seconds. Metrics routes take UTC calendar days as `YYYY-MM-DD`, both inclusive.

## List send events

`GET /v3/activity/send` · Release R3

Returns one page of delivery events (one row per recipient per event), newest first by default.

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `start` | integer | Window start, Unix seconds. Default: UTC midnight six days before `end`. |
| `end` | integer | Window end, Unix seconds, inclusive. Must fall within the last 90 days. Default: now. |
| `order` | string | `desc` (default, newest first) \| `asc`. |
| `event_type` | string | Repeat the parameter for several values; a comma-joined value is rejected. `accepted` \| `delivered` \| `bounced` \| `complaint` \| `rejected`. |
| `bounce_class` | string | `hard` \| `soft` \| `undetermined`. |
| `sending_domain` | string | Only mail sent from this domain. |
| `from` | string | Only mail sent from this address. |
| `grant_id` | string | Only mail sent by this grant. |
| `recipient` | string | Only this recipient address. |
| `recipient_domain` | string | Only recipients at this domain. |
| `message_id` | string | Only this message. |
| `thread_id` | string | Only this thread. |
| `limit` | integer | Page size. Default 50. See [pagination](README.md#pagination-and-field-selection). |
| `page_token` | string | `next_cursor` from the previous page. Send the same `start` and `end` with it. |

**Response** `200`: `data` is an array of [Send event](#send-event-object), with `next_cursor` when more pages exist.

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/activity/send?event_type=bounced&event_type=complaint&recipient_domain=gmail.com&limit=10" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "event_type": "bounced",
      "bounce_class": "hard",
      "timestamp": 1730000000,
      "application_id": "app_51f0c3",
      "grant_id": "grt_9a8b7c6d",
      "message_id": "msg_8f2c41aa",
      "thread_id": "thr_2210ef9c",
      "from": "admissions@acadpak.com",
      "sending_domain": "acadpak.com",
      "recipient": "former.student@gmail.com",
      "recipient_domain": "gmail.com",
      "subject": "Your offer from Acadpak",
      "reason": "Mailbox does not exist",
      "detail": {
        "smtp_response": "550 5.1.1 The email account that you tried to reach does not exist",
        "bounce_type": "Permanent",
        "bounce_subtype": "General",
        "diagnostic_code": "smtp; 550 5.1.1"
      }
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjEwfQ"
}
```

## Get a send event

`GET /v3/activity/send/{event_id}` · Release R3

Returns one send event with its provider detail.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `event_id` | string | Event ID, 64 hexadecimal characters. |

**Response** `200`: `data` is a [Send event](#send-event-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/activity/send/9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD...", "data": { "id": "9f86d081...0a08", "event_type": "delivered", "timestamp": 1730000000, "recipient": "amina@acadpak.com" } }
```

## Get send activity for a message

`GET /v3/activity/send/messages/{message_id}` · Release R3

Returns every recipient of one message with its current status and full event timeline.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `message_id` | string | A Weftline message ID, or the message's RFC 5322 `Message-ID` including the angle brackets. URL-encode it: `<abc/def@mail.acadpak.com>` becomes `%3Cabc%2Fdef@mail.acadpak.com%3E`. |

**Response** `200`: `data` is a [Send message activity](#send-message-activity-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/activity/send/messages/%3Cabc%2Fdef@mail.acadpak.com%3E" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "message": {
      "message_id": "msg_8f2c41aa",
      "thread_id": "thr_2210ef9c",
      "grant_id": "grt_9a8b7c6d",
      "application_id": "app_51f0c3",
      "from": "admissions@acadpak.com",
      "sending_domain": "acadpak.com",
      "subject": "Your offer from Acadpak",
      "sent_at": 1730000000,
      "last_event_at": 1730000042
    },
    "recipients": [
      {
        "recipient": "amina@acadpak.com",
        "recipient_domain": "acadpak.com",
        "current_status": "delivered",
        "events": [
          { "id": "1b4f0e98...", "event_type": "accepted", "timestamp": 1730000001, "reason": "" },
          { "id": "60303ae2...", "event_type": "delivered", "timestamp": 1730000042, "reason": "" }
        ]
      }
    ]
  }
}
```

## List tracking events

`GET /v3/activity/tracking` · Release R3

Returns one page of opens and link clicks on messages sent with tracking turned on (see `tracking_options` in [messages.md](messages.md#send-a-message)).

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `start` | integer | Window start, Unix seconds. Same default as [send events](#list-send-events). |
| `end` | integer | Window end, Unix seconds, inclusive, within the last 90 days. Default: now. |
| `order` | string | `desc` (default) \| `asc`. |
| `event_type` | string | Repeatable. `opened` \| `link_clicked`. |
| `sending_domain` | string | Only mail sent from this domain. |
| `from` | string | Only mail sent from this address. |
| `grant_id` | string | Only mail sent by this grant. |
| `message_id` | string | Only this message. |
| `thread_id` | string | Only this thread. |
| `label` | string | Only messages sent with this tracking label. |
| `limit` | integer | Page size. Default 50. |
| `page_token` | string | `next_cursor` from the previous page. |

**Response** `200`: `data` is an array of [Tracking event](#tracking-event-object), with `next_cursor` when more pages exist.

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/activity/tracking?event_type=link_clicked&label=autumn-offers" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
      "event_type": "link_clicked",
      "timestamp": 1730003600,
      "application_id": "app_51f0c3",
      "grant_id": "grt_9a8b7c6d",
      "message_id": "msg_8f2c41aa",
      "thread_id": "thr_2210ef9c",
      "from": "admissions@acadpak.com",
      "sending_domain": "acadpak.com",
      "label": "autumn-offers",
      "is_first": true,
      "url": "https://acadpak.com/offers/accept",
      "link_index": 0,
      "ip": "203.0.113.24",
      "user_agent": "Mozilla/5.0"
    }
  ]
}
```

## Get a tracking event

`GET /v3/activity/tracking/{event_id}` · Release R3

Returns one open or link click.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `event_id` | string | Event ID, 64 hexadecimal characters. |

**Response** `200`: `data` is a [Tracking event](#tracking-event-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/activity/tracking/2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD...", "data": { "id": "2c26b46b...e7ae", "event_type": "opened", "is_first": true, "timestamp": 1730003000 } }
```

## Get tracking activity for a message

`GET /v3/activity/tracking/messages/{message_id}` · Release R3

Returns open and click totals for one message, per-link click counts, and its newest 100 interactions.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `message_id` | string | A Weftline message ID or a URL-encoded RFC 5322 `Message-ID`, as for [send activity](#get-send-activity-for-a-message). |

**Response** `200`: `data` is a [Tracking message activity](#tracking-message-activity-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/activity/tracking/messages/msg_8f2c41aa" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "message_id": "msg_8f2c41aa",
    "thread_id": "thr_2210ef9c",
    "grant_id": "grt_9a8b7c6d",
    "from": "admissions@acadpak.com",
    "sending_domain": "acadpak.com",
    "label": "autumn-offers",
    "tracking": { "opens": true, "links": true },
    "opens": { "total": 3, "first_at": 1730003000, "last_at": 1730090000 },
    "clicks": {
      "total": 1, "first_at": 1730003600, "last_at": 1730003600,
      "links": [ { "link_index": 0, "url": "https://acadpak.com/offers/accept", "clicks": 1 } ]
    },
    "events": [
      { "id": "2c26b46b...e7ae", "event_type": "link_clicked", "timestamp": 1730003600, "is_first": true, "url": "https://acadpak.com/offers/accept", "link_index": 0, "ip": "203.0.113.24", "user_agent": "Mozilla/5.0" }
    ]
  }
}
```

## Metrics query parameters

All six metrics routes accept the window parameters. Timeseries and breakdown routes add their own.

| Name | Type | Routes | Description |
| --- | --- | --- | --- |
| `start` | string | all | First UTC day, `YYYY-MM-DD`. Default: six days before `end`. |
| `end` | string | all | Last UTC day, `YYYY-MM-DD`, inclusive. Default: today. |
| `sending_domain` | string | all | Only mail sent from this domain. |
| `granularity` | string | timeseries | Bucket size: `auto` \| `day` \| `week` \| `month`. `auto` (default) picks `day` up to 21 days, `week` up to 92 days, otherwise `month`. |
| `group_by` | string | breakdown | Send: `sending_domain` \| `agent_account` \| `recipient_domain`. Tracking: `sending_domain` \| `agent_account`. Default `sending_domain`. |
| `sort` | string | breakdown | `<key>:<asc\|desc>`. Send keys: `key`, `sent`, `delivery_rate`, `bounce_rate`, `complaint_rate` (default `sent:desc`). Tracking keys: `key`, `tracked_opens`, `tracked_links`, `open_rate`, `click_rate` (default `tracked_opens:desc`). |
| `limit` | integer | breakdown | Rows to return, 1 to 100. Rows past the limit are summed into one `(others)` row. This is not a page size; breakdowns have no cursor. |

`agent_account` groups by the sending grant.

## Send metrics breakdown

`GET /v3/metrics/send` · Release R3

Splits send counts and rates across one dimension. A `recipient_domain` breakdown only covers the last 90 days; when the requested window falls entirely outside that, `window` is `null`.

**Query parameters**: `start`, `end`, `sending_domain`, `group_by`, `sort`, `limit` (see [above](#metrics-query-parameters)).

**Response** `200`: `data` is a [Send metrics breakdown](#send-metrics-breakdown-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/metrics/send?start=2026-10-01&end=2026-10-31&group_by=recipient_domain&sort=bounce_rate:desc&limit=5" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "group_by": "recipient_domain",
    "window": { "start": "2026-10-01", "end": "2026-10-31" },
    "rows": [
      { "key": "gmail.com", "sent": 1200, "delivered": 1170, "bounced_hard": 18, "complaints": 1, "delivery_rate": 97.5, "bounce_rate": 1.5, "complaint_rate": 0.08, "is_others": false },
      { "key": "(others)", "sent": 300, "delivered": 296, "bounced_hard": 2, "complaints": 0, "delivery_rate": 98.67, "bounce_rate": 0.67, "complaint_rate": 0, "is_others": true }
    ]
  }
}
```

## Send health and totals

`GET /v3/metrics/send/summary` · Release R3

Returns send totals and graded rates for the window, compared with the preceding period of equal length, plus an overall health grade. Health always covers the last seven days, whatever window you ask for.

**Query parameters**: `start`, `end`, `sending_domain` (see [above](#metrics-query-parameters)).

**Response** `200`: `data` is a [Send metrics summary](#send-metrics-summary-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/metrics/send/summary?sending_domain=acadpak.com" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "health": {
      "state": "critical",
      "window": { "start": "2026-11-09", "end": "2026-11-15" },
      "min_assess_volume": 100,
      "findings": [
        {
          "rule": "concentration",
          "severity": "high",
          "title": "Hard bounces concentrate on example.net",
          "evidence": {
            "metric": "bounce_rate", "value": 12.5, "threshold": 10,
            "dimension": "recipient_domain", "dimension_value": "example.net",
            "totals": { "sent": 400, "delivered": 345, "bounced_hard": 50, "bounced_soft": 3, "bounced_undetermined": 0, "rejected": 2, "complaints": 0 },
            "window": { "start": "2026-11-09", "end": "2026-11-15" }
          },
          "recommendation": "Remove invalid example.net addresses from the list.",
          "logs_filter": { "event_type": "bounced", "recipient_domain": "example.net" }
        }
      ]
    },
    "totals": { "sent": 400, "delivered": 345, "bounced_hard": 50, "bounced_soft": 3, "bounced_undetermined": 0, "rejected": 2, "complaints": 0 },
    "metrics": {
      "delivery_rate": { "value": 86.25, "delta_pp": -9.5, "prior_value": 95.75, "status": "crit" },
      "bounce_rate": { "value": 12.5, "delta_pp": 4, "prior_value": 8.5, "status": "crit" },
      "complaint_rate": { "value": 0, "delta_pp": null, "prior_value": null, "status": "ok" }
    },
    "prior_period": null
  }
}
```

## Send metrics over time

`GET /v3/metrics/send/timeseries` · Release R3

Returns send counts and rates per day, week or month.

**Query parameters**: `start`, `end`, `sending_domain`, `granularity` (see [above](#metrics-query-parameters)).

**Response** `200`: `data` is a [Send metrics timeseries](#send-metrics-timeseries-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/metrics/send/timeseries?start=2026-08-01&granularity=week" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "granularity": "week",
    "buckets": [
      { "start": "2026-08-01", "end": "2026-08-07", "sent": 820, "delivered": 810, "bounced_hard": 4, "bounced_soft": 3, "bounced_undetermined": 0, "rejected": 1, "complaints": 0, "bounce_rate": 0.85, "complaint_rate": 0 }
    ]
  }
}
```

## Engagement metrics breakdown

`GET /v3/metrics/tracking` · Release R3

Splits open and click counts and rates across one dimension.

**Query parameters**: `start`, `end`, `sending_domain`, `group_by`, `sort`, `limit` (see [above](#metrics-query-parameters)).

**Response** `200`: `data` is a [Tracking metrics breakdown](#tracking-metrics-breakdown-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/metrics/tracking?group_by=agent_account&sort=open_rate:desc" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "group_by": "agent_account",
    "window": { "start": "2026-11-09", "end": "2026-11-15" },
    "rows": [
      { "key": "admissions@acadpak.com", "tracked_opens": 500, "tracked_links": 480, "opened": 310, "clicked": 95, "opens_total": 702, "clicks_total": 140, "open_rate": 62, "click_rate": 19.79, "is_others": false }
    ]
  }
}
```

## Engagement totals and rates

`GET /v3/metrics/tracking/summary` · Release R3

Returns open and click totals and rates for the window, compared with the preceding period.

**Query parameters**: `start`, `end`, `sending_domain` (see [above](#metrics-query-parameters)).

**Response** `200`: `data` is a [Tracking metrics summary](#tracking-metrics-summary-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/metrics/tracking/summary?start=2026-10-01&end=2026-10-31" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "totals": { "tracked_opens": 2000, "tracked_links": 1900, "opened": 1150, "clicked": 300, "opens_total": 2600, "clicks_total": 410 },
    "metrics": {
      "open_rate": { "value": 57.5, "delta_pp": 2.1, "prior_value": 55.4 },
      "click_rate": { "value": 15.79, "delta_pp": -0.4, "prior_value": 16.19 }
    },
    "prior_period": { "start": "2026-08-31", "end": "2026-09-30" }
  }
}
```

## Engagement metrics over time

`GET /v3/metrics/tracking/timeseries` · Release R3

Returns open and click counts and rates per day, week or month.

**Query parameters**: `start`, `end`, `sending_domain`, `granularity` (see [above](#metrics-query-parameters)).

**Response** `200`: `data` is a [Tracking metrics timeseries](#tracking-metrics-timeseries-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/metrics/tracking/timeseries?granularity=day" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": {
    "granularity": "day",
    "buckets": [
      { "start": "2026-11-15", "end": "2026-11-15", "tracked_opens": 80, "tracked_links": 75, "opened": 41, "clicked": 9, "opens_total": 60, "clicks_total": 12, "open_rate": 51.25, "click_rate": 12 }
    ]
  }
}
```

## List send alert rules

`GET /v3/alerts/send` · Release R3

Returns every send alert rule in the application. An application has at most 20 rules, so this list is not paginated.

**Response** `200`: `data` is an array of [Send alert rule](#send-alert-rule-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/alerts/send" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    { "id": "alr_0c4d2e", "application_id": "app_51f0c3", "metric": "bounce_rate", "direction": "above", "threshold": 5, "window_hours": 6, "min_volume": 50, "created_at": 1730000000, "updated_at": 1730000000 }
  ]
}
```

## Create a send alert rule

`POST /v3/alerts/send` · Release R3

Adds a rule that fires when a send rate crosses a threshold over a rolling window. v3 clients don't retry this call, so a timeout can't create a duplicate; list before you retry.

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `metric` | string | Yes | `bounce_rate` \| `complaint_rate` \| `delivery_rate`. |
| `threshold` | number | Yes | Percentage, at most two decimals, sent as a JSON number (a string is rejected). For `bounce_rate` and `complaint_rate` the rule fires above it and the range is 0 to below 100. For `delivery_rate` it fires below it and the range is above 0 to 100. |
| `window_hours` | integer | Yes | Look-back window in hours, 1 to 24. |
| `min_volume` | integer | No | Sends needed in the window before the rule can fire. Default 0. |

`direction` is set by the server from `metric`. Unknown fields and `null` values are rejected with `400 invalid_request_error`.

**Response** `201`: `data` is a [Send alert rule](#send-alert-rule-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/alerts/send" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "metric": "bounce_rate", "threshold": 0.25, "window_hours": 1 }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "alr_7e19a0", "application_id": "app_51f0c3", "metric": "bounce_rate", "direction": "above", "threshold": 0.25, "window_hours": 1, "min_volume": 0, "created_at": 1730000000, "updated_at": 1730000000 }
}
```

## Get a send alert rule

`GET /v3/alerts/send/{alert_id}` · Release R3

Returns one rule.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `alert_id` | string | Alert rule ID. |

**Response** `200`: `data` is a [Send alert rule](#send-alert-rule-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/alerts/send/alr_7e19a0" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD...", "data": { "id": "alr_7e19a0", "metric": "bounce_rate", "direction": "above", "threshold": 0.25, "window_hours": 1, "min_volume": 0 } }
```

## Update a send alert rule

`PUT /v3/alerts/send/{alert_id}` · Release R3

Partial update: send only the fields you want to change. Any field you send replaces the stored value; fields you leave out keep theirs.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `alert_id` | string | Alert rule ID. |

**Request body** (JSON): any of `metric`, `threshold`, `window_hours`, `min_volume`, with the same rules as [create](#create-a-send-alert-rule). None is required.

**Response** `200`: `data` is the updated [Send alert rule](#send-alert-rule-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/alerts/send/alr_7e19a0" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "threshold": 3 }'
```

```json
{ "request_id": "req_01JD...", "data": { "id": "alr_7e19a0", "metric": "bounce_rate", "direction": "above", "threshold": 3, "window_hours": 1, "min_volume": 0 } }
```

## Delete a send alert rule

`DELETE /v3/alerts/send/{alert_id}` · Release R3

Removes the rule.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `alert_id` | string | Alert rule ID. |

**Response** `200`: the delete envelope, with no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/alerts/send/alr_7e19a0" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Objects

### Send event object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Event ID, 64 hexadecimal characters. |
| `event_type` | string | `accepted` \| `delivered` \| `bounced` \| `complaint` \| `rejected`. |
| `bounce_class` | string | `hard` \| `soft` \| `undetermined`. Bounces only. |
| `timestamp` | integer | When the event happened, Unix seconds. |
| `application_id` | string | Application that sent the message. |
| `grant_id` | string | Grant that sent the message. |
| `message_id` | string | Message ID. |
| `thread_id` | string | Thread ID. |
| `from` | string | Sender address. |
| `sending_domain` | string | Sender's domain. |
| `recipient` | string | Recipient address this event is about. |
| `recipient_domain` | string | Recipient's domain. |
| `subject` | string | Message subject. May be absent. |
| `reason` | string | Short human-readable reason. Empty when there is none. |
| `detail` | [Send event detail](#send-event-detail-object) | Detail from the receiving mail server. May be absent. |

### Send event detail object

Every field is optional and appears only when the receiving side reported it.

| Field | Type | Description |
| --- | --- | --- |
| `smtp_response` | string | SMTP reply text. |
| `processing_time_ms` | integer | Delivery time in milliseconds. |
| `reporting_mta` | string | Mail server that reported the event. |
| `remote_mta_ip` | string | IP address of the receiving server. |
| `bounce_type` | string | Bounce category as reported. |
| `bounce_subtype` | string | Bounce subcategory as reported. |
| `status` | string | Enhanced status code, such as `5.1.1`. |
| `action` | string | Delivery status action, such as `failed`. |
| `diagnostic_code` | string | Diagnostic code from the bounce report. |
| `feedback_type` | string | Complaint feedback type. |
| `complaint_subtype` | string | Complaint subcategory. |

### Send message activity object

| Field | Type | Description |
| --- | --- | --- |
| `message` | object | The message: `message_id`, `thread_id`, `grant_id`, `application_id`, `from`, `sending_domain` (strings), `subject` (string, may be absent), `sent_at` and `last_event_at` (integers, Unix seconds). |
| `recipients` | array of [Send recipient](#send-recipient-object) | One entry per recipient. |

### Send recipient object

| Field | Type | Description |
| --- | --- | --- |
| `recipient` | string | Recipient address. |
| `recipient_domain` | string | Recipient's domain. |
| `current_status` | string | The latest send event type for this recipient. |
| `bounce_class` | string | `hard` \| `soft` \| `undetermined`, when the latest event is a bounce. |
| `events` | array of object | The recipient's timeline. Each has `id`, `event_type`, `timestamp`, `bounce_class` (optional), `reason` and `detail` (optional), as in [Send event](#send-event-object). |

### Tracking event object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Event ID, 64 hexadecimal characters. |
| `event_type` | string | `opened` \| `link_clicked`. |
| `timestamp` | integer | When it happened, Unix seconds. |
| `application_id` | string | Application that sent the message. |
| `grant_id` | string | Grant that sent the message. |
| `message_id` | string | Message ID. |
| `thread_id` | string | Thread ID. |
| `from` | string | Sender address. |
| `sending_domain` | string | Sender's domain. |
| `label` | string | Tracking label set when the message was sent. |
| `is_first` | boolean | `true` for the first interaction of this type on the message. |
| `url` | string | Clicked URL. Clicks only. |
| `link_index` | integer | Position of the clicked link in the message, from 0. Clicks only. |
| `ip` | string | IP address that made the request. |
| `user_agent` | string | User agent that made the request. |

### Tracking message activity object

| Field | Type | Description |
| --- | --- | --- |
| `message_id` | string | Message ID. |
| `thread_id` | string | Thread ID. |
| `grant_id` | string | Grant that sent the message. |
| `from` | string | Sender address. |
| `sending_domain` | string | Sender's domain. |
| `label` | string | Tracking label. |
| `tracking` | object | Which tracking was on: `opens`, `links` (booleans). |
| `opens` | [Tracking totals](#tracking-totals-object) | Open counts. |
| `clicks` | [Tracking totals](#tracking-totals-object) | Click counts, plus `links`: an array of objects with `link_index` (integer), `url` (string) and `clicks` (integer). |
| `events` | array of object | The newest 100 interactions, each with `id`, `event_type`, `timestamp`, `is_first`, `url`, `link_index`, `ip`, `user_agent` as in [Tracking event](#tracking-event-object). |

### Tracking totals object

| Field | Type | Description |
| --- | --- | --- |
| `total` | integer | Number of interactions. |
| `first_at` | integer | First interaction, Unix seconds. `null` when `total` is 0. |
| `last_at` | integer | Latest interaction, Unix seconds. `null` when `total` is 0. |

### Metrics window object

| Field | Type | Description |
| --- | --- | --- |
| `start` | string | First UTC day, `YYYY-MM-DD`. |
| `end` | string | Last UTC day, `YYYY-MM-DD`, inclusive. |

### Send counts object

| Field | Type | Description |
| --- | --- | --- |
| `sent` | integer | Messages sent (per recipient). |
| `delivered` | integer | Delivered. |
| `bounced_hard` | integer | Hard bounces. |
| `bounced_soft` | integer | Soft bounces. |
| `bounced_undetermined` | integer | Bounces of unknown class. |
| `rejected` | integer | Rejected before sending. |
| `complaints` | integer | Spam complaints. |

### Rate tile object

| Field | Type | Description |
| --- | --- | --- |
| `value` | number | Rate for the window, percent. `null` without data. |
| `delta_pp` | number | Change from the prior period, in percentage points. `null` without data. |
| `prior_value` | number | Rate for the prior period. `null` without data. |
| `status` | string | Send rates only: `ok` \| `warn` \| `crit`, or `null` when not graded. |

### Send metrics summary object

| Field | Type | Description |
| --- | --- | --- |
| `health` | [Send health](#send-health-object) | Health grade for the last seven days. |
| `totals` | [Send counts](#send-counts-object) | Counts for the requested window. |
| `metrics` | object | `delivery_rate`, `bounce_rate`, `complaint_rate`, each a [Rate tile](#rate-tile-object) with `status`. |
| `prior_period` | [Metrics window](#metrics-window-object) | The comparison period, or `null` when there is none. |

### Send health object

| Field | Type | Description |
| --- | --- | --- |
| `state` | string | `healthy` \| `at_risk` \| `critical` \| `insufficient_data`. |
| `window` | [Metrics window](#metrics-window-object) | The seven days graded. |
| `min_assess_volume` | integer | Sends needed in the window for a grade; below it `state` is `insufficient_data`. |
| `findings` | array of [Health finding](#health-finding-object) | Why the state is `at_risk` or `critical`. Empty otherwise. |

### Health finding object

| Field | Type | Description |
| --- | --- | --- |
| `rule` | string | Check that produced the finding, for example `concentration`. |
| `severity` | string | Finding severity, for example `high`. |
| `title` | string | One-line summary. |
| `evidence` | object | `metric` (string), `value` and `threshold` (numbers), `dimension` and `dimension_value` (strings), optional `share_of_excess` and `baseline_value` (numbers) and `day` (string, `YYYY-MM-DD`), `totals` ([Send counts](#send-counts-object)) and `window` ([Metrics window](#metrics-window-object)). |
| `recommendation` | string | Suggested fix. |
| `logs_filter` | object | Query parameters for [List send events](#list-send-events) that show the affected events. |

### Send metrics timeseries object

| Field | Type | Description |
| --- | --- | --- |
| `granularity` | string | Bucket size used: `day` \| `week` \| `month`. |
| `buckets` | array of object | Each bucket has `start` and `end` (`YYYY-MM-DD`), every [Send counts](#send-counts-object) field, and `bounce_rate` and `complaint_rate` (numbers or `null`). |

### Send metrics breakdown object

| Field | Type | Description |
| --- | --- | --- |
| `group_by` | string | Dimension used. |
| `window` | [Metrics window](#metrics-window-object) | Window covered, or `null` (see [above](#send-metrics-breakdown)). |
| `rows` | array of object | Each row has `key` (string), `sent`, `delivered`, `bounced_hard`, `complaints` (integers), `delivery_rate`, `bounce_rate`, `complaint_rate` (numbers or `null`) and `is_others` (boolean; `key` is `(others)` when `true`). |

### Engagement counts object

| Field | Type | Description |
| --- | --- | --- |
| `tracked_opens` | integer | Messages sent with open tracking. |
| `tracked_links` | integer | Messages sent with link tracking. |
| `opened` | integer | Messages opened at least once. |
| `clicked` | integer | Messages with at least one click. |
| `opens_total` | integer | All opens, including repeats. |
| `clicks_total` | integer | All clicks, including repeats. |

### Tracking metrics summary object

| Field | Type | Description |
| --- | --- | --- |
| `totals` | [Engagement counts](#engagement-counts-object) | Counts for the window. |
| `metrics` | object | `open_rate` and `click_rate`, each a [Rate tile](#rate-tile-object) without `status`. |
| `prior_period` | [Metrics window](#metrics-window-object) | The comparison period, or `null`. |

### Tracking metrics timeseries object

| Field | Type | Description |
| --- | --- | --- |
| `granularity` | string | Bucket size used. |
| `buckets` | array of object | Each bucket has `start` and `end`, every [Engagement counts](#engagement-counts-object) field, and `open_rate` and `click_rate` (numbers or `null`). |

### Tracking metrics breakdown object

| Field | Type | Description |
| --- | --- | --- |
| `group_by` | string | Dimension used. |
| `window` | [Metrics window](#metrics-window-object) | Window covered, or `null`. |
| `rows` | array of object | Each row has `key`, every [Engagement counts](#engagement-counts-object) field, `open_rate` and `click_rate` (numbers or `null`) and `is_others`. |

### Send alert rule object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Rule ID. |
| `application_id` | string | Owning application. |
| `metric` | string | `bounce_rate` \| `complaint_rate` \| `delivery_rate`. |
| `direction` | string | `below` for `delivery_rate`, `above` otherwise. Read-only. |
| `threshold` | number | Threshold, percent. |
| `window_hours` | integer | Look-back window, 1 to 24 hours. |
| `min_volume` | integer | Minimum sends in the window before the rule can fire. |
| `created_at` | integer | Creation time, Unix seconds. |
| `updated_at` | integer | Last change, Unix seconds. |
