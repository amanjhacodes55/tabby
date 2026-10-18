"use client";

import { useState } from "react";
import { api, todayISO } from "@/lib/client";
import { getCurrency } from "@/lib/currency";
import { LIMITS } from "@/lib/limits";
import { MAX_AMOUNT_MAJOR, minorToInput, parseMoney } from "@/lib/money";
import { useToast } from "../toast";
import { Button, Field, Modal, cx, inputClass } from "../ui";
import type { Ledger } from "./GroupApp";

export type PaymentDraft = { from?: string; to?: string; amount?: number };

export function PaymentForm({ ledger, draft, onClose, onSaved }: { ledger: Ledger; draft?: PaymentDraft; onClose: () => void; onSaved: () => void }) {
  const { group, me, transfers } = ledger;
  const toast = useToast();
  const cur = getCurrency(group.currency);
  // Default to the first suggested transfer involving me, else the first suggestion.
  const suggestion = draft ?? transfers.find((t) => t.from === me || t.to === me) ?? transfers[0];
  const members = group.members;
  const [from, setFrom] = useState(suggestion?.from ?? me ?? members[0]?.id ?? "");
  const [to, setTo] = useState(suggestion?.to ?? members.find((m) => m.id !== (suggestion?.from ?? me ?? members[0]?.id))?.id ?? "");
  const [amountStr, setAmountStr] = useState(suggestion?.amount ? minorToInput(suggestion.amount, group.currency) : "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = parseMoney(amountStr, group.currency);
  const error =
    from === to
      ? "Pick two different people"
      : !amount
        ? amountStr
          ? "Enter a valid amount"
          : null
        : amount > MAX_AMOUNT_MAJOR * 10 ** cur.decimals
          ? "That's too large"
          : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (error || !amount) return toast.show(error ?? "Enter an amount", "error");
    setBusy(true);
    try {
      await api("POST", `/api/groups/${group.id}/payments`, { from, to, amount, date, note: note || null, createdBy: me ?? null });
      toast.show("Payment recorded", "success");
      onSaved();
    } catch (err) {
      toast.show((err as Error).message, "error");
      setBusy(false);
    }
  }

  const options = members.map((m) => (
    <option key={m.id} value={m.id}>
      {m.name}
      {m.id === me ? " (you)" : ""}
    </option>
  ));

  return (
    <Modal
      open
      onClose={onClose}
      title="Record a payment"
      footer={
        <Button type="submit" form="payment-form" className="w-full" loading={busy}>
          Record payment
        </Button>
      }
    >
      <form id="payment-form" onSubmit={save} className="space-y-4" noValidate>
        <p className="text-sm text-muted">Paid someone back in cash or UPI? Record it here so balances stay right.</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Field label="From" htmlFor="p-from">
            <select id="p-from" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)}>
              {options}
            </select>
          </Field>
          <span className="pb-3 text-muted" aria-hidden>
            →
          </span>
          <Field label="To" htmlFor="p-to">
            <select id="p-to" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)}>
              {options}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${cur.symbol})`} htmlFor="p-amt">
            <input
              id="p-amt"
              data-autofocus
              className={cx(inputClass, "tabular text-right font-semibold")}
              inputMode="decimal"
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Date" htmlFor="p-date">
            <input id="p-date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Note (optional)" htmlFor="p-note">
          <input id="p-note" className={inputClass} placeholder="UPI ref, cash…" value={note} maxLength={LIMITS.note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-neg">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
