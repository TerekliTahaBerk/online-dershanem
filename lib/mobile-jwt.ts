/**
 * Mobil JWT — sıfır-bağımlılık HS256 implementasyonu.
 *
 * Neden kendi implementasyonumuz var?
 *  - Web tarafı NextAuth (JWT) kullanıyor; karışmasın diye mobil ayrı bir
 *    secret + signer kullanır.
 *  - jsonwebtoken / jose paketi eklemeden Node `crypto` ile HS256 yeterli.
 *  - Edge-runtime (Vercel) ile uyumlu kalmak için Buffer + crypto kullanırız.
 *
 * Token yapısı:
 *  - access:  { sub, role, email, typ:"access",  iat, exp }
 *  - refresh: { sub,         typ:"refresh", iat, exp, jti }
 *
 * Refresh token plaintext sadece kullanıcıya döner; DB'de `RefreshToken`
 * modelinde `tokenHash` (sha256) saklanır. Verify ederken hem imza hem de
 * DB'deki kayıt kontrol edilir.
 */
import crypto from "node:crypto";
import type { UserRole } from "@prisma/client";

const ACCESS_TTL_SEC = Number(process.env.JWT_ACCESS_TTL_SEC ?? 60 * 15); // 15 dk
const REFRESH_TTL_SEC = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30) * 24 * 60 * 60;

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "JWT_SECRET env değişkeni eksik veya 32 karakterden kısa. `openssl rand -hex 32` ile üretin.",
    );
  }
  return s;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    input.length + ((4 - (input.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64");
}

function sign(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

function verify<T>(token: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const got = b64urlDecode(sigB64);
  if (expected.length !== got.length) return null;
  if (!crypto.timingSafeEqual(expected, got)) return null;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
  return payload as unknown as T;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  typ: "access";
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  typ: "refresh";
  iat: number;
  exp: number;
  jti: string;
}

export const mobileJwt = {
  signAccess(user: { id: string; role: UserRole; email: string }): {
    token: string;
    expiresAt: number; // unix ms
  } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + ACCESS_TTL_SEC;
    const token = sign({
      sub: user.id,
      role: user.role,
      email: user.email,
      typ: "access",
      iat: now,
      exp,
    } satisfies AccessTokenPayload);
    return { token, expiresAt: exp * 1000 };
  },

  signRefresh(userId: string): {
    token: string;
    jti: string;
    expiresAt: Date;
  } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + REFRESH_TTL_SEC;
    const jti = crypto.randomUUID();
    const token = sign({
      sub: userId,
      typ: "refresh",
      iat: now,
      exp,
      jti,
    } satisfies RefreshTokenPayload);
    return { token, jti, expiresAt: new Date(exp * 1000) };
  },

  verifyAccess(token: string): AccessTokenPayload | null {
    const p = verify<AccessTokenPayload>(token);
    return p && p.typ === "access" ? p : null;
  },

  verifyRefresh(token: string): RefreshTokenPayload | null {
    const p = verify<RefreshTokenPayload>(token);
    return p && p.typ === "refresh" ? p : null;
  },

  /** Refresh token'ın DB'de saklanan hash'i — plaintext asla yazılmaz. */
  hashRefresh(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  },
};
