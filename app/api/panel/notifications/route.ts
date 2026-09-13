import { NextResponse } from "next/server";
import { z } from "zod";
import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiActiveUser } from "@/lib/auth/api-guards";

const PAGE_SIZE = 20;
const TYPES = ["LESSON_SUMMARY", "ABSENCE", "ASSIGNMENT", "PAYMENT", "SYSTEM"] as const;
const querySchema = z.object({
  type: z.enum(TYPES).optional(),
  status: z.enum(["all", "unread"]).default("all"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

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
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz bildirim filtreleri." }, { status: 400 });
  const selectedType: NotificationType | null = parsed.data.type ?? null;
  const selectedStatus = parsed.data.status;
  const page = parsed.data.page;

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
