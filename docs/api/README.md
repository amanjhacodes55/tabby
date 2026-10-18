# Tabby HTTP API

Tabby's web UI is a thin client over a small JSON API. All endpoints are Next.js App Router route
handlers under [`src/app/api/`](../../src/app/api), running inside the Cloudflare Worker and reading
and writing Cloudflare D1. You can call the same API from scripts, bots or other apps.

**12 endpoints** across 5 resources:

| Resource | Method & path | Purpose |
| --- | --- | --- |
| [Groups](groups.md) | `POST /api/groups` | Create a group with its first members |
| | `GET /api/groups/{groupId}` | Fetch a group with members, expenses and payments |
| | `PATCH /api/groups/{groupId}` | Rename a group |
| [Members](members.md) | `POST /api/groups/{groupId}/members` | Add a person |
| | `PATCH /api/groups/{groupId}/members/{memberId}` | Rename a person and/or set their UPI ID |
| | `DELETE /api/groups/{groupId}/members/{memberId}` | Remove a person who has no expenses or payments |
| [Expenses](expenses.md) | `POST /api/groups/{groupId}/expenses` | Add an expense (server computes the split) |
| | `PUT /api/groups/{groupId}/expenses/{expenseId}` | Replace an expense |
| | `DELETE /api/groups/{groupId}/expenses/{expenseId}` | Delete an expense |
| [Payments](payments.md) | `POST /api/groups/{groupId}/payments` | Record a payment between two people |
| | `DELETE /api/groups/{groupId}/payments/{paymentId}` | Delete a payment |
| [CSV export](export.md) | `GET /api/groups/{groupId}/export` | Download the ledger, balances and settle-up plan as CSV |

There is **no balances endpoint**: balances and the settle-up plan are computed from the group data
(`GET /api/groups/{groupId}`) in the browser, and on the server only for the CSV export. See
[Balances & settle-up](balances.md) for the exact algorithm so you can reproduce it.

## Base URL

