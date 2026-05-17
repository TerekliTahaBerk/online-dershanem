import { prisma } from "@/lib/prisma";
import type { InboxCategory, InboxPriority, NotificationCategoryKey, NotificationPriority, NotificationType } from "@prisma/client";
import { sendPush } from "@/lib/push";

function mapTypeToCategory(t: NotificationType | undefined): NotificationCategoryKey {
  switch (t) {
    case "LESSON": return "LESSON";
    case "CONTENT": return "ASSIGNMENT";
    case "PERFORMANCE": return "ASSIGNMENT";
    case "PAYMENT": return "PAYMENT";
    case "ANNOUNCEMENT": return "ANNOUNCEMENT";
    default: return "SYSTEM";
  }
}

/**
 * Tek bir kullanıcıya bildirim + inbox kaydı yaz.
 * Hatalar yutulur (notification başarısızsa parent işlem rollback olmasın).
 */
export async function notifyUser(params: {
  userId: string;
  title: string;
  body: string;
  href?: string | null;
  type?: NotificationType;
  priority?: NotificationPriority;
  category?: InboxCategory;
  inboxPriority?: InboxPriority;
  createdById?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}) {
  const {
    userId,
    title,
    body,
    href = null,
    type = "SYSTEM",
    priority = "NORMAL",
    category = "SYSTEM",
    inboxPriority = "NORMAL",
    createdById = null,
    relatedEntityType = null,
    relatedEntityId = null,
  } = params;

  try {
    await prisma.$transaction([
      prisma.notification.create({
        data: { userId, type, priority, title, body, href },
      }),
      prisma.inboxMessage.create({
        data: {
          recipientUserId: userId,
          category,
          priority: inboxPriority,
          title,
          body,
          href,
          createdById,
          relatedEntityType,
          relatedEntityId,
        },
      }),
    ]);
    // Mobile push — DB başarılıysa fire-and-forget (parent akışı bekletme)
    void sendPush({
      userIds: [userId],
      title,
      body,
      data: { href, type, relatedEntityType, relatedEntityId },
      category: mapTypeToCategory(type),
      priority: priority === "URGENT" || priority === "HIGH" ? "high" : "default",
    }).catch((e) => console.warn("[notifyUser] push failed", e));
  } catch (err) {
    // sessizce logla
    console.warn("[notifyUser] failed", err);
  }
}

/** Birden fazla user'a aynı bildirimi gönder (sıralı, hata izole). */
export async function notifyUsers(
  userIds: string[],
  payload: Omit<Parameters<typeof notifyUser>[0], "userId">,
) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  for (const uid of unique) {
    await notifyUser({ userId: uid, ...payload });
  }
}

/**
 * Bir öğrenci listesi → bağlı User ID'leri (öğrencinin kendisi + tüm velileri).
 * Veli userId'leri ParentStudent üzerinden çekilir.
 */
export async function resolveStudentAudience(studentIds: string[], opts?: { includeParents?: boolean }) {
  if (studentIds.length === 0) return { studentUserIds: [], parentUserIds: [] };
  const includeParents = opts?.includeParents !== false;
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      userId: true,
      parents: { include: { parent: { select: { userId: true } } } },
    },
  });
  const studentUserIds: string[] = [];
  const parentUserIds: string[] = [];
  for (const s of students) {
    if (s.userId) studentUserIds.push(s.userId);
    if (includeParents) {
      for (const ps of s.parents) {
        if (ps.parent?.userId) parentUserIds.push(ps.parent.userId);
      }
    }
  }
  return { studentUserIds, parentUserIds };
}

/** Bir öğretmen için userId'i çek. */
export async function resolveTeacherUserId(teacherId: string): Promise<string | null> {
  const t = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true },
  });
  return t?.userId ?? null;
}

/**
 * Belirli bir ilgili kaydın (örn. Lesson) aktif bildirimlerini "geçersiz" işaretle.
 *  - Notification: readAt=now() (UI badge'inde sayılmaz).
 *  - InboxMessage: archivedAt=now() (inbox listesinde "Arşiv" altına düşer).
 *
 * Ders iptal/silme/değiştirme akışında çağrılır; ardından **yeni** bildirim atılır.
 *
 * NOT: İleride `Notification.expiresAt` ve `InboxMessage.expiresAt` kolonları
 * eklenebilir (TODO). Şimdilik mevcut readAt/archivedAt alanlarını kullanıyoruz.
 */
export async function expireRelatedNotifications(opts: {
  relatedEntityType: string;
  relatedEntityIds: string[];
}) {
  if (opts.relatedEntityIds.length === 0) return;
  const now = new Date();
  try {
    await prisma.$transaction([
      // Notification tablosunda relatedEntity tipi tutulmuyor → href ile çıkarım
      // yapamayacağımız için bunu sessiz geç. (İleride NotificationRelation eklenebilir.)
      prisma.inboxMessage.updateMany({
        where: {
          relatedEntityType: opts.relatedEntityType,
          relatedEntityId: { in: opts.relatedEntityIds },
          archivedAt: null,
        },
        data: { archivedAt: now, readAt: now },
      }),
    ]);
  } catch (err) {
    console.warn("[expireRelatedNotifications] failed", err);
  }
}

