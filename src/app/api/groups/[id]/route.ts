import { ApiError, assertGroupId, json, readJson, route } from "@/lib/api";
import { getDb, loadGroup } from "@/lib/db";
import { updateGroupSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  assertGroupId(id);
  const group = await loadGroup(getDb(), id);
  if (!group) throw new ApiError(404, "Group not found");
  return json(group);
});

export const PATCH = route(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  assertGroupId(id);
  const input = await readJson(req, updateGroupSchema);
  const r = await getDb().prepare("UPDATE groups SET name = ?, updated_at = ? WHERE id = ?").bind(input.name, Date.now(), id).run();
  if (!r.meta.changes) throw new ApiError(404, "Group not found");
  return json({ ok: true });
});
