import { toDecimalString } from "./money";

/** VPA format: handle@psp, e.g. name.surname@okhdfcbank, 98xxxxxx10@ybl */
export const UPI_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

export function isValidUpiId(v: string): boolean {
  return v.length <= 100 && UPI_ID_RE.test(v);
}

// "@" is legal inside a URI query component (RFC 3986 pchar), and several UPI apps fail to
// resolve a payee address written as %40, so keep it literal; everything else is percent-encoded.
const enc = (v: string) => encodeURIComponent(v).replace(/%40/g, "@");

export function buildUpiLink(p: { upiId: string; name: string; amountMinor: number; note: string }): string {
  const params: [string, string][] = [
    ["pa", p.upiId],
    ["pn", p.name],
    ["am", toDecimalString(p.amountMinor, 2)],
    ["cu", "INR"],
    ["tn", p.note.slice(0, 80)],
  ];
  return `upi://pay?${params.map(([k, v]) => `${k}=${enc(v)}`).join("&")}`;
}
