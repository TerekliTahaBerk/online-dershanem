import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return jsonError(404, "NOT_FOUND", "Kullanıcı bulunamadı.");

  return NextResponse.json({
    data: { ...user, avatarUrl: null },
  });
}
