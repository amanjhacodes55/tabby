import { z } from "zod";
import { CURRENCY_CODES, getCurrency } from "./currency";
import { CATEGORY_IDS } from "./categories";
import { SPLIT_MODES } from "./split";
import { MAX_AMOUNT_MAJOR } from "./money";
import { isValidUpiId } from "./upi";
import { LIMITS } from "./limits";

export { LIMITS };

// Strip control characters and collapse whitespace so names render predictably.
const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
const text = (max: number) =>
  z
    .string()
    .transform(clean)
    .pipe(z.string().min(1, "Required").max(max, `Max ${max} characters`));

export const memberName = text(LIMITS.memberName);
export const id = z.string().regex(/^[A-Za-z0-9_-]{6,40}$/, "Invalid id");
export const upiId = z
  .string()
  .trim()
  .refine(isValidUpiId, "Enter a valid UPI ID, like name@okhdfcbank");
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((d) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d && d >= "2000-01-01" && d <= "2100-12-31";
  }, "Invalid date");
// Amount ceiling depends on currency decimals, so this is the absolute max across currencies (2dp).
const minor = z.number().int().positive().max(MAX_AMOUNT_MAJOR * 100);

export const createGroupSchema = z
  .object({
    name: text(LIMITS.groupName),
    currency: z.enum(CURRENCY_CODES),
    members: z.array(memberName).min(LIMITS.minMembers, "Add at least 2 people").max(LIMITS.maxMembers),
  })
  .refine((g) => new Set(g.members.map((m) => m.toLowerCase())).size === g.members.length, {
    message: "Member names must be unique",
    path: ["members"],
  });

export const updateGroupSchema = z.object({ name: text(LIMITS.groupName) });

export const addMemberSchema = z.object({ name: memberName, upiId: upiId.nullish() });
export const updateMemberSchema = z
  .object({ name: memberName.optional(), upiId: z.union([upiId, z.literal(""), z.null()]).optional() })
  .refine((v) => v.name !== undefined || v.upiId !== undefined, "Nothing to update");

export const expenseSchema = z.object({
  description: text(LIMITS.description),
  amount: minor,
  paidBy: id,
  date: isoDate,
  category: z.enum(CATEGORY_IDS),
  splitMode: z.enum(SPLIT_MODES),
  splits: z
    .array(z.object({ memberId: id, weight: z.number().int().min(0).max(MAX_AMOUNT_MAJOR * 100) }))
    .min(1, "Pick at least one person")
    .max(LIMITS.maxMembers),
  createdBy: id.nullish(),
});

export const paymentSchema = z
  .object({
    from: id,
    to: id,
    amount: minor,
    date: isoDate,
    note: z
      .string()
      .transform(clean)
      .pipe(z.string().max(LIMITS.note))
      .nullish(),
    createdBy: id.nullish(),
  })
  .refine((p) => p.from !== p.to, { message: "Payer and receiver must be different", path: ["to"] });

export function maxMinorFor(currency: string) {
  return MAX_AMOUNT_MAJOR * 10 ** getCurrency(currency).decimals;
}
