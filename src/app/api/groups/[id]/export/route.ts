import { ApiError, assertGroupId, route } from "@/lib/api";
import { buildCsv } from "@/lib/csv";
import { getDb, loadGroup } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  assertGroupId(id);
  const group = await loadGroup(getDb(), id);
  if (!group) throw new ApiError(404, "Group not found");
  const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "group";
  return new Response(buildCsv(group), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tabby-${slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
