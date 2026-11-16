# Contacts

Read and manage a grant's contacts and the contact groups they belong to. Conventions (authentication, envelopes, pagination, errors) are in [the API README](README.md).

| Method | Path | Summary | Release |
| --- | --- | --- | --- |
| GET | `/v3/grants/{grant_id}/contacts` | List contacts | R2 |
| GET | `/v3/grants/{grant_id}/contacts/{contact_id}` | Get a contact | R2 |
| POST | `/v3/grants/{grant_id}/contacts` | Create a contact | R2 |
| PUT | `/v3/grants/{grant_id}/contacts/{contact_id}` | Update a contact | R2 |
| DELETE | `/v3/grants/{grant_id}/contacts/{contact_id}` | Delete a contact | R2 |
| GET | `/v3/grants/{grant_id}/contacts/groups` | List contact groups | R2 |
| GET | `/v3/grants/{grant_id}/contacts/groups/{group_id}` | Get a contact group (provisional) | R2 |
| POST | `/v3/grants/{grant_id}/contacts/groups` | Create a contact group (provisional) | R2 |
| PUT | `/v3/grants/{grant_id}/contacts/groups/{group_id}` | Update a contact group (provisional) | R2 |
| DELETE | `/v3/grants/{grant_id}/contacts/groups/{group_id}` | Delete a contact group (provisional) | R2 |

Each contact reports where it came from in `source`: `address_book` (saved by the user),
`inbox` (generated automatically from mail) or `domain`.

## List contacts

`GET /v3/grants/{grant_id}/contacts` · Release R2

Returns the grant's contacts, optionally filtered.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `email` | string | Only contacts with exactly this email address |
| `phone_number` | string | Only contacts with exactly this phone number |
| `source` | string | Only contacts from this source: `address_book` \| `inbox` \| `domain` |
| `group` | string | Only contacts in the contact group with this ID |
| `recurse` | boolean | With `group`, also include contacts in that group's subgroups |
| `metadata_pair` | string | Only contacts whose metadata has this `key:value` pair. The key must be one of the indexed keys `key1` to `key5`. Can't be combined with the other filters above; pagination still works |

Plus `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Contact](#contact-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts?source=address_book&limit=25" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": [
    {
      "id": "con_4b9d2e71",
      "grant_id": "grt_3f8a1c2d",
      "object": "contact",
      "display_name": "Bilal Ahmed",
      "given_name": "Bilal",
      "surname": "Ahmed",
      "emails": [ { "email": "parent@acadpak.com", "type": "home" } ],
      "phone_numbers": [ { "number": "+92 300 1234567", "type": "mobile" } ],
      "groups": [ { "id": "grp_parents" } ],
      "source": "address_book"
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjI1fQ"
}
```

## Get a contact

`GET /v3/grants/{grant_id}/contacts/{contact_id}` · Release R2

Returns one contact, optionally with its photo inline.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `contact_id` | string | Contact ID |

**Query parameters**

| Name | Type | Description |
| --- | --- | --- |
| `profile_picture` | boolean | If the contact has a `picture_url`, also return the image as Base64 in `picture` |
| `select` | string | Comma-separated fields to return |

