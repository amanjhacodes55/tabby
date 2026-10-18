import { describe, expect, it } from "vitest";
import { computeBalances, settleUp, type Transfer } from "./balances";

function apply(bal: Map<string, number>, ts: Transfer[]) {
  const m = new Map(bal);
  for (const t of ts) {
    m.set(t.from, (m.get(t.from) ?? 0) + t.amount);
    m.set(t.to, (m.get(t.to) ?? 0) - t.amount);
  }
  return m;
}

describe("computeBalances", () => {
  it("credits payer and debits participants", () => {
    const b = computeBalances(
      ["a", "b", "c"],
      [{ amount: 3000, paidBy: "a", splits: [{ memberId: "a", amount: 1000 }, { memberId: "b", amount: 1000 }, { memberId: "c", amount: 1000 }] }],
      [],
    );
    expect(Object.fromEntries(b)).toEqual({ a: 2000, b: -1000, c: -1000 });
  });
  it("payments move balances toward zero", () => {
    const b = computeBalances(
      ["a", "b"],
      [{ amount: 1000, paidBy: "a", splits: [{ memberId: "b", amount: 1000 }] }],
      [{ from: "b", to: "a", amount: 400 }],
    );
    expect(Object.fromEntries(b)).toEqual({ a: 600, b: -600 });
  });
  it("balances always sum to zero", () => {
    const b = computeBalances(
      ["a", "b", "c"],
      [
        { amount: 999, paidBy: "a", splits: [{ memberId: "a", amount: 333 }, { memberId: "b", amount: 333 }, { memberId: "c", amount: 333 }] },
        { amount: 500, paidBy: "c", splits: [{ memberId: "b", amount: 500 }] },
      ],
      [{ from: "b", to: "c", amount: 123 }],
    );
    expect([...b.values()].reduce((x, y) => x + y, 0)).toBe(0);
  });
});

describe("settleUp", () => {
  it("returns nothing when everyone is settled", () => {
    expect(settleUp(new Map([["a", 0], ["b", 0]]))).toEqual([]);
  });
  it("matches largest debtor with largest creditor", () => {
    const bal = new Map([["a", 5000], ["b", 2000], ["c", -6000], ["d", -1000]]);
    expect(settleUp(bal, ["a", "b", "c", "d"])).toEqual([
      { from: "c", to: "a", amount: 5000 },
      { from: "c", to: "b", amount: 1000 },
      { from: "d", to: "b", amount: 1000 },
    ]);
  });
  it("collapses a chain into a single transfer", () => {
    // a owes b 10, b owes c 10  ->  a pays c 10
    const bal = new Map([["a", -1000], ["b", 0], ["c", 1000]]);
    expect(settleUp(bal)).toEqual([{ from: "a", to: "c", amount: 1000 }]);
  });
  it("breaks ties by member order", () => {
    const bal = new Map([["x", -100], ["y", -100], ["p", 100], ["q", 100]]);
    expect(settleUp(bal, ["p", "q", "x", "y"])).toEqual([
      { from: "x", to: "p", amount: 100 },
      { from: "y", to: "q", amount: 100 },
    ]);
  });
  it("settles every random ledger completely in at most n-1 transfers", () => {
    let seed = 7;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 500; i++) {
      const n = 2 + rnd(15);
      const ids = Array.from({ length: n }, (_, k) => `m${k}`);
      const vals = ids.map(() => rnd(200000) - 100000);
      vals[n - 1] -= vals.reduce((a, b) => a + b, 0);
      const bal = new Map(ids.map((id, k) => [id, vals[k]]));
      const ts = settleUp(bal, ids);
      expect(ts.length).toBeLessThanOrEqual(n - 1);
      ts.forEach((t) => expect(t.amount).toBeGreaterThan(0));
      for (const v of apply(bal, ts).values()) expect(v).toBe(0);
    }
  });
});
