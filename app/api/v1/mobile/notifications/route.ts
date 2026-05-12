import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ITEM_LIMIT = 30;

/**
 * Mobil bildirim listesi.
 * Source: yeni `InboxMessage` omurgası (kategori + priority + href).
 * Legacy `Notification` modeli web'de kullanılmaya devam eder.
 */
export async function GET(req: Request) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const [items, unread] = await Promise.all([
    prisma.inboxMessage.findMany({
      where: { recipientUserId: auth.userId, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: ITEM_LIMIT,
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        priority: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.inboxMessage.count({
      where: { recipientUserId: auth.userId, readAt: null, archivedAt: null },
    }),
  ]);

  return NextResponse.json({
    data: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      category: n.category,
      priority: n.priority,
      href: n.href,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    meta: { unread },
  });
}
