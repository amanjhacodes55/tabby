import { describe, expect, it } from "vitest";
import { allocate, computeSplits } from "./split";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("allocate", () => {
  it("splits evenly when divisible", () => {
    expect(allocate(900, [1, 1, 1])).toEqual([300, 300, 300]);
  });
  it("gives remainders to the earliest members deterministically", () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333]);
    expect(allocate(1001, [1, 1, 1])).toEqual([334, 334, 333]);
    expect(allocate(1, [1, 1, 1])).toEqual([1, 0, 0]);
  });
  it("uses largest remainder for weighted splits", () => {
    // 100 * 1/6 = 16.67, 100 * 2/6 = 33.33, 100 * 3/6 = 50
    expect(allocate(100, [1, 2, 3])).toEqual([17, 33, 50]);
  });
  it("always sums to the total (property check)", () => {
    let seed = 42;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 2000; i++) {
      const total = 1 + rnd(10_000_000);
      const weights = Array.from({ length: 1 + rnd(12) }, () => rnd(5000));
      if (sum(weights) === 0) weights[0] = 1;
      const out = allocate(total, weights);
      expect(sum(out)).toBe(total);
      out.forEach((v, k) => {
        expect(v).toBeGreaterThanOrEqual(0);
        if (weights[k] === 0) expect(v).toBe(0);
      });
    }
  });
  it("handles huge weights without precision loss", () => {
    const out = allocate(1_000_000_000, [999_999_999, 1_000_000_000, 1]);
    expect(sum(out)).toBe(1_000_000_000);
  });
});

describe("computeSplits", () => {
  const ids = ["a", "b", "c"];
  it("equal split among included members only", () => {
    const r = computeSplits(10000, "equal", [{ memberId: "a", weight: 1 }, { memberId: "c", weight: 1 }]);
    expect(r).toEqual({ ok: true, splits: [{ memberId: "a", weight: 1, amount: 5000 }, { memberId: "c", weight: 1, amount: 5000 }] });
  });
  it("equal split of ₹100 three ways gives 33.34/33.33/33.33", () => {
    const r = computeSplits(10000, "equal", ids.map((memberId) => ({ memberId, weight: 1 })));
    expect(r.ok && r.splits.map((s) => s.amount)).toEqual([3334, 3333, 3333]);
  });
  it("exact amounts must match the total", () => {
    expect(computeSplits(1000, "exact", [{ memberId: "a", weight: 600 }, { memberId: "b", weight: 300 }]).ok).toBe(false);
    const r = computeSplits(1000, "exact", [{ memberId: "a", weight: 700 }, { memberId: "b", weight: 300 }, { memberId: "c", weight: 0 }]);
    expect(r.ok && r.splits).toEqual([{ memberId: "a", weight: 700, amount: 700 }, { memberId: "b", weight: 300, amount: 300 }]);
  });
  it("percentages must add to 100 and round deterministically", () => {
    expect(computeSplits(1000, "percent", [{ memberId: "a", weight: 5000 }, { memberId: "b", weight: 4000 }]).ok).toBe(false);
    const r = computeSplits(1000, "percent", [
      { memberId: "a", weight: 3333 },
      { memberId: "b", weight: 3333 },
      { memberId: "c", weight: 3334 },
    ]);
    expect(r.ok && r.splits.map((s) => s.amount)).toEqual([333, 333, 334]);
  });
  it("shares split proportionally (fractional shares in hundredths)", () => {
    const r = computeSplits(1000, "shares", [{ memberId: "a", weight: 200 }, { memberId: "b", weight: 100 }, { memberId: "c", weight: 150 }]);
    expect(r.ok && r.splits.map((s) => s.amount)).toEqual([445, 222, 333]);
  });
  it("rejects bad input", () => {
    expect(computeSplits(0, "equal", [{ memberId: "a", weight: 1 }]).ok).toBe(false);
    expect(computeSplits(100, "equal", []).ok).toBe(false);
    expect(computeSplits(100, "shares", [{ memberId: "a", weight: 0 }]).ok).toBe(false);
    expect(computeSplits(100, "equal", [{ memberId: "a", weight: 1 }, { memberId: "a", weight: 1 }]).ok).toBe(false);
    expect(computeSplits(100, "shares", [{ memberId: "a", weight: -1 }]).ok).toBe(false);
  });
});
