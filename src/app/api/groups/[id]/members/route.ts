import { ApiError, assertGroupId, json, readJson, route } from "@/lib/api";
import { getDb, getGroupRow, touch } from "@/lib/db";
import { randomId } from "@/lib/ids";
import { addMemberSchema, LIMITS } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  assertGroupId(id);
  const input = await readJson(req, addMemberSchema);
  const db = getDb();
  if (!(await getGroupRow(db, id))) throw new ApiError(404, "Group not found");
  const existing = await db.prepare("SELECT name, position FROM members WHERE group_id = ?").bind(id).all<{ name: string; position: number }>();
  if (existing.results.length >= LIMITS.maxMembers) throw new ApiError(422, `A group can have at most ${LIMITS.maxMembers} people`);
  if (existing.results.some((m) => m.name.toLowerCase() === input.name.toLowerCase())) throw new ApiError(409, "Someone with that name is already in the group");
  const position = existing.results.reduce((a, m) => Math.max(a, m.position), -1) + 1;
  const memberId = randomId(12);
  await db.batch([
    db.prepare("INSERT INTO members (id, group_id, name, upi_id, position, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(memberId, id, input.name, input.upiId ?? null, position, Date.now()),
    touch(db, id),
  ]);
  return json({ id: memberId, name: input.name, upiId: input.upiId ?? null }, 201);
});
