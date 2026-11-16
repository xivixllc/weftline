# Threads

List, read, change and delete conversation threads, each grouping the messages and drafts of one conversation. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/threads` | List threads | R1 |
| GET | `/v3/grants/{grant_id}/threads/{thread_id}` | Get a thread | R1 |
| PUT | `/v3/grants/{grant_id}/threads/{thread_id}` | Update a thread | R1 |
| DELETE | `/v3/grants/{grant_id}/threads/{thread_id}` | Delete a thread | R1 |

## List threads

`GET /v3/grants/{grant_id}/threads` · Release R1

Returns the grant's threads, filtered by any of the query parameters below. A thread matches when any of its messages match. Parameters typed `array of string` are repeated (`to=a@x.com&to=b@x.com`).

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `subject` | string | Exact subject match |
| `any_email` | string | Comma-separated addresses; matches threads with messages from or to any of them |
| `to` | array of string | Threads with messages addressed to these addresses |
| `from` | array of string | Threads with messages from these addresses |
| `cc` | array of string | Threads with messages that cc these addresses |
| `bcc` | array of string | Threads with messages that bcc these addresses |
| `in` | array of string | Threads with messages in these folder or label IDs |
| `unread` | boolean | Threads with unread messages |
| `starred` | boolean | Threads with starred messages |
| `thread_id` | string | Only this thread |
| `earliest_message_date` | integer | Threads whose first message has this Unix timestamp |
| `latest_message_before` | integer | Latest message received before this Unix timestamp |
| `latest_message_after` | integer | Latest message received after this Unix timestamp |
| `has_attachment` | boolean | Threads with messages that have attachments |
| `search_query_native` | string | Provider-native search string, passed through as-is (Gmail) |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Thread](#thread-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/threads?limit=5&any_email=student@acadpak.com" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": [
    {
      "id": "thr_3c90aa12",
      "object": "thread",
      "grant_id": "grt_5a1e9b77",
      "subject": "Your application",
      "participants": [
        { "name": "Admissions", "email": "admissions@acadpak.com" },
        { "name": "Student", "email": "student@acadpak.com" }
      ],
      "message_ids": ["msg_8f2c41d0", "msg_91ab33e0"],
      "draft_ids": [],
      "folders": ["INBOX"],
      "has_attachments": false,
      "has_drafts": false,
      "starred": false,
      "unread": true,
      "earliest_message_date": 1731571200,
      "latest_message_received_date": 1731657600,
      "snippet": "Thanks for applying. Next steps are below.",
      "latest_draft_or_message": { "id": "msg_91ab33e0", "object": "message", "subject": "Your application" }
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjV9"
}
```

## Get a thread

`GET /v3/grants/{grant_id}/threads/{thread_id}` · Release R1

Returns one thread.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `thread_id` | string | Thread ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `select` | string | Comma-separated fields to return |

**Response** `200`: `data` is a [Thread](#thread-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/threads/thr_3c90aa12" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "thr_3c90aa12", "object": "thread", "grant_id": "grt_5a1e9b77", "message_ids": ["msg_8f2c41d0", "msg_91ab33e0"] }
}
```

## Update a thread

`PUT /v3/grants/{grant_id}/threads/{thread_id}` · Release R1

Applies a change to every message in the thread: read state, star, or folders. Send only the fields you want to change.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `thread_id` | string | Thread ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `unread` | boolean | No | Mark all messages unread or read |
| `starred` | boolean | No | Star or unstar all messages |
| `folders` | array of string | No | Folder or label IDs; replaces the current folders of every message in the thread |

**Response** `200`: `data` is the updated [Thread](#thread-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/threads/thr_3c90aa12" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "unread": false }'
```

```json
{
  "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N",
  "data": { "id": "thr_3c90aa12", "object": "thread", "unread": false }
}
```

## Delete a thread

`DELETE /v3/grants/{grant_id}/threads/{thread_id}` · Release R1

Deletes the thread and the messages in it.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `thread_id` | string | Thread ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/threads/thr_3c90aa12" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD3K7Q9V6Z2W4X8Y5T1R0M3N" }
```

## Objects

### Thread object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Thread ID |
| `object` | string | Always `thread` |
| `grant_id` | string | Grant the thread belongs to |
| `subject` | string | Thread subject |
| `snippet` | string | First 100 characters of the latest message or draft, with HTML removed |
| `participants` | array of [Email name](messages.md#email-name-object) | Everyone on the thread's messages |
| `message_ids` | array of string | IDs of the messages in the thread |
| `draft_ids` | array of string | IDs of the drafts in the thread |
| `folders` | array of string | Folder or label IDs the thread's messages are in |
| `latest_draft_or_message` | [Message](messages.md#message-object) or [Draft](drafts.md#draft-object) | The newest item in the thread; tell them apart by `object` |
| `has_attachments` | boolean | Whether any message has attachments |
| `has_drafts` | boolean | Whether the thread has drafts |
| `starred` | boolean | Whether the thread is starred |
| `unread` | boolean | Whether the thread has unread messages |
| `earliest_message_date` | integer | Unix timestamp of the first message |
| `latest_message_received_date` | integer | Unix timestamp of the newest received message |
| `latest_message_sent_date` | integer | Unix timestamp of the newest sent message |
