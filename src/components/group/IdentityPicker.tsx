"use client";

import type { Member } from "@/lib/types";
import { Avatar, Modal, cx } from "../ui";

export function IdentityPicker({
  open,
  members,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  members: Member[];
  current: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Who are you?">
      <p className="mb-4 text-sm text-muted">Pick your name so Tabby can show what you owe and are owed. This is remembered on this device only.</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {members.map((m, i) => (
          <li key={m.id}>
            <button
              data-autofocus={i === 0 ? true : undefined}
              onClick={() => onPick(m.id)}
              className={cx(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left font-medium transition hover:border-brand",
                current === m.id ? "border-brand bg-brand-soft" : "border-line bg-surface",
              )}
            >
              <Avatar name={m.name} size={36} />
              <span className="truncate">{m.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => onPick(null)} className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink">
        I&apos;m just looking
      </button>
    </Modal>
  );
}
