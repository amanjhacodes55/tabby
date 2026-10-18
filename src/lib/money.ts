import { getCurrency } from "./currency";

/** Largest single amount accepted, in major units (e.g. ₹1 crore). */
export const MAX_AMOUNT_MAJOR = 10_000_000;

/**
 * Parse a user-typed decimal string into integer minor units without ever touching floats.
 * Returns null for anything that is not a plain non-negative decimal with <= `decimals` places.
 */
export function parseDecimal(input: string, decimals: number): number | null {
  const s = input.trim().replace(/,/g, "");
  if (s === "") return null;
  const re = decimals > 0 ? new RegExp(`^(\\d+)(?:\\.(\\d{0,${decimals}}))?$`) : /^(\d+)$/;
  const alt = decimals > 0 ? new RegExp(`^\\.(\\d{1,${decimals}})$`) : null;
  let whole: string;
  let frac: string;
  const m = s.match(re);
  if (m) {
    whole = m[1];
    frac = m[2] ?? "";
  } else {
    const a = alt ? s.match(alt) : null;
    if (!a) return null;
    whole = "0";
    frac = a[1];
  }
  whole = whole.replace(/^0+(?=\d)/, "");
  if (whole.length > 12) return null;
  const value = Number(whole) * 10 ** decimals + Number((frac + "0".repeat(decimals)).slice(0, decimals) || "0");
  return Number.isSafeInteger(value) ? value : null;
}

export function parseMoney(input: string, currency: string): number | null {
  return parseDecimal(input, getCurrency(currency).decimals);
}

/** Integer minor units -> plain decimal string ("1234.50"), no grouping. */
export function toDecimalString(minor: number, decimals: number): string {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  if (decimals === 0) return `${neg ? "-" : ""}${abs}`;
  const div = 10 ** decimals;
  const whole = Math.floor(abs / div);
  const frac = String(abs % div).padStart(decimals, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

export function minorToInput(minor: number, currency: string): string {
  const d = getCurrency(currency).decimals;
  const s = toDecimalString(minor, d);
  return d > 0 ? s.replace(/\.?0+$/, "") : s;
}

/** Human formatting with symbol and locale-aware grouping. */
export function formatMoney(minor: number, currency: string, opts: { signed?: boolean } = {}): string {
  const c = getCurrency(currency);
  const abs = Math.abs(minor);
  const [whole, frac] = toDecimalString(abs, c.decimals).split(".");
  const grouped = new Intl.NumberFormat(c.locale, { maximumFractionDigits: 0 }).format(BigInt(whole));
  const body = frac && frac !== "00" ? `${grouped}.${frac}` : grouped;
  const sign = minor < 0 ? "−" : opts.signed && minor > 0 ? "+" : "";
  const sym = c.symbol.length > 1 && !/[$]/.test(c.symbol) ? `${c.symbol} ` : c.symbol;
  return `${sign}${sym}${body}`;
}
