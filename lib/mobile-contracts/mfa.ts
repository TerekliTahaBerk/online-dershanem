import { check, v } from "./validate";

/**
 * C09 · Native TOTP kaydı — mevcut `PUT/POST /api/auth/mfa/totp/enroll`.
 * Gizli anahtar ve kurtarma kodları yalnız ekranda tutulur; önbelleğe /
 * kalıcı depoya yazılmaz.
 */
export function parseTotpEnrollmentStart(input: unknown) {
  return check(v.object({ secret: v.nonEmpty(), otpauthUri: v.nonEmpty() }), input);
}

export function parseTotpEnrollmentConfirm(input: unknown) {
  return check(v.object({ verified: v.literal(true), recoveryCodes: v.array(v.nonEmpty()) }), input);
}
