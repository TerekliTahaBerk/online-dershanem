import { NextResponse } from "next/server";
import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiActiveUser } from "@/lib/auth/api-guards";

const PAGE_SIZE = 20;
const TYPES = ["LESSON_SUMMARY", "ABSENCE", "ASSIGNMENT", "PAYMENT", "SYSTEM"] as const;

/**
 * Bildirim listesi — JSON karşılığı.
 *
 * `app/panel/bildirimler/page.tsx` ile AYNI sorgu (tür/durum filtresi,
 * sayfalama). `Notification` modeli zaten uygulama-içi gelen kutusu (mobil
 * inşa promptu §6.1) — push AYRI, bu route yalnız listeyi döner. Okundu
 * işaretleme mevcut `POST /api/panel/notifications/read`'i kullanır,
 * YENİDEN YAZILMADI.
 */
export async function GET(request: Request) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const selectedType = TYPES.includes(typeParam as (typeof TYPES)[number]) ? (typeParam as NotificationType) : null;
  const selectedStatus = url.searchParams.get("status") === "unread" ? "unread" : "all";
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));

  const where: Prisma.NotificationWhereInput = {
    userId: auth.session.userId,
    ...(selectedType ? { type: selectedType } : {}),
    ...(selectedStatus === "unread" ? { readAt: null } : {}),
  };

  const [notifications, total, unreadTotal] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: auth.session.userId, readAt: null } }),
  ]);

  return NextResponse.json({
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    unreadTotal,
    notifications: notifications.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      href: item.href,
      read: Boolean(item.readAt),
      createdAt: item.createdAt,
    })),
  });
}
