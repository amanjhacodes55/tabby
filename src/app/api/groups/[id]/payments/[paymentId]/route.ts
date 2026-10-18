import { ApiError, assertGroupId, json, route } from "@/lib/api";
import { getDb, touch } from "@/lib/db";

type Ctx = { params: Promise<{ id: string; paymentId: string }> };

export const DELETE = route(async (_req: Request, { params }: Ctx) => {
  const { id, paymentId } = await params;
  assertGroupId(id);
  const db = getDb();
  const r = await db.prepare("DELETE FROM payments WHERE id = ? AND group_id = ?").bind(paymentId, id).run();
  if (!r.meta.changes) throw new ApiError(404, "Payment not found");
  await touch(db, id).run();
  return json({ ok: true });
});
