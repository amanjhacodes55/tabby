import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Expense, GroupData, Member, Payment } from "./types";
import type { SplitMode } from "./split";

export function getDb(): D1Database {
  return getCloudflareContext().env.DB;
}

type GroupRow = { id: string; name: string; currency: string; created_at: number; updated_at: number };
type MemberRow = { id: string; name: string; upi_id: string | null };
type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  paid_by: string;
  date: string;
  category: string;
  split_mode: SplitMode;
  created_by: string | null;
  created_at: number;
  updated_at: number;
};
type SplitRow = { expense_id: string; member_id: string; weight: number; amount: number };
type PaymentRow = {
  id: string;
  from_member: string;
  to_member: string;
  amount: number;
  date: string;
  note: string | null;
  created_by: string | null;
  created_at: number;
};

export async function getGroupRow(db: D1Database, groupId: string): Promise<GroupRow | null> {
  return db.prepare("SELECT * FROM groups WHERE id = ?").bind(groupId).first<GroupRow>();
}

export async function loadGroup(db: D1Database, groupId: string): Promise<GroupData | null> {
  const [g, m, e, s, p] = await db.batch([
    db.prepare("SELECT * FROM groups WHERE id = ?").bind(groupId),
    db.prepare("SELECT id, name, upi_id FROM members WHERE group_id = ? ORDER BY position, created_at").bind(groupId),
    db.prepare("SELECT * FROM expenses WHERE group_id = ? ORDER BY date DESC, created_at DESC").bind(groupId),
    db
      .prepare(
        "SELECT s.expense_id, s.member_id, s.weight, s.amount FROM expense_splits s JOIN expenses e ON e.id = s.expense_id WHERE e.group_id = ?",
      )
      .bind(groupId),
    db.prepare("SELECT * FROM payments WHERE group_id = ? ORDER BY date DESC, created_at DESC").bind(groupId),
  ]);
  const group = (g.results as GroupRow[])[0];
  if (!group) return null;

  const splitsBy = new Map<string, Expense["splits"]>();
  for (const r of s.results as SplitRow[]) {
    const list = splitsBy.get(r.expense_id) ?? [];
    list.push({ memberId: r.member_id, weight: r.weight, amount: r.amount });
    splitsBy.set(r.expense_id, list);
  }
  const members: Member[] = (m.results as MemberRow[]).map((r) => ({ id: r.id, name: r.name, upiId: r.upi_id }));
  const order = new Map(members.map((x, i) => [x.id, i]));
  const expenses: Expense[] = (e.results as ExpenseRow[]).map((r) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    paidBy: r.paid_by,
    date: r.date,
    category: r.category,
    splitMode: r.split_mode,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    splits: (splitsBy.get(r.id) ?? []).sort((a, b) => (order.get(a.memberId) ?? 0) - (order.get(b.memberId) ?? 0)),
  }));
  const payments: Payment[] = (p.results as PaymentRow[]).map((r) => ({
    id: r.id,
    from: r.from_member,
    to: r.to_member,
    amount: r.amount,
    date: r.date,
    note: r.note,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
  return {
    id: group.id,
    name: group.name,
    currency: group.currency,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    members,
    expenses,
    payments,
  };
}

export async function memberIdsOf(db: D1Database, groupId: string): Promise<string[]> {
  const r = await db
    .prepare("SELECT id FROM members WHERE group_id = ? ORDER BY position, created_at")
    .bind(groupId)
    .all<{ id: string }>();
  return r.results.map((x) => x.id);
}

export function touch(db: D1Database, groupId: string) {
  return db.prepare("UPDATE groups SET updated_at = ? WHERE id = ?").bind(Date.now(), groupId);
}