| Environment | Base URL |
| --- | --- |
| Hosted instance | `https://tabby.amanjhavdjs12tha.workers.dev` |
| `npm run preview` (workerd + local D1) | `http://localhost:8787` (wrangler's default port) |
| `npm run dev` (`next dev`) | `http://localhost:3000` |

Examples below use `$BASE` and `$GROUP`:

```bash
BASE=http://localhost:8787
GROUP=ngd03Lbuv6BopV3psz5jOY
```

## Access model (no authentication)

There are no accounts, sessions, API keys or tokens. **Knowing a group id is the only credential**:
anyone who has the id can read and modify everything in that group, exactly like the group link in the UI.

- Group ids are 22 characters from `[A-Za-z0-9_-]`, generated with `crypto.getRandomValues` (132 bits).
  Every route under `/api/groups/{groupId}` first checks the id against `^[A-Za-z0-9_-]{16,40}$`; an id
  that doesn't match returns `404 Group not found` without touching the database.
- Member, expense and payment ids are 12 characters from the same alphabet. Every query is scoped by
  group id, so an id from another group returns `404` (or `422` for ids referenced inside a body).
- `createdBy` fields are **self-reported** (the UI sends the "Who are you?" pick). The server only checks
  that the id belongs to a member of the group; it does not prove who made the request.
- `/api/` and `/g/` are disallowed in `robots.txt`, and group pages send `noindex`.

Treat group ids like passwords: don't log them or post them publicly.

## Requests

- Bodies are JSON. Send `Content-Type: application/json`.
- Bodies larger than **32 KB** (by `Content-Length` or actual size) are rejected with `413`.
- Every body is validated with [zod](https://zod.dev) schemas in [`src/lib/schemas.ts`](../../src/lib/schemas.ts).
  Unknown fields are ignored.
- Text fields are normalised before validation: control characters become spaces, runs of whitespace
  collapse to one space, and the result is trimmed. Length limits apply to the cleaned text.

### Money

All amounts are **integers in minor units** of the group currency: paise for INR, cents for USD,
whole yen for JPY (0 decimals). `₹1,320.50` is `132050`. Floats are rejected.

- Schema limit: a positive integer up to `1_000_000_000`.
- Group limit: at most `10,000,000` major units (₹1 crore or equivalent), i.e. `1_000_000_000` for
  2-decimal currencies and `10_000_000` for JPY. Exceeding it returns `422 Amount is too large`.

Supported currencies: `INR`, `USD`, `EUR`, `GBP`, `AED`, `SGD`, `AUD`, `CAD`, `JPY`, `THB`, `NPR`, `LKR`
(see [`src/lib/currency.ts`](../../src/lib/currency.ts)).

### Dates

`date` fields are calendar dates in `YYYY-MM-DD` form, between `2000-01-01` and `2100-12-31`, and must
be real dates (`2026-02-30` is rejected). Timestamps in responses (`createdAt`, `updatedAt`) are Unix
epoch **milliseconds**.

### Limits

| Limit | Value |
| --- | --- |
| Group name | 1–60 characters |
| Member name | 1–40 characters, unique per group (case-insensitive) |
| People per group | 2–50 |
| Expense description | 1–120 characters |
| Payment note | 0–200 characters |
| Expenses per group | 5,000 |
| Payments per group | 5,000 |
| UPI ID | ≤ 100 characters, `handle@psp` format |
| Request body | 32 KB |

Source: [`src/lib/limits.ts`](../../src/lib/limits.ts), [`src/lib/schemas.ts`](../../src/lib/schemas.ts),
[`src/lib/api.ts`](../../src/lib/api.ts).

## Responses

- Success bodies are JSON (except the CSV export) with `Cache-Control: no-store`.
- Creates return `201`; everything else returns `200`.
- All responses carry `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `X-Frame-Options: DENY` and a restrictive `Permissions-Policy` (from `next.config.ts`).

### Errors

Every handler is wrapped in `route()` ([`src/lib/api.ts`](../../src/lib/api.ts)), so errors always look like this:

```json
{ "error": "Someone with that name is already in the group" }
```

Messages are written to be shown to end users. For validation failures only the **first** zod issue
is reported.

| Status | When |
| --- | --- |
| `400` | Body is not valid JSON (`Invalid JSON`) |
| `404` | Malformed or unknown group id, or unknown member / expense / payment in the path |
| `405` | HTTP method not implemented for that path (empty body, returned by Next.js) |
| `409` | Name clash, or removing a person who is still referenced |
| `413` | Body over 32 KB (`Request too large`) |
| `422` | Validation failed, a referenced member isn't in the group, or a limit was reached |
| `500` | Unexpected error (`Something went wrong. Please try again.`); details go to the Worker log |

### Pagination and rate limiting

- **No pagination.** `GET /api/groups/{groupId}` returns the whole group in one response; the per-group
  caps (50 people, 5,000 expenses, 5,000 payments) bound its size.
- **No rate limiting** in application code. Abuse is bounded only by validation, the body-size cap and
  the per-group caps above. If you self-host publicly, consider adding a
  [Cloudflare rate-limiting rule](https://developers.cloudflare.com/waf/rate-limiting-rules/) on `/api/*`.

## Consistency

Multi-row writes (creating a group with members, writing an expense and its splits, deleting an expense)
are sent as a single D1 `batch`, which runs as one transaction. Every write also bumps the group's
`updated_at`. Concurrent edits are last-write-wins; there is no versioning or ETag.

## Quick tour

```bash
# 1. Create a group
curl -s -X POST "$BASE/api/groups" -H 'Content-Type: application/json' \
  -d '{"name":"Goa trip (demo)","currency":"INR","members":["Asha","Ben","Chen"]}'
# {"id":"ngd03Lbuv6BopV3psz5jOY"}

# 2. Read it back to get member ids
curl -s "$BASE/api/groups/$GROUP"

# 3. Add an expense split equally three ways
curl -s -X POST "$BASE/api/groups/$GROUP/expenses" -H 'Content-Type: application/json' -d '{
  "description":"Scooter rental","amount":240000,"paidBy":"OmzGzFUSQLfS","date":"2026-10-11",
  "category":"travel","splitMode":"equal",
  "splits":[{"memberId":"HNZE6TwXmHy4","weight":1},{"memberId":"OmzGzFUSQLfS","weight":1},{"memberId":"VJ_EpVSRbHpZ","weight":1}]
}'

# 4. Download the CSV
curl -s -OJ "$BASE/api/groups/$GROUP/export"
```
