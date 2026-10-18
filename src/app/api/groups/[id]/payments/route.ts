import { ApiError, assertGroupId, json, readJson, route } from "@/lib/api";
import { getDb, getGroupRow, memberIdsOf, touch } from "@/lib/db";
import { randomId } from "@/lib/ids";
import { LIMITS, maxMinorFor, paymentSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  assertGroupId(id);
  const input = await readJson(req, paymentSchema);
  const db = getDb();
  const group = await getGroupRow(db, id);
  if (!group) throw new ApiError(404, "Group not found");
  if (input.amount > maxMinorFor(group.currency)) throw new ApiError(422, "Amount is too large");
  const members = new Set(await memberIdsOf(db, id));
  if (!members.has(input.from) || !members.has(input.to)) throw new ApiError(422, "Both people must be in this group");
  if (input.createdBy && !members.has(input.createdBy)) throw new ApiError(422, "Unknown member");
  const count = await db.prepare("SELECT COUNT(*) AS n FROM payments WHERE group_id = ?").bind(id).first<{ n: number }>();
  if ((count?.n ?? 0) >= LIMITS.maxPayments) throw new ApiError(422, `This group reached the limit of ${LIMITS.maxPayments} payments`);
  const paymentId = randomId(12);
  await db.batch([
    db
      .prepare("INSERT INTO payments (id, group_id, from_member, to_member, amount, date, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(paymentId, id, input.from, input.to, input.amount, input.date, input.note || null, input.createdBy ?? null, Date.now()),
    touch(db, id),
  ]);
  return json({ id: paymentId }, 201);
});
