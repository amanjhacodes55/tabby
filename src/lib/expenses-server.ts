import "server-only";
import type { z } from "zod";
import { ApiError } from "./api";
import { getGroupRow, memberIdsOf } from "./db";
import { expenseSchema, maxMinorFor } from "./schemas";
import { computeSplits } from "./split";

/** Validates an expense against the group's members/currency and computes authoritative splits. */
export async function prepareExpense(db: D1Database, groupId: string, input: z.output<typeof expenseSchema>) {
  const group = await getGroupRow(db, groupId);
  if (!group) throw new ApiError(404, "Group not found");
  if (input.amount > maxMinorFor(group.currency)) throw new ApiError(422, "Amount is too large");
  const members = new Set(await memberIdsOf(db, groupId));
  if (!members.has(input.paidBy)) throw new ApiError(422, "Payer is not in this group");
  if (input.createdBy && !members.has(input.createdBy)) throw new ApiError(422, "Unknown member");
  for (const s of input.splits) if (!members.has(s.memberId)) throw new ApiError(422, "Split includes someone not in this group");
  const outcome = computeSplits(input.amount, input.splitMode, input.splits);
  if (!outcome.ok) throw new ApiError(422, outcome.error);
  return { group, splits: outcome.splits };
}
