"use client";

import { useState } from "react";
import { buildUpiLink } from "@/lib/upi";
import { Avatar, Button, EmptyState, buttonClass, cx } from "../ui";
import type { Ledger } from "./GroupApp";
import type { PaymentDraft } from "./PaymentForm";
import { QrCode } from "./QrCode";

export function BalancesView({ ledger, onRecord, onGoToPeople }: { ledger: Ledger; onRecord: (d: PaymentDraft) => void; onGoToPeople: () => void }) {
  const { group, balances, transfers, names, me, fmt } = ledger;
  const [qrFor, setQrFor] = useState<number | null>(null);
  const max = Math.max(1, ...[...balances.values()].map(Math.abs));
  const isINR = group.currency === "INR";
  const sorted = [...group.members].sort((a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0));
  const mine = (t: { from: string; to: string }) => t.from === me || t.to === me;
  const ordered = [...transfers.map((t, i) => ({ ...t, i }))].sort((a, b) => Number(mine(b)) - Number(mine(a)));

  return (
    <div className="space-y-6">
      <section aria-labelledby="settle-h">
        <h2 id="settle-h" className="mb-2 px-1 text-sm font-semibold text-muted">
          Settle up {transfers.length > 0 && <span className="font-normal">· {transfers.length} payment{transfers.length > 1 ? "s" : ""} clears everything</span>}
        </h2>
        {transfers.length === 0 ? (
          <EmptyState icon="🎉" title="All settled up" body="Nobody owes anybody. Add an expense when the next bill lands." />
        ) : (
          <ul className="space-y-2">
            {ordered.map((t) => {
              const creditor = group.members.find((m) => m.id === t.to);
              const upi =
                isINR && creditor?.upiId
                  ? buildUpiLink({ upiId: creditor.upiId, name: creditor.name, amountMinor: t.amount, note: `Tabby: ${group.name}` })
                  : null;
              const youPay = t.from === me;
              return (
                <li key={`${t.from}-${t.to}`} className={cx("rounded-2xl border bg-surface p-4", youPay ? "border-brand" : "border-line")}>
                  <div className="flex items-center gap-3">
                    <Avatar name={names.get(t.from) ?? "?"} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px]">
                        <strong>{t.from === me ? "You" : names.get(t.from)}</strong> <span className="text-muted">{t.from === me ? "pay" : "pays"}</span>{" "}
                        <strong>{t.to === me ? "you" : names.get(t.to)}</strong>
                      </p>
                      <p className="tabular text-lg font-bold">{fmt(t.amount)}</p>
                    </div>
                    <Avatar name={names.get(t.to) ?? "?"} size={36} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {upi && (
                      <a href={upi} className={buttonClass("primary", "sm")} rel="noopener">
                        Pay {fmt(t.amount)} via UPI
                      </a>
                    )}
                    {upi && (
                      <Button variant="secondary" size="sm" onClick={() => setQrFor(qrFor === t.i ? null : t.i)} aria-expanded={qrFor === t.i}>
                        {qrFor === t.i ? "Hide QR" : "Show QR"}
                      </Button>
                    )}
                    <Button variant={upi ? "ghost" : "secondary"} size="sm" onClick={() => onRecord({ from: t.from, to: t.to, amount: t.amount })}>
                      Mark as paid
                    </Button>
                  </div>
                  {upi && qrFor === t.i && (
                    <div className="animate-pop mt-4 flex flex-col items-center gap-2 rounded-2xl bg-surface-2 p-4 text-center">
                      <QrCode value={upi} label={`UPI QR code to pay ${fmt(t.amount)} to ${creditor?.name}`} />
                      <p className="text-xs text-muted">
                        Scan with any UPI app to pay {creditor?.name} ({creditor?.upiId}).
                        <br />
                        After paying, tap “Mark as paid”.
                      </p>
                    </div>
                  )}
                  {isINR && !creditor?.upiId && (
                    <p className="mt-3 text-xs text-muted">
                      Want one-tap UPI?{" "}
                      <button className="font-semibold text-brand hover:underline" onClick={onGoToPeople}>
                        Add {creditor?.name}&apos;s UPI ID
                      </button>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="bal-h">
        <h2 id="bal-h" className="mb-2 px-1 text-sm font-semibold text-muted">
          Balances
        </h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {sorted.map((m) => {
            const v = balances.get(m.id) ?? 0;
            return (
              <li key={m.id} className={cx("flex items-center gap-3 px-4 py-3", m.id === me && "bg-brand-soft/40")}>
                <Avatar name={m.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name}
                    {m.id === me && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className={cx("h-full rounded-full", v >= 0 ? "bg-pos" : "bg-neg")} style={{ width: `${(Math.abs(v) / max) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className={cx("tabular text-sm font-bold", v > 0 && "text-pos", v < 0 && "text-neg", v === 0 && "text-muted")}>
                    {v === 0 ? "settled" : fmt(Math.abs(v))}
                  </p>
                  {v !== 0 && <p className="text-[11px] text-muted">{v > 0 ? "gets back" : "owes"}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
