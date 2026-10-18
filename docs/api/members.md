# Members

People in a group. Each has a name (unique within the group, case-insensitive) and an optional UPI ID
used to build `upi://pay` links and QR codes in INR groups.
Source: [`src/app/api/groups/[id]/members/route.ts`](../../src/app/api/groups/[id]/members/route.ts),
[`src/app/api/groups/[id]/members/[memberId]/route.ts`](../../src/app/api/groups/[id]/members/[memberId]/route.ts).

**UPI ID format:** at most 100 characters matching
`^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9]{1,63}$`, e.g. `asha.demo@okhdfcbank` or
`9800000000@ybl` ([`src/lib/upi.ts`](../../src/lib/upi.ts)). Leading/trailing spaces are trimmed.

---

## `POST /api/groups/{groupId}/members`

Add a person to a group.

**Access:** anyone with the group id.

### Body

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | yes | 1–40 chars after whitespace cleanup; not already used in the group (case-insensitive) |
| `upiId` | string \| null | no | Valid UPI ID. Omit or `null` for none. |

### Example

```bash
curl -s -X POST "$BASE/api/groups/$GROUP/members" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Divya","upiId":"divya.demo@okaxis"}'
```

`201 Created`

```json
{ "id": "VJ_EpVSRbHpZ", "name": "Divya", "upiId": "divya.demo@okaxis" }
```

The new member is placed after the existing ones.

### Errors

| Status | `error` | Cause |
| --- | --- | --- |
| `400` | `Invalid JSON` | Body isn't JSON |
| `404` | `Group not found` | Malformed id or no such group |
| `409` | `Someone with that name is already in the group` | Name clash |
| `413` | `Request too large` | Body over 32 KB |
| `422` | `Enter a valid UPI ID, like name@okhdfcbank` | Bad UPI ID |
| `422` | `Required` / `Max 40 characters` | Bad name |
| `422` | `A group can have at most 50 people` | Group is full |

---

## `PATCH /api/groups/{groupId}/members/{memberId}`

Rename a person and/or set or clear their UPI ID. Send at least one field.

**Access:** anyone with the group id.

### Path parameters

| Name | Type | Rules |
| --- | --- | --- |
| `groupId` | string | `^[A-Za-z0-9_-]{16,40}$` |
| `memberId` | string | Must be a member of this group |

### Body

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | no* | 1–40 chars; must not clash with another member (case-insensitive) |
| `upiId` | string \| `""` \| null | no* | Valid UPI ID to set it; `""` or `null` clears it |

\* At least one of `name` or `upiId` must be present.

### Example

```bash
curl -s -X PATCH "$BASE/api/groups/$GROUP/members/HNZE6TwXmHy4" \
  -H 'Content-Type: application/json' \
  -d '{"upiId":"asha.demo@okhdfcbank"}'
```

`200 OK`

```json
{ "ok": true }
```

### Errors

| Status | `error` | Cause |
| --- | --- | --- |
| `400` | `Invalid JSON` | Body isn't JSON |
| `404` | `Group not found` | Malformed group id |
| `404` | `Member not found` | No such member in this group |
| `409` | `Someone with that name is already in the group` | Name clash |
| `413` | `Request too large` | Body over 32 KB |
| `422` | `Nothing to update` | Neither field sent |
| `422` | `Enter a valid UPI ID, like name@okhdfcbank` | Bad UPI ID |

---

## `DELETE /api/groups/{groupId}/members/{memberId}`

Remove a person. Only allowed if they never paid, shared in, sent or received anything, so balances
can't silently change. Delete or edit those expenses and payments first.

**Access:** anyone with the group id. No body.

### Example

```bash
curl -s -X DELETE "$BASE/api/groups/$GROUP/members/Zt0pQ7c2nVxe"
```

`200 OK`

```json
{ "ok": true }
```

### Errors

Checked in this order:

| Status | `error` | Cause |
| --- | --- | --- |
| `404` | `Group not found` | Malformed group id |
| `404` | `Member not found` | No such member in this group |
| `409` | `This person is part of expenses or payments, so they can't be removed. Delete or edit those first.` | Member is a payer or participant of an expense, or sender/receiver of a payment |
| `422` | `A group needs at least 2 people` | The group has 2 or fewer people |
