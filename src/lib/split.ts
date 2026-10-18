/**
 * Split math. Everything is integer minor units; weights are integers too.
 *
 *  - equal:   weight 1 for every included member
 *  - exact:   weight = the member's amount in minor units (must sum to the total)
 *  - percent: weight = basis points (12.5% -> 1250), must sum to 10000
 *  - shares:  weight = hundredths of a share (1.5 shares -> 150), any positive sum
 *
 * Proportional modes use the largest-remainder method: everyone gets floor(total*w/W), and the
 * leftover minor units go one each to the largest fractional remainders, ties broken by input
 * order. The result always sums exactly to the total and is fully deterministic.
 */
export const SPLIT_MODES = ["equal", "exact", "percent", "shares"] as const;
export type SplitMode = (typeof SPLIT_MODES)[number];

export type SplitInput = { memberId: string; weight: number };
export type SplitResult = { memberId: string; weight: number; amount: number };

export type SplitOutcome = { ok: true; splits: SplitResult[] } | { ok: false; error: string };

export function allocate(total: number, weights: number[]): number[] {
  const W = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (W <= 0n) throw new Error("weights must sum to a positive number");
  const T = BigInt(total);
  const base: bigint[] = [];
  const rem: bigint[] = [];
  for (const w of weights) {
    const p = T * BigInt(w);
    base.push(p / W);
    rem.push(p % W);
  }
  let leftover = Number(T - base.reduce((a, b) => a + b, 0n));
  const order = weights
    .map((_, i) => i)
    .filter((i) => weights[i] > 0)
    .sort((a, b) => (rem[b] > rem[a] ? 1 : rem[b] < rem[a] ? -1 : a - b));
  const out = base.map(Number);
  for (let k = 0; leftover > 0 && order.length > 0; k = (k + 1) % order.length, leftover--) out[order[k]] += 1;
  return out;
}

export function computeSplits(total: number, mode: SplitMode, inputs: SplitInput[]): SplitOutcome {
  if (!Number.isSafeInteger(total) || total <= 0) return { ok: false, error: "Amount must be greater than zero" };
  const seen = new Set<string>();
  for (const i of inputs) {
    if (seen.has(i.memberId)) return { ok: false, error: "A member appears twice in the split" };
    seen.add(i.memberId);
    if (!Number.isSafeInteger(i.weight) || i.weight < 0) return { ok: false, error: "Split values must be positive" };
  }
  const parts = mode === "equal" ? inputs.map((i) => ({ ...i, weight: 1 })) : inputs.filter((i) => i.weight > 0);
  if (parts.length === 0) return { ok: false, error: "Pick at least one person to split with" };

  if (mode === "exact") {
    const sum = parts.reduce((a, p) => a + p.weight, 0);
    if (sum !== total) return { ok: false, error: "Exact amounts must add up to the total" };
    return { ok: true, splits: parts.map((p) => ({ ...p, amount: p.weight })) };
  }
  if (mode === "percent") {
    const sum = parts.reduce((a, p) => a + p.weight, 0);
    if (sum !== 10000) return { ok: false, error: `Percentages add up to ${sum / 100}%, they must add up to 100%` };
  }
  const amounts = allocate(total, parts.map((p) => p.weight));
  return { ok: true, splits: parts.map((p, i) => ({ ...p, amount: amounts[i] })) };
}
