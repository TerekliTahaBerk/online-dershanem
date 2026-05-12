import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-access";
import { trigger } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requirePanelSession();
  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { userId: ctx.userId, readAt: null } }),
    prisma.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return NextResponse.json({ unread, items });
}

export async function POST(req: Request) {
  const ctx = await requirePanelSession();
  const body = (await req.json().catch(() => ({}))) as { id?: string; markAll?: boolean };
  if (body.markAll) {
    await prisma.notification.updateMany({
      where: { userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
  const unread = await prisma.notification.count({ where: { userId: ctx.userId, readAt: null } });
  await trigger({ type: "inbox:update", userId: ctx.userId, payload: { unread } });
  return NextResponse.json({ ok: true, unread });
}