**Response** `200`: `data` is a [Contact](#contact-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts/con_4b9d2e71?profile_picture=true" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "con_4b9d2e71",
    "grant_id": "grt_3f8a1c2d",
    "object": "contact",
    "display_name": "Bilal Ahmed",
    "given_name": "Bilal",
    "surname": "Ahmed",
    "company_name": "Acadpak",
    "emails": [ { "email": "parent@acadpak.com", "type": "home" } ],
    "picture_url": "https://example.com/photos/con_4b9d2e71.jpg",
    "picture": "/9j/4AAQSkZJRgABAQ...",
    "source": "address_book"
  }
}
```

## Create a contact

`POST /v3/grants/{grant_id}/contacts` · Release R2

Adds a contact to the grant's address book.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

All fields are optional.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `display_name` | string | No | Name to show for the contact |
| `given_name` | string | No | First name |
| `middle_name` | string | No | Middle name |
| `surname` | string | No | Last name |
| `suffix` | string | No | Name suffix |
| `nickname` | string | No | Nickname |
| `birthday` | string | No | Birthday |
| `company_name` | string | No | Employer |
| `job_title` | string | No | Job title |
| `manager_name` | string | No | Manager's name |
| `office_location` | string | No | Office location |
| `notes` | string | No | Free-text notes |
| `emails` | array of [Contact email](#contact-email-object) | No | Email addresses |
| `phone_numbers` | array of [Phone number](#phone-number-object) | No | Phone numbers |
| `physical_addresses` | array of [Physical address](#physical-address-object) | No | Postal addresses |
| `im_addresses` | array of [IM address](#im-address-object) | No | Instant-messaging handles |
| `web_pages` | array of [Web page](#web-page-object) | No | Web pages |
| `groups` | array of [Contact group reference](#contact-group-reference-object) | No | Contact groups to put the contact in |
| `picture_url` | string | No | Link to the contact's photo |
| `picture` | string | No | The contact's photo, Base64 |
| `source` | string | No | `address_book` \| `inbox` \| `domain` |
| `metadata` | object | No | String key-value pairs kept by Weftline. They aren't written to the provider and are lost if the provider changes the contact's ID |

**Response** `200`: `data` is the new [Contact](#contact-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "given_name": "Sana",
    "surname": "Iqbal",
    "emails": [ { "email": "sana.iqbal@acadpak.com", "type": "work" } ],
    "job_title": "Vice principal",
    "groups": [ { "id": "grp_staff" } ],
    "metadata": { "key1": "staff" }
  }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "con_a17f3c08",
    "grant_id": "grt_3f8a1c2d",
    "object": "contact",
    "display_name": "Sana Iqbal",
    "given_name": "Sana",
    "surname": "Iqbal",
    "job_title": "Vice principal",
    "emails": [ { "email": "sana.iqbal@acadpak.com", "type": "work" } ],
    "groups": [ { "id": "grp_staff" } ],
    "metadata": { "key1": "staff" },
    "source": "address_book"
  }
}
```

## Update a contact

`PUT /v3/grants/{grant_id}/contacts/{contact_id}` · Release R2

Changes the fields you send. For `metadata`: leave it out or send `null` to keep what's there,
send an object to replace it, or send `{}` to clear it.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `contact_id` | string | Contact ID |

**Request body** (JSON)

The same fields as [Create a contact](#create-a-contact), all optional.

**Response** `200`: `data` is the updated [Contact](#contact-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts/con_a17f3c08" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "job_title": "Principal", "phone_numbers": [ { "number": "+92 21 3456 7890", "type": "work" } ] }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": {
    "id": "con_a17f3c08",
    "grant_id": "grt_3f8a1c2d",
    "object": "contact",
    "display_name": "Sana Iqbal",
    "job_title": "Principal",
    "emails": [ { "email": "sana.iqbal@acadpak.com", "type": "work" } ],
    "phone_numbers": [ { "number": "+92 21 3456 7890", "type": "work" } ],
    "source": "address_book"
  }
}
```

## Delete a contact

`DELETE /v3/grants/{grant_id}/contacts/{contact_id}` · Release R2

Deletes a contact.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `contact_id` | string | Contact ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts/con_a17f3c08" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M" }
```

## List contact groups

`GET /v3/grants/{grant_id}/contacts/groups` · Release R2

Returns the grant's contact groups.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Query parameters**

Takes `limit`, `page_token` and `select`.

