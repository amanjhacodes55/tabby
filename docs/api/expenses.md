# Expenses

An expense is something one person paid for on behalf of some of the group. The client sends the
**split inputs** (who's in, and their weights); the server computes the authoritative per-person
amounts and stores both.
Source: [`src/app/api/groups/[id]/expenses/route.ts`](../../src/app/api/groups/[id]/expenses/route.ts),
[`src/app/api/groups/[id]/expenses/[expenseId]/route.ts`](../../src/app/api/groups/[id]/expenses/[expenseId]/route.ts),
[`src/lib/expenses-server.ts`](../../src/lib/expenses-server.ts), [`src/lib/split.ts`](../../src/lib/split.ts).

There is no endpoint to fetch a single expense; read it from [`GET /api/groups/{groupId}`](groups.md#get-apigroupsgroupid).

## Expense body

`POST` and `PUT` take the same body (`expenseSchema` in [`src/lib/schemas.ts`](../../src/lib/schemas.ts)):

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `description` | string | yes | 1–120 chars after whitespace cleanup |
| `amount` | integer | yes | Minor units, `> 0`, at most 10,000,000 major units for the group currency |
| `paidBy` | string | yes | Member id in this group |
| `date` | string | yes | `YYYY-MM-DD`, a real date in 2000-01-01…2100-12-31 |
| `category` | string | yes | `food` \| `travel` \| `rent` \| `groceries` \| `fun` \| `other` |
| `splitMode` | string | yes | `equal` \| `exact` \| `percent` \| `shares` |
| `splits` | object[] | yes | 1–50 items of `{ memberId, weight }`; each `memberId` once, in this group |
| `splits[].memberId` | string | yes | Member id (`^[A-Za-z0-9_-]{6,40}$`) |
| `splits[].weight` | integer | yes | `0` to `1_000_000_000`; meaning depends on `splitMode` |
| `createdBy` | string \| null | no | Member id of whoever is adding it (self-reported). Ignored by `PUT`. |

### Split modes

| `splitMode` | `weight` means | Rule | Example |
| --- | --- | --- | --- |
| `equal` | ignored (stored as `1`) | Everyone listed in `splits` shares equally | 3 people → weight `1` each |
| `exact` | the person's amount in minor units | Weights must sum to `amount` exactly | ₹3,000 → `300000` |
| `percent` | basis points (1% = `100`) | Weights must sum to `10000` | 12.5% → `1250` |
| `shares` | hundredths of a share | Any positive total | 1.5 shares → `150` |

- In `exact`, `percent` and `shares`, entries with weight `0` are dropped. In `equal`, every listed
  member is included, so list only the people who are in.
- `equal`, `percent` and `shares` are allocated with the **largest-remainder method**: everyone gets
  `floor(amount × weight / totalWeight)`, then the leftover minor units go one each to the largest
  fractional remainders, ties broken by the order of `splits`. Shares always add up exactly to `amount`
  and the result is deterministic. Example: ₹1,320.50 split equally four ways gives
  `33013, 33013, 33012, 33012`.
- Math is done with `BigInt`, so large weights can't overflow.

---

## `POST /api/groups/{groupId}/expenses`

Add an expense.

**Access:** anyone with the group id.

### Example: split by shares

```bash
curl -s -X POST "$BASE/api/groups/$GROUP/expenses" \
  -H 'Content-Type: application/json' \
  -d '{
    "description": "Beach villa (3 nights)",
    "amount": 3600000,
    "paidBy": "Rzr46ThJd_0U",
    "date": "2026-10-10",
    "category": "rent",
    "splitMode": "shares",
    "splits": [
      { "memberId": "HNZE6TwXmHy4", "weight": 100 },
      { "memberId": "Rzr46ThJd_0U", "weight": 100 },
      { "memberId": "OmzGzFUSQLfS", "weight": 150 },
      { "memberId": "VJ_EpVSRbHpZ", "weight": 150 }
    ],
    "createdBy": "Rzr46ThJd_0U"
  }'
```

`201 Created`: the new id plus the computed splits

```json
{
  "id": "-tdu7HFuLf7J",
  "splits": [
    { "memberId": "HNZE6TwXmHy4", "weight": 100, "amount": 720000 },
    { "memberId": "Rzr46ThJd_0U", "weight": 100, "amount": 720000 },
    { "memberId": "OmzGzFUSQLfS", "weight": 150, "amount": 1080000 },
    { "memberId": "VJ_EpVSRbHpZ", "weight": 150, "amount": 1080000 }
  ]
}
```

### Example: percentages

```bash
curl -s -X POST "$BASE/api/groups/$GROUP/expenses" \
  -H 'Content-Type: application/json' \
  -d '{"description":"Dinner at Thalassa","amount":685000,"paidBy":"VJ_EpVSRbHpZ","date":"2026-10-11",
       "category":"food","splitMode":"percent",
       "splits":[{"memberId":"HNZE6TwXmHy4","weight":2500},{"memberId":"Rzr46ThJd_0U","weight":3000},
                 {"memberId":"OmzGzFUSQLfS","weight":2500},{"memberId":"VJ_EpVSRbHpZ","weight":2000}]}'
```

### Errors

Validated in this order: body → group → amount ceiling → members → split math → per-group cap.

| Status | `error` | Cause |
| --- | --- | --- |
| `400` | `Invalid JSON` | Body isn't JSON |
| `404` | `Group not found` | Malformed id or no such group |
| `413` | `Request too large` | Body over 32 KB |
| `422` | `Invalid date`, `Pick at least one person`, `Invalid id`, … | Schema validation (first issue only) |
| `422` | `Amount is too large` | Over 10,000,000 major units for this currency |
| `422` | `Payer is not in this group` | `paidBy` not a member |
| `422` | `Unknown member` | `createdBy` not a member |
| `422` | `Split includes someone not in this group` | A `splits[].memberId` isn't a member |
| `422` | `A member appears twice in the split` | Duplicate `memberId` |
| `422` | `Pick at least one person to split with` | All weights are `0` (non-equal modes) |
| `422` | `Exact amounts must add up to the total` | `exact` weights ≠ `amount` |
| `422` | `Percentages add up to 50%, they must add up to 100%` | `percent` weights ≠ `10000` |
| `422` | `This group reached the limit of 5000 expenses` | Per-group cap |

---

## `PUT /api/groups/{groupId}/expenses/{expenseId}`

Replace an expense: description, amount, payer, date, category, split mode and splits are all
overwritten and the splits recomputed. `createdBy` and `createdAt` keep their original values;
`updatedAt` is bumped. There is no partial (`PATCH`) update.

**Access:** anyone with the group id.

### Path parameters

| Name | Type | Rules |
| --- | --- | --- |
| `groupId` | string | `^[A-Za-z0-9_-]{16,40}$` |
| `expenseId` | string | An expense in this group |

### Body

Same as [`POST`](#expense-body).

### Example

```bash
curl -s -X PUT "$BASE/api/groups/$GROUP/expenses/pXkBGOFrVN9P" \
  -H 'Content-Type: application/json' \
  -d '{"description":"Scooter rental (2 days)","amount":300000,"paidBy":"OmzGzFUSQLfS","date":"2026-10-11",
       "category":"travel","splitMode":"equal",
       "splits":[{"memberId":"HNZE6TwXmHy4","weight":1},{"memberId":"OmzGzFUSQLfS","weight":1},{"memberId":"VJ_EpVSRbHpZ","weight":1}]}'
```

`200 OK`

```json
{
  "id": "pXkBGOFrVN9P",
  "splits": [
    { "memberId": "HNZE6TwXmHy4", "weight": 1, "amount": 100000 },
    { "memberId": "OmzGzFUSQLfS", "weight": 1, "amount": 100000 },
    { "memberId": "VJ_EpVSRbHpZ", "weight": 1, "amount": 100000 }
  ]
}
```

### Errors

Same as `POST`, plus `404 Expense not found` when the expense doesn't exist in this group. The
5,000-expense cap does not apply to edits.

---

## `DELETE /api/groups/{groupId}/expenses/{expenseId}`

Delete an expense and its splits.

**Access:** anyone with the group id. No body.

```bash
curl -s -X DELETE "$BASE/api/groups/$GROUP/expenses/pXkBGOFrVN9P"
```

`200 OK`

```json
{ "ok": true }
```

### Errors

| Status | `error` | Cause |
| --- | --- | --- |
| `404` | `Group not found` | Malformed group id |
| `404` | `Expense not found` | No such expense in this group |
