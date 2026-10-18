"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { LIMITS } from "@/lib/limits";
import type { GroupData, Member } from "@/lib/types";
import { isValidUpiId } from "@/lib/upi";
import { useToast } from "../toast";
import { Avatar, Button, buttonClass, cx, inputClass } from "../ui";
import type { Ledger } from "./GroupApp";

export function MembersView({ ledger, onChanged, onSetGroup }: { ledger: Ledger; onChanged: () => Promise<void>; onSetGroup: (g: GroupData) => void }) {
  const { group, me, involved } = ledger;
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [renaming, setRenaming] = useState(false);
  const full = group.members.length >= LIMITS.maxMembers;

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (group.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return toast.show("Someone with that name is already here", "error");
    setAdding(true);
    try {
      const m = await api<Member>("POST", `/api/groups/${group.id}/members`, { name });
      onSetGroup({ ...group, members: [...group.members, m] }); // optimistic
      setNewName("");
      toast.show(`${name} added`, "success");
      await onChanged();
    } catch (err) {
      toast.show((err as Error).message, "error");
    } finally {
      setAdding(false);
    }
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim() || groupName.trim() === group.name) return;
    setRenaming(true);
    try {
      await api("PATCH", `/api/groups/${group.id}`, { name: groupName });
      toast.show("Group renamed", "success");
      await onChanged();
    } catch (err) {
      toast.show((err as Error).message, "error");
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="people-h">
        <h2 id="people-h" className="mb-2 px-1 text-sm font-semibold text-muted">
          People · {group.members.length}/{LIMITS.maxMembers}
        </h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {group.members.map((m) =>
            editing === m.id ? (
              <li key={m.id} className="p-4">
                <MemberEditor
                  member={m}
                  groupId={group.id}
                  canDelete={!involved.has(m.id) && group.members.length > 2}
                  deleteHint={involved.has(m.id) ? "Has expenses or payments, so can't be removed" : group.members.length <= 2 ? "A group needs at least 2 people" : null}
                  onDone={async (msg) => {
                    setEditing(null);
                    if (msg) toast.show(msg, "success");
                    await onChanged();
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={m.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {m.name}
                    {m.id === me && <span className="ml-1.5 text-xs text-muted">(you)</span>}
                  </p>
                  <p className={cx("truncate text-xs", m.upiId ? "text-muted" : "text-muted/70")}>{m.upiId ? `UPI · ${m.upiId}` : "No UPI ID yet"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(m.id)} aria-label={`Edit ${m.name}`}>
                  {m.upiId ? "Edit" : "Add UPI"}
                </Button>
              </li>
            ),
          )}
        </ul>
        <form onSubmit={addMember} className="mt-3 flex gap-2">
          <input
            className={inputClass}
            placeholder={full ? "Group is full" : "Add someone by name"}
            aria-label="New person's name"
            value={newName}
            maxLength={LIMITS.memberName}
            disabled={full}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" loading={adding} disabled={full || !newName.trim()}>
            Add
          </Button>
        </form>
      </section>

      <section aria-labelledby="settings-h" className="space-y-3">
        <h2 id="settings-h" className="px-1 text-sm font-semibold text-muted">
          Group
        </h2>
        <form onSubmit={rename} className="flex gap-2">
          <input className={inputClass} aria-label="Group name" value={groupName} maxLength={LIMITS.groupName} onChange={(e) => setGroupName(e.target.value)} />
          <Button type="submit" variant="secondary" loading={renaming} disabled={!groupName.trim() || groupName.trim() === group.name}>
            Rename
          </Button>
        </form>
        <a href={`/api/groups/${group.id}/export`} download className={cx(buttonClass("secondary"), "w-full")}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Export as CSV
        </a>
        <p className="px-1 text-xs text-muted">Anyone with this group&apos;s link can view and edit it. Only share it with people in the group.</p>
      </section>
    </div>
  );
}

function MemberEditor({
  member,
  groupId,
  canDelete,
  deleteHint,
  onDone,
  onCancel,
}: {
  member: Member;
  groupId: string;
  canDelete: boolean;
  deleteHint: string | null;
  onDone: (msg?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(member.name);
  const [upi, setUpi] = useState(member.upiId ?? "");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirm, setConfirm] = useState(false);
  const upiError = upi.trim() && !isValidUpiId(upi.trim()) ? "That doesn't look like a UPI ID (e.g. name@okhdfcbank)" : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (upiError || !name.trim()) return;
    setBusy("save");
    try {
      await api("PATCH", `/api/groups/${groupId}/members/${member.id}`, { name, upiId: upi.trim() || null });
      await onDone("Saved");
    } catch (err) {
      toast.show((err as Error).message, "error");
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm) return setConfirm(true);
    setBusy("delete");
    try {
      await api("DELETE", `/api/groups/${groupId}/members/${member.id}`);
      await onDone(`${member.name} removed`);
    } catch (err) {
      toast.show((err as Error).message, "error");
      setBusy(null);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label htmlFor={`n-${member.id}`} className="mb-1 block text-xs font-medium text-muted">
          Name
        </label>
        <input id={`n-${member.id}`} className={inputClass} value={name} maxLength={LIMITS.memberName} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div>
        <label htmlFor={`u-${member.id}`} className="mb-1 block text-xs font-medium text-muted">
          UPI ID (optional)
        </label>
        <input
          id={`u-${member.id}`}
          className={inputClass}
          placeholder="name@okhdfcbank"
          value={upi}
          maxLength={100}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setUpi(e.target.value)}
          aria-invalid={!!upiError}
        />
        {upiError ? <p className="mt-1 text-xs text-neg">{upiError}</p> : <p className="mt-1 text-xs text-muted">Friends who owe {member.name || "them"} get a one-tap UPI button.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" loading={busy === "save"} disabled={!!upiError || !name.trim()}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <span className="flex-1" />
        <Button type="button" size="sm" variant="danger" onClick={remove} disabled={!canDelete} loading={busy === "delete"} title={deleteHint ?? undefined}>
          {confirm ? "Confirm remove" : "Remove"}
        </Button>
      </div>
      {deleteHint && <p className="text-right text-[11px] text-muted">{deleteHint}</p>}
    </form>
  );
}
