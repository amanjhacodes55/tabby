"use client";

import { CATEGORIES } from "@/lib/categories";
import { Avatar, EmptyState } from "../ui";
import type { Ledger } from "./GroupApp";

export function StatsView({ ledger }: { ledger: Ledger }) {
  const { group, fmt, me } = ledger;
  if (group.expenses.length === 0) return <EmptyState icon="📊" title="Nothing to chart yet" body="Stats appear once the group has a few expenses." />;

  const total = group.expenses.reduce((a, e) => a + e.amount, 0);
  const byCat = new Map<string, number>();
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  for (const e of group.expenses) {
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount);
    for (const s of e.splits) share.set(s.memberId, (share.get(s.memberId) ?? 0) + s.amount);
  }
  const cats = CATEGORIES.map((c) => ({ ...c, v: byCat.get(c.id) ?? 0 }))
    .filter((c) => c.v > 0)
    .sort((a, b) => b.v - a.v);
  const settled = group.payments.reduce((a, p) => a + p.amount, 0);
  const maxPaid = Math.max(1, ...group.members.map((m) => Math.max(paid.get(m.id) ?? 0, share.get(m.id) ?? 0)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Total group spend" value={fmt(total)} big />
        <Stat label="Expenses" value={String(group.expenses.length)} />
        <Stat label="Settled via payments" value={fmt(settled)} />
        {me && <Stat label="Your share" value={fmt(share.get(me) ?? 0)} />}
        {me && <Stat label="You paid" value={fmt(paid.get(me) ?? 0)} />}
      </div>

      <section aria-labelledby="cat-h">
        <h2 id="cat-h" className="mb-2 px-1 text-sm font-semibold text-muted">
          Spend by category
        </h2>
        <ul className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          {cats.map((c) => {
            const pct = (c.v / total) * 100;
            return (
              <li key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    <span aria-hidden>{c.emoji}</span> {c.label}
                  </span>
                  <span className="tabular text-muted">
                    <span className="font-semibold text-ink">{fmt(c.v)}</span> · {pct < 1 ? "<1" : Math.round(pct)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 1.5)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="mem-h">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 id="mem-h" className="text-sm font-semibold text-muted">
            Per person
          </h2>
          <div className="flex gap-3 text-[11px] text-muted" aria-hidden>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-ink" /> paid
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-brand" /> share
            </span>
          </div>
        </div>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {group.members.map((m) => {
            const p = paid.get(m.id) ?? 0;
            const s = share.get(m.id) ?? 0;
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <div className="mt-1.5 space-y-1" aria-hidden>
                    <div className="h-1.5 rounded-full bg-ink/80" style={{ width: `${(p / maxPaid) * 100}%` }} />
                    <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(s / maxPaid) * 100}%` }} />
                  </div>
                </div>
                <dl className="tabular grid grid-cols-[auto_auto] gap-x-2 text-right text-xs">
                  <dt className="text-muted">paid</dt>
                  <dd className="font-semibold">{fmt(p)}</dd>
                  <dt className="text-muted">share</dt>
                  <dd className="font-semibold">{fmt(s)}</dd>
                </dl>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={big ? "col-span-2 rounded-2xl bg-ink p-4 text-bg sm:col-span-1" : "rounded-2xl border border-line bg-surface p-4"}>
      <p className={big ? "text-xs opacity-70" : "text-xs text-muted"}>{label}</p>
      <p className="tabular mt-1 truncate text-xl font-bold">{value}</p>
    </div>
  );
}
