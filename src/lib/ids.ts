const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Crypto-random URL-safe id. 22 chars = 132 bits of entropy for group ids. */
export function randomId(length = 22): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b & 63];
  return out;
}

export const GROUP_ID_RE = /^[A-Za-z0-9_-]{16,40}$/;
