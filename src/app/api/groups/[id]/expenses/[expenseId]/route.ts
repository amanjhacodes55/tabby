import { ApiError, assertGroupId, json, readJson, route } from "@/lib/api";
import { getDb, touch } from "@/lib/db";
import { prepareExpense } from "@/lib/expenses-server";
import { expenseSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string; expenseId: string }> };

async function assertExpense(db: D1Database, groupId: string, expenseId: string) {
  const row = await db.prepare("SELECT id FROM expenses WHERE id = ? AND group_id = ?").bind(expenseId, groupId).first();
  if (!row) throw new ApiError(404, "Expense not found");
}

export const PUT = route(async (req: Request, { params }: Ctx) => {
  const { id, expenseId } = await params;
  assertGroupId(id);
  const input = await readJson(req, expenseSchema);
  const db = getDb();
  await assertExpense(db, id, expenseId);
  const { splits } = await prepareExpense(db, id, input);
  await db.batch([
    db
      .prepare("UPDATE expenses SET description = ?, amount = ?, paid_by = ?, date = ?, category = ?, split_mode = ?, updated_at = ? WHERE id = ? AND group_id = ?")
      .bind(input.description, input.amount, input.paidBy, input.date, input.category, input.splitMode, Date.now(), expenseId, id),
    db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").bind(expenseId),
    ...splits.map((s) =>
      db.prepare("INSERT INTO expense_splits (expense_id, member_id, weight, amount) VALUES (?, ?, ?, ?)").bind(expenseId, s.memberId, s.weight, s.amount),
    ),
    touch(db, id),
  ]);
  return json({ id: expenseId, splits });
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const { id, expenseId } = await params;
  assertGroupId(id);
  const db = getDb();
  await assertExpense(db, id, expenseId);
  await db.batch([
    db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").bind(expenseId),
    db.prepare("DELETE FROM expenses WHERE id = ? AND group_id = ?").bind(expenseId, id),
    touch(db, id),
  ]);
  return json({ ok: true });
});
