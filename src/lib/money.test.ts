import { describe, expect, it } from "vitest";
import { formatMoney, parseDecimal, toDecimalString } from "./money";
import { buildUpiLink, isValidUpiId } from "./upi";
import { buildCsv } from "./csv";

describe("parseDecimal", () => {
  it("parses without float error", () => {
    expect(parseDecimal("0.1", 2)).toBe(10);
    expect(parseDecimal("19.99", 2)).toBe(1999);
    expect(parseDecimal("1,234.5", 2)).toBe(123450);
    expect(parseDecimal(".5", 2)).toBe(50);
    expect(parseDecimal("12.", 2)).toBe(1200);
    expect(parseDecimal("007", 0)).toBe(7);
  });
  it("rejects junk and too many decimals", () => {
    for (const s of ["", "abc", "1.234", "-5", "1e5", "1.2.3", " . "]) expect(parseDecimal(s, 2)).toBeNull();
    expect(parseDecimal("1.5", 0)).toBeNull();
  });
});

describe("format", () => {
  it("formats decimals", () => {
    expect(toDecimalString(123405, 2)).toBe("1234.05");
    expect(toDecimalString(-5, 2)).toBe("-0.05");
    expect(toDecimalString(500, 0)).toBe("500");
  });
  it("formats INR with Indian grouping", () => {
    expect(formatMoney(12345678, "INR")).toBe("₹1,23,456.78");
    expect(formatMoney(-50000, "INR")).toBe("−₹500");
  });
});

describe("upi", () => {
  it("validates ids", () => {
    expect(isValidUpiId("aman.k@okhdfcbank")).toBe(true);
    expect(isValidUpiId("9876543210@ybl")).toBe(true);
    expect(isValidUpiId("nope")).toBe(false);
    expect(isValidUpiId("a@b")).toBe(false);
    expect(isValidUpiId("x y@ybl")).toBe(false);
  });
  it("builds an encoded upi:// link", () => {
    expect(buildUpiLink({ upiId: "riya@okicici", name: "Riya & Co", amountMinor: 123450, note: "Tabby: Goa trip" })).toBe(
      "upi://pay?pa=riya@okicici&pn=Riya%20%26%20Co&am=1234.50&cu=INR&tn=Tabby%3A%20Goa%20trip",
    );
  });
});

describe("csv", () => {
  it("escapes and neutralises formulas, and columns sum to balances", () => {
    const csv = buildCsv({
      id: "g",
      name: "Trip",
      currency: "INR",
      createdAt: 0,
      updatedAt: 0,
      members: [
        { id: "a", name: "Asha", upiId: null },
        { id: "b", name: "=cmd", upiId: null },
      ],
      expenses: [
        {
          id: "e",
          description: 'Dinner, "fancy"',
          amount: 1000,
          paidBy: "a",
          date: "2026-01-02",
          category: "food",
          splitMode: "equal",
          createdBy: null,
          createdAt: 1,
          updatedAt: 1,
          splits: [
            { memberId: "a", weight: 1, amount: 500 },
            { memberId: "b", weight: 1, amount: 500 },
          ],
        },
      ],
      payments: [],
    });
    expect(csv).toContain('"Dinner, ""fancy"""');
    expect(csv).toContain("'=cmd");
    expect(csv).toContain("Balance,,,,,,,5.00,-5.00");
    expect(csv).toContain(",'=cmd,Asha,5.00");
  });
});
