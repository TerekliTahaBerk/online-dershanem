import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mobileJwt } from "@/lib/mobile-jwt";
import { jsonError } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ refreshToken: z.string().min(20) });

/**
 * Refresh-token rotation:
 *  - Verilen token imzası doğru ve süresi geçmemiş olmalı.
 *  - DB'de hash'i bulunmalı, revoked olmamalı.
 *  - Kullanıcıya yeni access + yeni refresh döner; eski kayıt revoke edilir.
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Geçersiz JSON.");
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return jsonError(400, "VALIDATION", "refreshToken zorunlu.");

  const incoming = parsed.data.refreshToken;
  const payload = mobileJwt.verifyRefresh(incoming);
  if (!payload) return jsonError(401, "INVALID_TOKEN", "Refresh token geçersiz.");

  const tokenHash = mobileJwt.hashRefresh(incoming);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true, expiresAt: true },
  });
  if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
    return jsonError(401, "INVALID_TOKEN", "Refresh token geçersiz.");
  }
  if (stored.userId !== payload.sub) {
    return jsonError(401, "INVALID_TOKEN", "Refresh token sahipliği eşleşmiyor.");
  }

  const user = await prisma.user.findUnique({
    where: { id: stored.userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) return jsonError(401, "USER_NOT_FOUND", "Kullanıcı bulunamadı.");

  // Yeni token üret
  const access = mobileJwt.signAccess(user);
  const newRefresh = mobileJwt.signRefresh(user.id);

  const userAgent = req.headers.get("user-agent") ?? null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  // Atomik: eskiyi revoke et + yeniyi yaz.
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: mobileJwt.hashRefresh(newRefresh.token),
        expiresAt: newRefresh.expiresAt,
        userAgent,
        ip,
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      accessToken: access.token,
      refreshToken: newRefresh.token,
      accessExpiresAt: access.expiresAt,
    },
  });
}
