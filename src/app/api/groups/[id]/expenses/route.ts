import { ApiError, assertGroupId, json, readJson, route } from "@/lib/api";
import { getDb, touch } from "@/lib/db";
import { prepareExpense } from "@/lib/expenses-server";
import { randomId } from "@/lib/ids";
import { expenseSchema, LIMITS } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  assertGroupId(id);
  const input = await readJson(req, expenseSchema);
  const db = getDb();
  const { splits } = await prepareExpense(db, id, input);
  const count = await db.prepare("SELECT COUNT(*) AS n FROM expenses WHERE group_id = ?").bind(id).first<{ n: number }>();
  if ((count?.n ?? 0) >= LIMITS.maxExpenses) throw new ApiError(422, `This group reached the limit of ${LIMITS.maxExpenses} expenses`);
  const expenseId = randomId(12);
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        "INSERT INTO expenses (id, group_id, description, amount, paid_by, date, category, split_mode, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(expenseId, id, input.description, input.amount, input.paidBy, input.date, input.category, input.splitMode, input.createdBy ?? null, now, now),
    ...splits.map((s) =>
      db.prepare("INSERT INTO expense_splits (expense_id, member_id, weight, amount) VALUES (?, ?, ?, ?)").bind(expenseId, s.memberId, s.weight, s.amount),
    ),
    touch(db, id),
  ]);
  return json({ id: expenseId, splits }, 201);
});
