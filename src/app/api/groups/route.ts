import { ApiError, json, readJson, route } from "@/lib/api";
import { getDb } from "@/lib/db";
import { randomId } from "@/lib/ids";
import { createGroupSchema } from "@/lib/schemas";

export const POST = route(async (req: Request) => {
  const input = await readJson(req, createGroupSchema);
  const db = getDb();
  const id = randomId(22);
  const now = Date.now();
  const stmts = [
    db.prepare("INSERT INTO groups (id, name, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(id, input.name, input.currency, now, now),
    ...input.members.map((name, i) =>
      db.prepare("INSERT INTO members (id, group_id, name, upi_id, position, created_at) VALUES (?, ?, ?, NULL, ?, ?)").bind(randomId(12), id, name, i, now),
    ),
  ];
  const res = await db.batch(stmts);
  if (!res.every((r) => r.success)) throw new ApiError(500, "Could not create group");
  return json({ id }, 201);
});
