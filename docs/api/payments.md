# Payments

A payment records money moving directly between two people ("Chen paid Asha ₹5,000"), usually to
settle up. It reduces what the sender owes and what the receiver is owed.
Source: [`src/app/api/groups/[id]/payments/route.ts`](../../src/app/api/groups/[id]/payments/route.ts),
[`src/app/api/groups/[id]/payments/[paymentId]/route.ts`](../../src/app/api/groups/[id]/payments/[paymentId]/route.ts).

Tabby never moves money itself. The UI's "Pay via UPI" button only opens a `upi://pay` link; the
payment is recorded when someone taps **Mark as paid**, which opens the **Record a payment** form
prefilled with that transfer; saving it calls `POST` below.

---

## `POST /api/groups/{groupId}/payments`

Record a payment.

**Access:** anyone with the group id.

### Body

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `from` | string | yes | Member id of the person who paid |
| `to` | string | yes | Member id of the person who received; must differ from `from` |
| `amount` | integer | yes | Minor units, `> 0`, at most 10,000,000 major units for the group currency |
| `date` | string | yes | `YYYY-MM-DD`, a real date in 2000-01-01…2100-12-31 |
| `note` | string \| null | no | Up to 200 chars after whitespace cleanup; empty becomes `null` |
| `createdBy` | string \| null | no | Member id of whoever is recording it (self-reported) |

### Example

```bash
curl -s -X POST "$BASE/api/groups/$GROUP/payments" \
  -H 'Content-Type: application/json' \
  -d '{"from":"OmzGzFUSQLfS","to":"HNZE6TwXmHy4","amount":500000,"date":"2026-10-14",
       "note":"Flights share","createdBy":"OmzGzFUSQLfS"}'
```

`201 Created`

```json
{ "id": "wUfsPM_itXuq" }
```

### Errors

| Status | `error` | Cause |
| --- | --- | --- |
| `400` | `Invalid JSON` | Body isn't JSON |
| `404` | `Group not found` | Malformed id or no such group |
| `413` | `Request too large` | Body over 32 KB |
| `422` | `Payer and receiver must be different` | `from` equals `to` |
| `422` | `Invalid date`, `Invalid id`, … | Schema validation (first issue only) |
| `422` | `Amount is too large` | Over 10,000,000 major units for this currency |
| `422` | `Both people must be in this group` | `from` or `to` isn't a member |
| `422` | `Unknown member` | `createdBy` isn't a member |
| `422` | `This group reached the limit of 5000 payments` | Per-group cap |

---

## `DELETE /api/groups/{groupId}/payments/{paymentId}`

Delete a recorded payment (the **Remove** link in the activity feed). Payments can't be edited; delete
and record again.

**Access:** anyone with the group id. No body.

```bash
curl -s -X DELETE "$BASE/api/groups/$GROUP/payments/wUfsPM_itXuq"
```

`200 OK`

```json
{ "ok": true }
```

### Errors

| Status | `error` | Cause |
| --- | --- | --- |
| `404` | `Group not found` | Malformed group id |
| `404` | `Payment not found` | No such payment in this group |
