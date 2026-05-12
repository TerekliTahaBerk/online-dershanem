import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const result = await prisma.inboxMessage.updateMany({
    where: { recipientUserId: auth.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ data: { ok: true, updated: result.count } });
}
