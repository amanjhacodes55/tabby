"use client";

import { useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { api, todayISO } from "@/lib/client";
import { getCurrency } from "@/lib/currency";
import { LIMITS } from "@/lib/limits";
import { MAX_AMOUNT_MAJOR, minorToInput, parseDecimal, parseMoney, toDecimalString } from "@/lib/money";
import { computeSplits, type SplitMode } from "@/lib/split";
import type { Expense } from "@/lib/types";
import { useToast } from "../toast";
import { Avatar, Button, Field, Modal, Segmented, cx, inputClass } from "../ui";
import type { Ledger } from "./GroupApp";

const GUESS: [RegExp, string][] = [
  [/\b(rent|electric|wifi|internet|bill|maintenance|gas|water)\b/i, "rent"],
  [/\b(grocer|blinkit|zepto|bigbasket|instamart|vegetable|milk|dmart)\b/i, "groceries"],
  [/\b(uber|ola|cab|taxi|flight|train|bus|metro|fuel|petrol|diesel|hotel|airbnb|toll|rapido|auto)\b/i, "travel"],
  [/\b(movie|party|game|concert|club|bowling|netflix|tickets?)\b/i, "fun"],
  [/\b(dinner|lunch|breakfast|food|pizza|coffee|chai|beer|drinks|swiggy|zomato|cafe|restaurant|snacks?|biryani)\b/i, "food"],
];

const trimDec = (s: string) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);

