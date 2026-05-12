import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await prisma.inboxMessage.updateMany({
    where: { id, recipientUserId: auth.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ data: { ok: true } });
}
