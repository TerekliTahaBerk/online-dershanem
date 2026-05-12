import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mobileJwt } from "@/lib/mobile-jwt";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ refreshToken: z.string().optional() });

/**
 * Logout:
 *  - Body içinde refreshToken varsa o satırı revoke eder.
 *  - Body boşsa kullanıcının TÜM aktif refresh'lerini revoke eder.
 */
export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  let body: { refreshToken?: string } = {};
  try {
    const raw = await req.json();
    const parsed = Body.safeParse(raw);
    if (parsed.success) body = parsed.data;
  } catch {
    /* no body — full logout */
  }

  if (body.refreshToken) {
    const hash = mobileJwt.hashRefresh(body.refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hash, userId: auth.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } else {
    await prisma.refreshToken.updateMany({
      where: { userId: auth.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Cihaz da revoke (best-effort).
  await prisma.mobileDevice
    .updateMany({
      where: { userId: auth.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);

  return NextResponse.json({ data: { ok: true } });
}

void jsonError;