**Response** `200`: `data` is an array of [Contact group](#contact-group-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts/groups" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": [
    { "id": "grp_staff", "grant_id": "grt_3f8a1c2d", "object": "contact_group", "group_type": "user", "name": "Staff", "path": "Staff" },
    { "id": "grp_starred", "grant_id": "grt_3f8a1c2d", "object": "contact_group", "group_type": "system", "name": "Starred", "path": "Starred" }
  ]
}
```

## Get a contact group

> Provisional: this shape comes from client code, not a published contract.

`GET /v3/grants/{grant_id}/contacts/groups/{group_id}` · Release R2

Returns one contact group.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `group_id` | string | Contact group ID |

**Response** `200`: `data` is a [Contact group](#contact-group-object).

**Example**

```bash
curl -s "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts/groups/grp_staff" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": { "id": "grp_staff", "grant_id": "grt_3f8a1c2d", "object": "contact_group", "name": "Staff", "path": "Staff" }
}
```

## Create a contact group

> Provisional: this shape comes from client code, not a published contract.

`POST /v3/grants/{grant_id}/contacts/groups` · Release R2

Creates a contact group.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Group name |

**Response** `200`: `data` is the new [Contact group](#contact-group-object).

**Example**

```bash
curl -s -X POST "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts/groups" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Grade 7 parents" }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": { "id": "grp_g7parents", "grant_id": "grt_3f8a1c2d", "object": "contact_group", "name": "Grade 7 parents", "path": "Grade 7 parents" }
}
```

## Update a contact group

> Provisional: this shape comes from client code, not a published contract.

`PUT /v3/grants/{grant_id}/contacts/groups/{group_id}` · Release R2

Renames a contact group.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `group_id` | string | Contact group ID |

**Request body** (JSON)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | No | New group name |

**Response** `200`: `data` is the updated [Contact group](#contact-group-object).

**Example**

```bash
curl -s -X PUT "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts/groups/grp_g7parents" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Grade 7 parents (2026)" }'
```

```json
{
  "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M",
  "data": { "id": "grp_g7parents", "grant_id": "grt_3f8a1c2d", "object": "contact_group", "name": "Grade 7 parents (2026)", "path": "Grade 7 parents (2026)" }
}
```

## Delete a contact group

> Provisional: this shape comes from client code, not a published contract.

`DELETE /v3/grants/{grant_id}/contacts/groups/{group_id}` · Release R2

Deletes a contact group.

**Path parameters**

| Name | Type | Description |
| --- | --- | --- |
| `grant_id` | string | Grant ID or email address |
| `group_id` | string | Contact group ID |

**Response** `200`: no `data`.

**Example**

```bash
curl -s -X DELETE "$WEFTLINE_URL/v3/grants/$GRANT_ID/contacts/groups/grp_g7parents" \
  -H "Authorization: Bearer $WEFTLINE_API_KEY"
```

```json
{ "request_id": "req_01JD4A2B3C4D5E6F7G8H9J0K1M" }
```

## Objects

### Contact object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Contact ID |
| `grant_id` | string | Grant the contact belongs to |
| `object` | string | Always `contact` |
| `display_name` | string | Name to show for the contact |
| `given_name` | string | First name |
| `middle_name` | string | Middle name |
| `surname` | string | Last name |
| `suffix` | string | Name suffix |
| `nickname` | string | Nickname |
| `birthday` | string | Birthday |
| `company_name` | string | Employer |
| `job_title` | string | Job title |
| `manager_name` | string | Manager's name |
| `office_location` | string | Office location |
| `notes` | string | Free-text notes |
| `emails` | array of [Contact email](#contact-email-object) | Email addresses |
| `phone_numbers` | array of [Phone number](#phone-number-object) | Phone numbers |
| `physical_addresses` | array of [Physical address](#physical-address-object) | Postal addresses |
| `im_addresses` | array of [IM address](#im-address-object) | Instant-messaging handles |
| `web_pages` | array of [Web page](#web-page-object) | Web pages |
| `groups` | array of [Contact group reference](#contact-group-reference-object) | Groups the contact is in |
| `picture_url` | string | Link to the contact's photo |
| `picture` | string | The photo as Base64; filled in when requested with `profile_picture=true` |
| `source` | string | `address_book` \| `inbox` \| `domain` |
| `metadata` | object | String key-value pairs kept by Weftline, not by the provider |
| `updated_at` | integer | Last update time, Unix seconds (provisional: seen only in client code) |

### Contact email object

| Field | Type | Description |
| --- | --- | --- |
| `email` | string | Email address |
| `type` | string | Label, such as `work` or `home` |

### Phone number object

| Field | Type | Description |
| --- | --- | --- |
| `number` | string | Phone number |
| `type` | string | Label, such as `mobile` or `work` |

### Physical address object

| Field | Type | Description |
| --- | --- | --- |
| `format` | string | Address format |
| `street_address` | string | Street address |
| `city` | string | City |
| `postal_code` | string | Postal code |
| `state` | string | State or province |
| `country` | string | Country |
| `type` | string | Label, such as `work` or `home` |

### IM address object

| Field | Type | Description |
| --- | --- | --- |
| `im_address` | string | Handle or address |
| `type` | string | Service or label |

### Web page object

| Field | Type | Description |
| --- | --- | --- |
| `url` | string | Page address |
| `type` | string | Label, such as `profile` or `blog` |

### Contact group reference object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Contact group ID. Responses may also include the other [Contact group](#contact-group-object) fields |

### Contact group object

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Contact group ID |
| `grant_id` | string | Grant the group belongs to |
| `object` | string | Always `contact_group` |
| `group_type` | string | `user` (made by the user) \| `system` (built into the provider) \| `other` |
| `name` | string | Group name |
| `path` | string | Full path of the group, for providers that nest groups |
