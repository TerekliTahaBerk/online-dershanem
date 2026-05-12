/**
 * Mobil API guard'ları.
 *
 * Kullanım:
 *   const auth = await requireMobileUser(req);
 *   if (!("userId" in auth)) return auth; // NextResponse 401
 *   const { userId, role, email } = auth;
 */
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { mobileJwt } from "@/lib/mobile-jwt";

export type MobileAuthContext = {
  userId: string;
  role: UserRole;
  email: string;
};

export function jsonError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

/**
 * Authorization: Bearer <token> header'ından kullanıcı çıkarır.
 * Geçersizse 401 NextResponse döner — caller "in" check ile ayırır.
 */
export async function requireMobileUser(
  req: Request,
): Promise<MobileAuthContext | NextResponse> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return jsonError(401, "UNAUTHENTICATED", "Token gerekli.");
  }
  const token = header.slice(7).trim();
  const payload = mobileJwt.verifyAccess(token);
  if (!payload) {
    return jsonError(401, "INVALID_TOKEN", "Token geçersiz veya süresi dolmuş.");
  }
  return { userId: payload.sub, role: payload.role, email: payload.email };
}

/**
 * Belirli rol(lerin) izni varsa devam eder, yoksa 403 döner.
 */
export function requireMobileRole(
  ctx: MobileAuthContext,
  allowed: UserRole | UserRole[],
): NextResponse | null {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  // ADMIN her şeye erişir.
  if (ctx.role === "ADMIN" || list.includes(ctx.role)) return null;
  return jsonError(403, "FORBIDDEN", "Bu işlem için yetkin yok.");
}
