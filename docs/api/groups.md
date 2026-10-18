# Groups

A group is a shared ledger: a name, a currency, 2–50 people, their expenses and payments.
Source: [`src/app/api/groups/route.ts`](../../src/app/api/groups/route.ts),
[`src/app/api/groups/[id]/route.ts`](../../src/app/api/groups/[id]/route.ts).

See the [API overview](README.md) for the access model, money format and error shape.

---

## `POST /api/groups`

Create a group and its initial members. This is the only endpoint that doesn't take a group id.

**Access:** public, no authentication.

### Body

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | yes | 1–60 chars after whitespace cleanup |
| `currency` | string | yes | One of `INR` `USD` `EUR` `GBP` `AED` `SGD` `AUD` `CAD` `JPY` `THB` `NPR` `LKR`. Can't be changed later. |
| `members` | string[] | yes | 2–50 names, each 1–40 chars, unique case-insensitively. Array order becomes display order. |

New members start without a UPI ID; set it with [`PATCH .../members/{memberId}`](members.md#patch-apigroupsgroupidmembersmemberid).

### Example

```bash
curl -s -X POST "$BASE/api/groups" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Goa trip (demo)","currency":"INR","members":["Asha","Ben","Chen"]}'
```

`201 Created`

```json
{ "id": "ngd03Lbuv6BopV3psz5jOY" }
```

The group's page is then `$BASE/g/ngd03Lbuv6BopV3psz5jOY`.

### Errors

| Status | `error` example | Cause |
| --- | --- | --- |
| `400` | `Invalid JSON` | Body isn't JSON |
| `413` | `Request too large` | Body over 32 KB |
| `422` | `Add at least 2 people` | Fewer than 2 members |
| `422` | `Member names must be unique` | Duplicate names (case-insensitive) |
| `422` | `Max 60 characters` / `Required` | Name too long or empty |
| `422` | `Invalid option: expected one of "INR"\|"USD"\|…` | Unsupported currency |
| `500` | `Could not create group` | D1 batch reported a failed statement |

---

## `GET /api/groups/{groupId}`

Fetch everything in a group in one response. The UI calls this on load and whenever the tab regains focus.

**Access:** anyone with the group id.

### Path parameters

| Name | Type | Rules |
| --- | --- | --- |
| `groupId` | string | `^[A-Za-z0-9_-]{16,40}$` |

### Example

```bash
curl -s "$BASE/api/groups/$GROUP"
```

`200 OK` (expenses and payments trimmed to one each)

```json
{
  "id": "ngd03Lbuv6BopV3psz5jOY",
  "name": "Goa trip (demo)",
  "currency": "INR",
  "createdAt": 1792320506525,
  "updatedAt": 1792320507109,
  "members": [
    { "id": "HNZE6TwXmHy4", "name": "Asha", "upiId": "asha.demo@okhdfcbank" },
    { "id": "Rzr46ThJd_0U", "name": "Ben", "upiId": "ben.demo@ybl" },
    { "id": "OmzGzFUSQLfS", "name": "Chen", "upiId": null },
    { "id": "VJ_EpVSRbHpZ", "name": "Divya", "upiId": "divya.demo@okaxis" }
  ],
  "expenses": [
    {
      "id": "iuA6U7V14tbP",
      "description": "Dinner at Thalassa",
      "amount": 685000,
      "paidBy": "VJ_EpVSRbHpZ",
      "date": "2026-10-11",
      "category": "food",
      "splitMode": "percent",
      "createdBy": "VJ_EpVSRbHpZ",
      "createdAt": 1792320506905,
      "updatedAt": 1792320506905,
      "splits": [
        { "memberId": "HNZE6TwXmHy4", "weight": 2500, "amount": 171250 },
        { "memberId": "Rzr46ThJd_0U", "weight": 3000, "amount": 205500 },
        { "memberId": "OmzGzFUSQLfS", "weight": 2500, "amount": 171250 },
        { "memberId": "VJ_EpVSRbHpZ", "weight": 2000, "amount": 137000 }
      ]
    }
  ],
  "payments": [
    {
      "id": "wUfsPM_itXuq",
      "from": "OmzGzFUSQLfS",
      "to": "HNZE6TwXmHy4",
      "amount": 500000,
      "date": "2026-10-14",
      "note": "Flights share",
      "createdBy": "OmzGzFUSQLfS",
      "createdAt": 1792320507090
    }
  ]
}
```

### Response fields

| Field | Notes |
| --- | --- |
| `members` | Ordered by position (creation order). `upiId` is `null` when unset. |
| `expenses` | Newest first: `date` descending, then `createdAt` descending. |
| `expenses[].splits` | One entry per participant, ordered like `members`. `amount` is the participant's share in minor units, and the shares always sum to the expense `amount`. `weight` is the raw input (see [Expenses](expenses.md#split-modes)). |
| `expenses[].category` | `food`, `travel`, `rent`, `groceries`, `fun` or `other` |
| `payments` | Newest first: `date` descending, then `createdAt` descending. `note` is `null` when empty. |
| `createdBy` | Self-reported member id, or `null` |

Balances are **not** included; compute them from this payload as described in [Balances & settle-up](balances.md).

### Errors

| Status | `error` | Cause |
| --- | --- | --- |
| `404` | `Group not found` | Malformed id or no such group |

---

## `PATCH /api/groups/{groupId}`

Rename a group. Only the name can change; the currency is fixed at creation.

**Access:** anyone with the group id.

### Body

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | yes | 1–60 chars after whitespace cleanup |

### Example

```bash
curl -s -X PATCH "$BASE/api/groups/$GROUP" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Goa trip 2026 (demo)"}'
```

`200 OK`

```json
{ "ok": true }
```

### Errors

| Status | `error` | Cause |
| --- | --- | --- |
| `400` | `Invalid JSON` | Body isn't JSON |
| `404` | `Group not found` | Malformed id or no such group |
| `413` | `Request too large` | Body over 32 KB |
| `422` | `Required` / `Max 60 characters` | Missing, empty or too-long name |

> There is no endpoint to delete a group.
