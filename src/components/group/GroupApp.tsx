"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeBalances, settleUp, type Transfer } from "@/lib/balances";
import { api, rememberGroup, shareOrCopy, storage, copyText } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import type { Expense, GroupData } from "@/lib/types";
import { useToast } from "../toast";
import { Avatar, Button, Logo, cx } from "../ui";
import { ActivityFeed } from "./ActivityFeed";
import { BalancesView } from "./BalancesView";
import { ExpenseForm } from "./ExpenseForm";
import { IdentityPicker } from "./IdentityPicker";
import { MembersView } from "./MembersView";
import { PaymentForm, type PaymentDraft } from "./PaymentForm";
import { StatsView } from "./StatsView";

export type Ledger = {
  group: GroupData;
  me: string | null;
  names: Map<string, string>;
  balances: Map<string, number>;
  transfers: Transfer[];
  involved: Set<string>;
  fmt: (minor: number, signed?: boolean) => string;
};

type Tab = "activity" | "balances" | "stats" | "people";
const TABS: { id: Tab; label: string }[] = [
  { id: "activity", label: "Activity" },
  { id: "balances", label: "Balances" },
  { id: "stats", label: "Stats" },
  { id: "people", label: "People" },
];

export function GroupApp({ initial }: { initial: GroupData }) {
  const toast = useToast();
  const [group, setGroup] = useState(initial);
  const [me, setMeState] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("activity");
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; expense?: Expense }>({ open: false });
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; draft?: PaymentDraft }>({ open: false });
  const [syncing, setSyncing] = useState(false);
  const meKey = `tabby:me:${group.id}`;

  // Restore identity from localStorage after mount (never during SSR).
  useEffect(() => {
    const saved = storage.get(meKey);
    if (saved && initial.members.some((m) => m.id === saved)) setMeState(saved);
    else if (saved !== "guest") setPickerOpen(true);
    rememberGroup(initial.id, initial.name);
    if (new URLSearchParams(window.location.search).has("new")) {
      window.history.replaceState(null, "", `/g/${initial.id}`);
    }
  }, [meKey, initial]);

  const setMe = useCallback(
    (id: string | null) => {
      setMeState(id);
      storage.set(meKey, id ?? "guest");
      setPickerOpen(false);
    },
    [meKey],
  );

  const inflight = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++inflight.current;
    setSyncing(true);
    try {
      const fresh = await api<GroupData>("GET", `/api/groups/${group.id}`);
      if (ticket === inflight.current) {
        setGroup(fresh);
        rememberGroup(fresh.id, fresh.name);
      }
    } catch (e) {
      toast.show((e as Error).message, "error");
    } finally {
      if (ticket === inflight.current) setSyncing(false);
    }
  }, [group.id, toast]);

  // Pick up changes made by friends when the tab regains focus.
  useEffect(() => {
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [refresh]);

  // Forget a stale identity if that member was removed.
  useEffect(() => {
    if (me && !group.members.some((m) => m.id === me)) setMeState(null);
  }, [group.members, me]);

  const ledger: Ledger = useMemo(() => {
    const ids = group.members.map((m) => m.id);
    const balances = computeBalances(ids, group.expenses, group.payments);
    const involved = new Set<string>();
    for (const e of group.expenses) {
      involved.add(e.paidBy);
      e.splits.forEach((s) => involved.add(s.memberId));
    }
    for (const p of group.payments) {
      involved.add(p.from);
      involved.add(p.to);
    }
    return {
      group,
      me,
      names: new Map(group.members.map((m) => [m.id, m.name])),
      balances,
      transfers: settleUp(balances, ids),
      involved,
      fmt: (minor: number, signed?: boolean) => formatMoney(minor, group.currency, { signed }),
    };
  }, [group, me]);

  const meName = me ? ledger.names.get(me) : null;
  const myBalance = me ? (ledger.balances.get(me) ?? 0) : 0;
  const url = typeof window !== "undefined" ? `${window.location.origin}/g/${group.id}` : `/g/${group.id}`;

  async function share() {
    const r = await shareOrCopy({ title: `${group.name} on Tabby`, text: `Join “${group.name}” on Tabby to split expenses:`, url });
    if (r === "copied") toast.show("Invite link copied", "success");
  }
  async function copyLink() {
    const ok = await copyText(url);
    toast.show(ok ? "Invite link copied" : "Couldn't copy — copy it from the address bar", ok ? "success" : "error");
  }

  const openExpense = (expense?: Expense) => setExpenseModal({ open: true, expense });
  const openPayment = (draft?: PaymentDraft) => setPaymentModal({ open: true, draft });

  return (
    <div className="min-h-dvh pb-28 sm:pb-12">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label="Tabby home" className="shrink-0">
            <Logo className="text-lg" />
          </Link>
          <div className="flex items-center gap-1.5">
            {syncing && <span className="mr-1 size-2 animate-pulse rounded-full bg-brand" aria-label="Syncing" />}
            <Button variant="ghost" size="sm" onClick={copyLink} className="hidden sm:inline-flex">
              Copy invite link
            </Button>
            <Button variant="secondary" size="sm" onClick={share}>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" />
              </svg>
              Invite
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4">
        <section className="animate-rise mt-5 overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{group.name}</h1>
                <p className="mt-1 text-sm text-muted">
                  {group.members.length} people · {group.currency} · {group.expenses.length} expenses
                </p>
              </div>
              <div className="flex -space-x-2 pt-1" aria-hidden>
                {group.members.slice(0, 5).map((m) => (
                  <Avatar key={m.id} name={m.name} size={32} ring />
                ))}
                {group.members.length > 5 && (
                  <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold ring-2 ring-surface">
                    +{group.members.length - 5}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div
            className={cx(
              "flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6",
              me && myBalance > 0 && "bg-pos-soft",
              me && myBalance < 0 && "bg-neg-soft",
            )}
          >
            {me ? (
              <div>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">You · {meName}</p>
                <p className={cx("tabular text-lg font-bold", myBalance > 0 && "text-pos", myBalance < 0 && "text-neg")}>
                  {myBalance > 0 ? `You are owed ${ledger.fmt(myBalance)}` : myBalance < 0 ? `You owe ${ledger.fmt(-myBalance)}` : "You're all settled up"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Tell us who you are to see what you owe.</p>
            )}
            <button onClick={() => setPickerOpen(true)} className="text-sm font-semibold text-brand hover:underline">
              {me ? "Not you?" : "Choose who you are"}
            </button>
          </div>
        </section>

        <div className="mt-4 hidden gap-2 sm:flex">
          <Button onClick={() => openExpense()} disabled={group.members.length < 1}>
            <span aria-hidden className="text-lg leading-none">+</span> Add expense
          </Button>
          <Button variant="secondary" onClick={() => openPayment()}>
            Record a payment
          </Button>
        </div>

        <nav className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 mt-4 bg-bg/90 px-4 py-2 backdrop-blur-md" aria-label="Group sections">
          <div role="tablist" className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cx(
                  "h-10 rounded-xl text-sm font-semibold transition",
                  tab === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {t.label}
                {t.id === "balances" && ledger.transfers.length > 0 && (
                  <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-brand text-[11px] text-on-brand">
                    {ledger.transfers.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-3">
          {tab === "activity" && <ActivityFeed ledger={ledger} onEditExpense={openExpense} onAddExpense={() => openExpense()} onChanged={refresh} />}
          {tab === "balances" && <BalancesView ledger={ledger} onRecord={openPayment} onGoToPeople={() => setTab("people")} />}
          {tab === "stats" && <StatsView ledger={ledger} />}
          {tab === "people" && <MembersView ledger={ledger} onChanged={refresh} onSetGroup={setGroup} />}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md sm:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto] gap-2">
          <Button size="lg" onClick={() => openExpense()}>
            <span aria-hidden className="text-xl leading-none">+</span> Add expense
          </Button>
          <Button size="lg" variant="secondary" onClick={() => openPayment()} aria-label="Record a payment">
            Settle
          </Button>
        </div>
      </div>

      <IdentityPicker
        open={pickerOpen}
        members={group.members}
        current={me}
        onPick={setMe}
        onClose={() => {
          setPickerOpen(false);
          if (!me && storage.get(meKey) === null) storage.set(meKey, "guest");
        }}
      />
      {expenseModal.open && (
        <ExpenseForm
          ledger={ledger}
          expense={expenseModal.expense}
          onClose={() => setExpenseModal({ open: false })}
          onSaved={() => {
            setExpenseModal({ open: false });
            refresh();
          }}
        />
      )}
      {paymentModal.open && (
        <PaymentForm
          ledger={ledger}
          draft={paymentModal.draft}
          onClose={() => setPaymentModal({ open: false })}
          onSaved={() => {
            setPaymentModal({ open: false });
            setTab("activity");
            refresh();
          }}
        />
      )}
    </div>
  );
}
