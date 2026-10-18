"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CURRENCIES } from "@/lib/currency";
import { api, rememberGroup } from "@/lib/client";
import { LIMITS } from "@/lib/limits";
import { Button, Field, cx, inputClass } from "./ui";
import { useToast } from "./toast";

export function CreateGroupForm() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [members, setMembers] = useState<string[]>(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAdded = useRef<number | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (lastAdded.current !== null) {
      inputs.current[lastAdded.current]?.focus();
      lastAdded.current = null;
    }
  }, [members.length]);

  const filled = members.map((m) => m.trim()).filter(Boolean);
  const dupes = new Set(filled.map((m) => m.toLowerCase())).size !== filled.length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Give your group a name");
    if (filled.length < 2) return setError("Add at least 2 people (including you)");
    if (dupes) return setError("Each person needs a different name");
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("POST", "/api/groups", { name, currency, members: filled });
      rememberGroup(id, name.trim());
      router.push(`/g/${id}?new=1`);
    } catch (err) {
      setBusy(false);
      setError((err as Error).message);
      toast.show((err as Error).message, "error");
    }
  }

  function add() {
    if (members.length >= LIMITS.maxMembers) return;
    lastAdded.current = members.length;
    setMembers([...members, ""]);
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Group name" htmlFor="g-name">
        <input
          id="g-name"
          className={inputClass}
          placeholder="Goa trip, Flat 302, Friday dinners…"
          value={name}
          maxLength={LIMITS.groupName}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </Field>
      <Field label="Currency" htmlFor="g-cur">
        <select id="g-cur" className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code} — {c.name}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium">People</legend>
        {members.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              ref={(el) => {
                inputs.current[i] = el;
              }}
              className={inputClass}
              placeholder={i === 0 ? "You" : `Friend ${i}`}
              aria-label={`Person ${i + 1}`}
              value={m}
              maxLength={LIMITS.memberName}
              onChange={(e) => setMembers(members.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && i === members.length - 1 && m.trim()) {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button
              type="button"
              onClick={() => setMembers(members.filter((_, j) => j !== i))}
              disabled={members.length <= 2}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-neg disabled:opacity-30"
              aria-label={`Remove person ${i + 1}`}
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 12h12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          disabled={members.length >= LIMITS.maxMembers}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-medium text-muted transition hover:border-brand hover:text-brand"
        >
          <span aria-hidden>+</span> Add person
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="rounded-xl bg-neg-soft px-3 py-2 text-sm text-neg">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className={cx("w-full")} loading={busy}>
        Create group — it&apos;s free
      </Button>
      <p className="text-center text-xs text-muted">No signup. Anyone with the link can view and add expenses.</p>
    </form>
  );
}
