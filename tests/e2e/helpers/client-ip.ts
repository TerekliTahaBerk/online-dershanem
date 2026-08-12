import { randomBytes } from "node:crypto";

/**
 * Return a valid, unique address from the IPv6 documentation range.
 *
 * Rate-limit tests used to send labels such as `e2e-user-...` as IP headers.
 * Production IP validation correctly rejects those labels, collapsing every
 * parallel worker onto the shared `unknown` bucket and causing false 429s.
 */
export function uniqueTestClientIp(): string {
  const hex = randomBytes(12).toString("hex");
  const groups = hex.match(/.{4}/g);
  if (!groups) throw new Error("Test istemci IP'si üretilemedi.");
  return `2001:db8:${groups.join(":")}`;
}