export function ExpenseForm({
  ledger,
  expense,
  onClose,
  onSaved,
}: {
  ledger: Ledger;
  expense?: Expense;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { group, me, fmt } = ledger;
  const toast = useToast();
  const members = group.members;
  const cur = getCurrency(group.currency);
  const weightOf = (id: string) => expense?.splits.find((s) => s.memberId === id)?.weight;

  const [description, setDescription] = useState(expense?.description ?? "");
  const [amountStr, setAmountStr] = useState(expense ? minorToInput(expense.amount, group.currency) : "");
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? (me && members.some((m) => m.id === me) ? me : members[0]?.id));
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [category, setCategory] = useState(expense?.category ?? "other");
  const [categoryTouched, setCategoryTouched] = useState(!!expense);
  const [mode, setMode] = useState<SplitMode>(expense?.splitMode ?? "equal");
  const [included, setIncluded] = useState<Set<string>>(
    () => new Set(expense?.splitMode === "equal" ? expense.splits.map((s) => s.memberId) : members.map((m) => m.id)),
  );
  const init = (m: SplitMode, conv: (w: number) => string, dflt = "") =>
    Object.fromEntries(members.map((x) => [x.id, expense?.splitMode === m && weightOf(x.id) !== undefined ? conv(weightOf(x.id)!) : dflt]));
  const [exact, setExact] = useState<Record<string, string>>(() => init("exact", (w) => minorToInput(w, group.currency)));
  const [pct, setPct] = useState<Record<string, string>>(() => init("percent", (w) => trimDec(toDecimalString(w, 2))));
  const [shares, setShares] = useState<Record<string, string>>(() => init("shares", (w) => trimDec(toDecimalString(w, 2)), "1"));
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const amount = parseMoney(amountStr, group.currency);
  const amountError =
    amountStr.trim() === ""
      ? "Enter an amount"
      : amount === null
        ? `Use a number with up to ${cur.decimals} decimals`
        : amount <= 0
          ? "Amount must be more than zero"
          : amount > MAX_AMOUNT_MAJOR * 10 ** cur.decimals
            ? "That's too large for one expense"
            : null;

  // Build the split weights for the current mode and preview the result.
  const { weights, inputError } = useMemo(() => {
    const out: { memberId: string; weight: number }[] = [];
    let err: string | null = null;
    for (const m of members) {
      if (mode === "equal") {
        if (included.has(m.id)) out.push({ memberId: m.id, weight: 1 });
        continue;
      }
      const raw = (mode === "exact" ? exact : mode === "percent" ? pct : shares)[m.id] ?? "";
      if (raw.trim() === "") continue;
      const v = mode === "exact" ? parseMoney(raw, group.currency) : parseDecimal(raw, 2);
      if (v === null) {
        err = `Check the value for ${m.name}`;
        continue;
      }
      if (v > 0) out.push({ memberId: m.id, weight: v });
    }
    return { weights: out, inputError: err };
  }, [members, mode, included, exact, pct, shares, group.currency]);

  const preview = useMemo(() => {
    if (!amount || amountError) return null;
    if (inputError) return { ok: false as const, error: inputError };
    return computeSplits(amount, mode, weights);
  }, [amount, amountError, mode, weights, inputError]);
  const previewBy = new Map(preview?.ok ? preview.splits.map((s) => [s.memberId, s.amount]) : []);

  let status: { text: string; tone: "ok" | "warn" } | null = null;
  if (mode === "exact" && amount) {
    const sum = weights.reduce((a, w) => a + w.weight, 0);
    const left = amount - sum;
    status = left === 0 ? { text: "All assigned", tone: "ok" } : { text: left > 0 ? `${fmt(left)} left to assign` : `${fmt(-left)} over the total`, tone: "warn" };
  } else if (mode === "percent") {
    const sum = weights.reduce((a, w) => a + w.weight, 0);
    const left = 10000 - sum;
    status = left === 0 ? { text: "Adds up to 100%", tone: "ok" } : { text: left > 0 ? `${trimDec(toDecimalString(left, 2))}% left` : `${trimDec(toDecimalString(-left, 2))}% over`, tone: "warn" };
  } else if (mode === "equal" && preview?.ok) {
    status = { text: `${fmt(preview.splits[0].amount)} each${preview.splits.some((s) => s.amount !== preview.splits[0].amount) ? " (±1 for rounding)" : ""}`, tone: "ok" };
  }

  const descError = description.trim() ? null : "What was it for?";
  const splitError = !preview ? null : preview.ok ? null : preview.error;
  const canSave = !descError && !amountError && preview?.ok && paidBy;

  function onDescription(v: string) {
    setDescription(v);
    if (!categoryTouched) {
      const hit = GUESS.find(([re]) => re.test(v));
      setCategory(hit ? hit[1] : "other");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!canSave || !amount) {
      toast.show(descError ?? amountError ?? splitError ?? "Check the form", "error");
      return;
    }
    setBusy(true);
    const body = { description, amount, paidBy, date, category, splitMode: mode, splits: weights, createdBy: me ?? null };
    try {
      if (expense) await api("PUT", `/api/groups/${group.id}/expenses/${expense.id}`, body);
      else await api("POST", `/api/groups/${group.id}/expenses`, body);
      toast.show(expense ? "Expense updated" : "Expense added", "success");
      onSaved();
    } catch (err) {
      toast.show((err as Error).message, "error");
      setBusy(false);
    }
  }

  async function remove() {
    if (!expense) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setDeleting(true);
    try {
      await api("DELETE", `/api/groups/${group.id}/expenses/${expense.id}`);
      toast.show("Expense deleted", "success");
      onSaved();
    } catch (err) {
      toast.show((err as Error).message, "error");
      setDeleting(false);
    }
  }

  const setter = mode === "exact" ? setExact : mode === "percent" ? setPct : setShares;
  const values = mode === "exact" ? exact : mode === "percent" ? pct : shares;

  return (
    <Modal
      open
      onClose={onClose}
      title={expense ? "Edit expense" : "Add an expense"}
      footer={
        <div className="flex gap-2">
          {expense && (
            <Button variant="danger" onClick={remove} loading={deleting} type="button">
              {confirmDelete ? "Tap to confirm" : "Delete"}
            </Button>
          )}
          <Button type="submit" form="expense-form" className="flex-1" loading={busy} disabled={submitted && !canSave}>
            {expense ? "Save changes" : "Add expense"}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={save} className="space-y-4" noValidate>
        <div className="grid grid-cols-[1fr_8.5rem] gap-3">
          <Field label="Description" htmlFor="e-desc" error={submitted ? descError : null}>
            <input
              id="e-desc"
              data-autofocus
              className={inputClass}
              placeholder="Dinner at Toit"
              value={description}
              maxLength={LIMITS.description}
              onChange={(e) => onDescription(e.target.value)}
              aria-invalid={submitted && !!descError}
              autoComplete="off"
            />
          </Field>
          <Field label={`Amount (${cur.symbol})`} htmlFor="e-amt" error={submitted || (amountStr && amountError) ? amountError : null}>
            <input
              id="e-amt"
              className={cx(inputClass, "tabular text-right font-semibold")}
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              aria-invalid={!!amountStr && !!amountError}
              autoComplete="off"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Paid by" htmlFor="e-paid">
            <select id="e-paid" className={inputClass} value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.id === me ? " (you)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" htmlFor="e-date">
            <input id="e-date" type="date" className={inputClass} value={date} min="2000-01-01" max="2100-12-31" onChange={(e) => setDate(e.target.value)} required />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Category</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => {
                  setCategory(c.id);
                  setCategoryTouched(true);
                }}
                className={cx(
                  "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-xs font-medium transition",
                  category === c.id ? "border-brand bg-brand-soft text-ink" : "border-line text-muted hover:text-ink",
                )}
              >
                <span className="text-lg" aria-hidden>
                  {c.emoji}
                </span>
                {c.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Split</span>
            {status && <span className={cx("text-xs font-semibold", status.tone === "ok" ? "text-pos" : "text-neg")}>{status.text}</span>}
          </div>
          <Segmented<SplitMode>
            label="Split mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "equal", label: "Equally" },
              { value: "exact", label: "Exact" },
              { value: "percent", label: "%" },
              { value: "shares", label: "Shares" },
            ]}
          />
          {mode === "equal" && (
            <div className="flex justify-end gap-3 text-xs font-semibold">
              <button type="button" className="text-brand" onClick={() => setIncluded(new Set(members.map((m) => m.id)))}>
                Everyone
              </button>
              <button type="button" className="text-muted" onClick={() => setIncluded(new Set())}>
                None
              </button>
            </div>
          )}
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {members.map((m) => {
              const share = previewBy.get(m.id);
              return (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                  {mode === "equal" ? (
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-5 accent-[var(--brand)]"
                        checked={included.has(m.id)}
                        onChange={(e) => {
                          const next = new Set(included);
                          if (e.target.checked) next.add(m.id);
                          else next.delete(m.id);
                          setIncluded(next);
                        }}
                      />
                      <Avatar name={m.name} size={28} />
                      <span className="flex-1 truncate text-sm font-medium">{m.name}</span>
                    </label>
                  ) : (
                    <>
                      <Avatar name={m.name} size={28} />
                      <label htmlFor={`w-${m.id}`} className="flex-1 truncate text-sm font-medium">
                        {m.name}
                      </label>
                      <div className="relative w-28">
                        <input
                          id={`w-${m.id}`}
                          className={cx(inputClass, "tabular h-10 pr-8 text-right")}
                          inputMode="decimal"
                          placeholder="0"
                          value={values[m.id] ?? ""}
                          onChange={(e) => setter({ ...values, [m.id]: e.target.value })}
                          autoComplete="off"
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">
                          {mode === "exact" ? cur.symbol : mode === "percent" ? "%" : "×"}
                        </span>
                      </div>
                    </>
                  )}
                  <span className={cx("tabular w-20 text-right text-sm", share ? "font-semibold" : "text-muted")}>{share ? fmt(share) : "—"}</span>
                </li>
              );
            })}
          </ul>
          {splitError && (submitted || mode !== "equal") && (
            <p role="alert" className="text-sm text-neg">
              {splitError}
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}
