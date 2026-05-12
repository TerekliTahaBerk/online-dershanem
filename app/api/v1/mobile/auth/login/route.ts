import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { mobileJwt } from "@/lib/mobile-jwt";
import { jsonError, jsonOk } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Geçersiz JSON.");
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "VALIDATION", "E-posta ve şifre zorunlu.");
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, passwordHash: true },
  });
  if (!user || !user.passwordHash) {
    return jsonError(401, "INVALID_CREDENTIALS", "E-posta veya şifre hatalı.");
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return jsonError(401, "INVALID_CREDENTIALS", "E-posta veya şifre hatalı.");
  }

  const access = mobileJwt.signAccess({
    id: user.id,
    role: user.role,
    email: user.email,
  });
  const refresh = mobileJwt.signRefresh(user.id);

  // RefreshToken kaydı (hash'li, plaintext yazılmaz).
  const userAgent = req.headers.get("user-agent") ?? null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: mobileJwt.hashRefresh(refresh.token),
      expiresAt: refresh.expiresAt,
      userAgent,
      ip,
    },
  });

  return NextResponse.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: null,
      },
      tokens: {
        accessToken: access.token,
        refreshToken: refresh.token,
        accessExpiresAt: access.expiresAt,
      },
    },
  });
}

// noop helper to satisfy bundler tree-shake of jsonOk import (kept for symmetry)
void jsonOk;
