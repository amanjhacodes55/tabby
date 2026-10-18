import { ApiError, assertGroupId, json, readJson, route } from "@/lib/api";
import { getDb, touch } from "@/lib/db";
import { updateMemberSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

async function findMember(db: D1Database, groupId: string, memberId: string) {
  const m = await db.prepare("SELECT id FROM members WHERE id = ? AND group_id = ?").bind(memberId, groupId).first();
  if (!m) throw new ApiError(404, "Member not found");
}

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const { id, memberId } = await params;
  assertGroupId(id);
  const input = await readJson(req, updateMemberSchema);
  const db = getDb();
  await findMember(db, id, memberId);
  if (input.name !== undefined) {
    const clash = await db
      .prepare("SELECT 1 FROM members WHERE group_id = ? AND id != ? AND lower(name) = lower(?)")
      .bind(id, memberId, input.name)
      .first();
    if (clash) throw new ApiError(409, "Someone with that name is already in the group");
  }
  const stmts = [];
  if (input.name !== undefined) stmts.push(db.prepare("UPDATE members SET name = ? WHERE id = ?").bind(input.name, memberId));
  if (input.upiId !== undefined) stmts.push(db.prepare("UPDATE members SET upi_id = ? WHERE id = ?").bind(input.upiId || null, memberId));
  stmts.push(touch(db, id));
  await db.batch(stmts);
  return json({ ok: true });
});

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const { id, memberId } = await params;
  assertGroupId(id);
  const db = getDb();
  await findMember(db, id, memberId);
  const used = await db
    .prepare(
      `SELECT
         EXISTS(SELECT 1 FROM expenses WHERE paid_by = ?1) OR
         EXISTS(SELECT 1 FROM expense_splits WHERE member_id = ?1) OR
         EXISTS(SELECT 1 FROM payments WHERE from_member = ?1 OR to_member = ?1) AS used`,
    )
    .bind(memberId)
    .first<{ used: number }>();
  if (used?.used) throw new ApiError(409, "This person is part of expenses or payments, so they can't be removed. Delete or edit those first.");
  const count = await db.prepare("SELECT COUNT(*) AS n FROM members WHERE group_id = ?").bind(id).first<{ n: number }>();
  if ((count?.n ?? 0) <= 2) throw new ApiError(422, "A group needs at least 2 people");
  await db.batch([db.prepare("DELETE FROM members WHERE id = ? AND group_id = ?").bind(memberId, id), touch(db, id)]);
  return json({ ok: true });
});
