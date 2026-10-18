export type LedgerExpense = { amount: number; paidBy: string; splits: { memberId: string; amount: number }[] };
export type LedgerPayment = { from: string; to: string; amount: number };
export type Transfer = { from: string; to: string; amount: number };

/** Net balance per member: positive = the group owes them, negative = they owe the group. */
export function computeBalances(
  memberIds: string[],
  expenses: LedgerExpense[],
  payments: LedgerPayment[],
): Map<string, number> {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const add = (id: string, v: number) => net.set(id, (net.get(id) ?? 0) + v);
  for (const e of expenses) {
    add(e.paidBy, e.amount);
    for (const s of e.splits) add(s.memberId, -s.amount);
  }
  for (const p of payments) {
    add(p.from, p.amount); // paying back reduces what you owe
    add(p.to, -p.amount); // receiving reduces what you are owed
  }
  return net;
}

/**
 * Greedy minimal-transactions settle up: repeatedly match the largest debtor with the largest
 * creditor and move min(debt, credit). Produces at most n-1 transfers. Ties are broken by the
 * order of `memberIds` so the output is stable between renders.
 */
export function settleUp(balances: Map<string, number>, memberIds: string[] = [...balances.keys()]): Transfer[] {
  const order = new Map(memberIds.map((id, i) => [id, i]));
  const rank = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
  const creditors: { id: string; amt: number }[] = [];
  const debtors: { id: string; amt: number }[] = [];
  for (const [id, v] of balances) {
    if (v > 0) creditors.push({ id, amt: v });
    else if (v < 0) debtors.push({ id, amt: -v });
  }
  const sort = (xs: { id: string; amt: number }[]) => xs.sort((a, b) => b.amt - a.amt || rank(a.id) - rank(b.id));
  const out: Transfer[] = [];
  sort(creditors);
  sort(debtors);
  while (creditors.length && debtors.length) {
    const c = creditors[0];
    const d = debtors[0];
    const amt = Math.min(c.amt, d.amt);
    out.push({ from: d.id, to: c.id, amount: amt });
    c.amt -= amt;
    d.amt -= amt;
    if (c.amt === 0) creditors.shift();
    if (d.amt === 0) debtors.shift();
    sort(creditors);
    sort(debtors);
  }
  return out;
}
