import { computeBalances, settleUp } from "./balances";
import { getCategory } from "./categories";
import { getCurrency } from "./currency";
import { toDecimalString } from "./money";
import type { GroupData } from "./types";

function cell(v: string | number): string {
  let s = String(v);
  // Neutralise spreadsheet formula injection in text cells.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * One row per expense / payment. Member columns show each person's net effect for that row
 * (positive = they are owed more, negative = they owe more), so each column sums to the balance.
 */
export function buildCsv(g: GroupData): string {
  const d = getCurrency(g.currency).decimals;
  const fmt = (m: number) => toDecimalString(m, d);
  const name = new Map(g.members.map((m) => [m.id, m.name]));
  const header = ["Date", "Type", "Description", "Category", `Amount (${g.currency})`, "Paid by", "Split", ...g.members.map((m) => m.name)];
  type Row = { date: string; created: number; cells: (string | number)[] };
  const rows: Row[] = [];
  for (const e of g.expenses) {
    const effect = new Map<string, number>();
    effect.set(e.paidBy, e.amount);
    for (const s of e.splits) effect.set(s.memberId, (effect.get(s.memberId) ?? 0) - s.amount);
    rows.push({
      date: e.date,
      created: e.createdAt,
      cells: [e.date, "Expense", e.description, getCategory(e.category).label, fmt(e.amount), name.get(e.paidBy) ?? "", e.splitMode, ...g.members.map((m) => fmt(effect.get(m.id) ?? 0))],
    });
  }
  for (const p of g.payments) {
    rows.push({
      date: p.date,
      created: p.createdAt,
      cells: [
        p.date,
        "Payment",
        `${name.get(p.from) ?? "?"} paid ${name.get(p.to) ?? "?"}${p.note ? ` (${p.note})` : ""}`,
        "",
        fmt(p.amount),
        name.get(p.from) ?? "",
        "",
        ...g.members.map((m) => fmt(m.id === p.from ? p.amount : m.id === p.to ? -p.amount : 0)),
      ],
    });
  }
  rows.sort((a, b) => (a.date === b.date ? a.created - b.created : a.date < b.date ? -1 : 1));

  const ids = g.members.map((m) => m.id);
  const bal = computeBalances(
    ids,
    g.expenses,
    g.payments.map((p) => ({ from: p.from, to: p.to, amount: p.amount })),
  );
  const lines: (string | number)[][] = [header, ...rows.map((r) => r.cells)];
  lines.push([], ["Balance", "", "", "", "", "", "", ...ids.map((id) => fmt(bal.get(id) ?? 0))]);
  const transfers = settleUp(bal, ids);
  if (transfers.length) {
    lines.push([], ["Settle up", "From", "To", `Amount (${g.currency})`]);
    for (const t of transfers) lines.push(["", name.get(t.from) ?? "", name.get(t.to) ?? "", fmt(t.amount)]);
  }
  return "﻿" + lines.map((l) => l.map(cell).join(",")).join("\r\n") + "\r\n";
}
