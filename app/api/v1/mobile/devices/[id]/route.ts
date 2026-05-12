import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await prisma.mobileDevice.updateMany({
    where: { id, userId: auth.userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ data: { ok: true } });
}
