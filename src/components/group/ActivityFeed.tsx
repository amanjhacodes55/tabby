"use client";

import { useState } from "react";
import { getCategory } from "@/lib/categories";
import { api, formatDate, timeAgo } from "@/lib/client";
import type { Expense, Payment } from "@/lib/types";
import { useToast } from "../toast";
import { Button, EmptyState, cx } from "../ui";
import type { Ledger } from "./GroupApp";

type Item = { kind: "expense"; at: string; created: number; e: Expense } | { kind: "payment"; at: string; created: number; p: Payment };
const PAGE = 40;

export function ActivityFeed({
  ledger,
  onEditExpense,
  onAddExpense,
  onChanged,
}: {
  ledger: Ledger;
  onEditExpense: (e: Expense) => void;
  onAddExpense: () => void;
  onChanged: () => void;
}) {
  const { group, names, me, fmt } = ledger;
  const toast = useToast();
  const [limit, setLimit] = useState(PAGE);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const items: Item[] = [
    ...group.expenses.map((e) => ({ kind: "expense" as const, at: e.date, created: e.createdAt, e })),
    ...group.payments.filter((p) => !hidden.has(p.id)).map((p) => ({ kind: "payment" as const, at: p.date, created: p.createdAt, p })),
  ].sort((a, b) => (a.at === b.at ? b.created - a.created : a.at < b.at ? 1 : -1));

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="No expenses yet"
        body="Add the first bill — dinner, cab, rent, anything. Tabby does the math and keeps a running tab."
        action={<Button onClick={onAddExpense}>Add the first expense</Button>}
      />
    );
  }

  async function deletePayment(id: string) {
    if (pendingDelete !== id) return setPendingDelete(id);
    setHidden((h) => new Set(h).add(id)); // optimistic
    setPendingDelete(null);
    try {
      await api("DELETE", `/api/groups/${group.id}/payments/${id}`);
      toast.show("Payment removed", "success");
    } catch (e) {
      setHidden((h) => {
        const n = new Set(h);
        n.delete(id);
        return n;
      });
      toast.show((e as Error).message, "error");
    }
    onChanged();
  }

  const name = (id: string | null) => (id ? (id === me ? "you" : (names.get(id) ?? "someone")) : null);
  let lastDate = "";

  return (
    <div>
      <ul className="space-y-1.5">
        {items.slice(0, limit).map((it) => {
          const header = it.at !== lastDate ? formatDate(it.at) : null;
          lastDate = it.at;
          return (
            <li key={it.kind === "expense" ? it.e.id : it.p.id}>
              {header && <p className="px-1 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">{header}</p>}
              {it.kind === "expense" ? (
                <ExpenseRow e={it.e} ledger={ledger} onClick={() => onEditExpense(it.e)} by={name(it.e.createdBy)} />
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pos-soft text-lg">
                    💸
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {cap(name(it.p.from))} paid {name(it.p.to)}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {it.p.note ? `${it.p.note} · ` : ""}
                      {it.p.createdBy ? `recorded by ${name(it.p.createdBy)} · ` : ""}
                      {timeAgo(it.p.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="tabular font-semibold text-pos">{fmt(it.p.amount)}</span>
                    <button
                      onClick={() => deletePayment(it.p.id)}
                      onBlur={() => setPendingDelete(null)}
                      className={cx("text-[11px] font-medium", pendingDelete === it.p.id ? "text-neg" : "text-muted hover:text-neg")}
                    >
                      {pendingDelete === it.p.id ? "Confirm remove" : "Remove"}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {items.length > limit && (
        <div className="mt-4 text-center">
          <Button variant="secondary" onClick={() => setLimit(limit + PAGE * 2)}>
            Show more ({items.length - limit} older)
          </Button>
        </div>
      )}
    </div>
  );
}

const cap = (s: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : "");

function ExpenseRow({ e, ledger, onClick, by }: { e: Expense; ledger: Ledger; onClick: () => void; by: string | null }) {
  const { names, me, fmt } = ledger;
  const cat = getCategory(e.category);
  const myShare = me ? (e.splits.find((s) => s.memberId === me)?.amount ?? 0) : 0;
  const net = me ? (e.paidBy === me ? e.amount - myShare : -myShare) : 0;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left transition hover:border-brand/60 active:scale-[0.995]"
      aria-label={`Edit ${e.description}, ${fmt(e.amount)}`}
    >
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lg">
        {cat.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{e.description}</p>
        <p className="truncate text-xs text-muted">
          {e.paidBy === me ? "You" : names.get(e.paidBy)} paid {fmt(e.amount)}
          {by ? ` · added by ${by}` : ""} · {timeAgo(e.createdAt)}
        </p>
      </div>
      <div className="text-right">
        {me && net !== 0 ? (
          <>
            <p className={cx("tabular text-sm font-semibold", net > 0 ? "text-pos" : "text-neg")}>{fmt(Math.abs(net))}</p>
            <p className="text-[11px] text-muted">{net > 0 ? "you lent" : "you borrowed"}</p>
          </>
        ) : (
          <>
            <p className="tabular text-sm font-semibold">{fmt(e.amount)}</p>
            {me && <p className="text-[11px] text-muted">not involved</p>}
          </>
        )}
      </div>
    </button>
  );
}
