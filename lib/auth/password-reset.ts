import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";

export const PASSWORD_RESET_TTL_MS = 60 * 60_000;
const TOKEN_ID_BYTES = 18;
const TOKEN_MARKER = /\{\{PASSWORD_RESET_URL:([A-Za-z0-9_-]{24})\}\}/g;

function resetSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for password reset tokens");
  return secret;
}

function proofForId(id: string): string {
  return createHmac("sha256", resetSecret()).update(`password-reset:${id}`).digest("base64url");
}

export async function createPasswordResetToken(): Promise<{ id: string; token: string; tokenHash: string }> {
  const id = randomBytes(TOKEN_ID_BYTES).toString("base64url");
  const token = `${id}.${proofForId(id)}`;
  return { id, token, tokenHash: await hashPassword(token) };
}

export function passwordResetTokenId(token: string): string | null {
  const [id, proof, extra] = token.split(".");
  if (extra !== undefined || !id || !proof || !/^[A-Za-z0-9_-]{24}$/.test(id)) return null;
  const expected = proofForId(id);
  const actualBuffer = Buffer.from(proof);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return id;
}

export function passwordResetUrlMarker(id: string): string {
  return `{{PASSWORD_RESET_URL:${id}}}`;
}

/** Materializes a reset URL only in memory, immediately before Resend delivery. */
export function materializePasswordResetEmailHtml(html: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.onlinedershanem.com").replace(/\/$/, "");
  return html.replace(TOKEN_MARKER, (_marker, id: string) => {
    const token = `${id}.${proofForId(id)}`;
    // The fragment never reaches HTTP access logs or Referer headers. The
    // client reads it and sends the credential only in the reset POST body.
    return `${baseUrl}/parola-sifirla#token=${encodeURIComponent(token)}`;
  });
}
