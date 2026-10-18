# Balances & settle-up

**There is no balances endpoint.** Balances and the settle-up plan are derived from the group data
returned by [`GET /api/groups/{groupId}`](groups.md#get-apigroupsgroupid). The browser computes them
for the Balances tab, and the server computes them only for the [CSV export](export.md). Both use the
same pure functions in [`src/lib/balances.ts`](../../src/lib/balances.ts), covered by
[`src/lib/balances.test.ts`](../../src/lib/balances.test.ts).

If you build on the API, reproduce the two steps below (or import `computeBalances` / `settleUp`).

## Net balances

All values are integer minor units. Start every member at `0`, then:

| Event | Effect |
| --- | --- |
| Expense of `amount` paid by P | P `+= amount` |
| Each split `{ memberId: M, amount: a }` of that expense | M `-= a` |
| Payment of `amount` from S to R | S `+= amount`, R `-= amount` |

A **positive** balance means the group owes that person ("gets back"); **negative** means they owe
("owes"). Because every expense's splits sum exactly to its amount (largest-remainder allocation,
see [Expenses](expenses.md#split-modes)), balances always sum to exactly `0`; no rounding drift.

```ts
// src/lib/balances.ts (abridged)
for (const e of expenses) {
  add(e.paidBy, e.amount);
  for (const s of e.splits) add(s.memberId, -s.amount);
}
for (const p of payments) {
  add(p.from, p.amount);  // paying back reduces what you owe
  add(p.to, -p.amount);   // receiving reduces what you are owed
}
```

## Settle-up plan

`settleUp(balances, memberIds)` turns balances into a short list of transfers with a greedy algorithm:

1. Split people into creditors (balance > 0) and debtors (balance < 0, stored as positive debt).
2. Sort both lists by amount, largest first; ties go by member order in the group.
3. The largest debtor pays the largest creditor `min(debt, credit)`. Remove whoever reaches zero, re-sort, repeat.

Each step zeroes at least one person, so the plan has **at most n − 1 payments** for n people with
non-zero balances. The output is deterministic, so every client shows the same plan.

### Worked example (the demo group)

| Member | Balance (₹) |
| --- | --- |
| Ben | +25,349.87 |
| Asha | +5,612.87 |
| Chen | −14,447.62 |
| Divya | −16,515.12 |

Plan: Divya → Ben ₹16,515.12; Chen → Ben ₹8,834.75; Chen → Asha ₹5,612.87. Three payments clear everything.

## UPI pay links

For **INR** groups, each transfer whose receiver has a UPI ID gets a deep link built by
`buildUpiLink` in [`src/lib/upi.ts`](../../src/lib/upi.ts):

```
upi://pay?pa=ben.demo@ybl&pn=Ben&am=16515.12&cu=INR&tn=Tabby%3A%20Goa%20trip%20(demo)
```

`pa` = payee UPI ID (the `@` is kept literal because some UPI apps fail on `%40`), `pn` = payee name,
`am` = amount with 2 decimals, `cu` = `INR`, `tn` = note (`Tabby: <group name>`, max 80 chars). The
UI also renders it as a QR code in the browser. No payment provider is called; recording the payment
afterwards is a separate [`POST .../payments`](payments.md#post-apigroupsgroupidpayments).
