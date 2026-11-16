# Room and equipment resources

List the bookable rooms and equipment a grant's account can see. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/resources` | List rooms and equipment | R2 |

A resource's `email` also works as a calendar ID. Add it to an event's `resources` or
`participants` to book it (see [events.md](events.md#event-resource-object)), or pass it to
[free/busy](calendars.md#get-freebusy-blocks) and [availability](calendars.md#find-available-meeting-times)
to check when it's free.

## List rooms and equipment

> Provisional: this shape comes from client code, not a published contract.

`GET /v3/grants/{grant_id}/resources` · Release R2

Returns the rooms and equipment the grant has access to.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Response** `200`: `data` is an array of [Resource](#resource-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/resources" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": [
    {
      "email": "room-12@acadpak.com",
      "name": "Room 12",
      "capacity": 8,
      "building": "Main Campus",
      "floor_name": "First floor",
      "floor_number": 1
    },
    {
      "email": "projector-2@acadpak.com",
      "name": "Projector 2",
      "building": "Main Campus"
    }
  ]
}
```

## Objects

### Resource object

| Field | Type | Description |
| --- | --- | --- |
| `object` | string | Object type; the value isn't pinned down yet |
| `email` | string | Resource address; doubles as its calendar ID |
| `name` | string | Display name |
| `capacity` | integer | How many people it holds |
| `building` | string | Building it's in |
| `floor_name` | string | Floor name |
| `floor_section` | string | Section of the floor. Google only |
| `floor_number` | integer | Floor number. Microsoft only |
