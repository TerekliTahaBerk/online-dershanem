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

// ───────────────────────────────────────────────────────────────────────────
// Phase 2 / Session 16 — Inbox + recipient resolution helpers.
// All helpers are best-effort: if a query fails or some recipients have no
// userId we silently drop them rather than blocking the parent write.
// ───────────────────────────────────────────────────────────────────────────

/** Find every active admin User.id. De-duplicated. */
export async function getAdminUserIds(): Promise<string[]> {
  try {
    const rows = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    return Array.from(new Set(rows.map((r) => r.id)));
  } catch (err) {
    console.warn("[getAdminUserIds] failed", err);
    return [];
  }
}

/** Resolve a Teacher.id → User.id, or null if unlinked. Alias kept for clarity. */
export const getTeacherUserId = resolveTeacherUserId;

/** Resolve a Student.id → User.id, or null if unlinked. */
export async function getStudentUserId(studentId: string): Promise<string | null> {
  try {
    const s = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });
    return s?.userId ?? null;
  } catch {
    return null;
  }
}

/** Resolve a Student.id → list of linked active parent User.ids (deduped). */
export async function getParentUserIdsForStudent(studentId: string): Promise<string[]> {
  try {
    const links = await prisma.parentStudent.findMany({
      where: { studentId },
      select: { parent: { select: { userId: true } } },
    });
    return Array.from(
      new Set(
        links
          .map((l) => l.parent?.userId ?? null)
          .filter((x): x is string => !!x),
      ),
    );
  } catch {
    return [];
  }
}

/** Get teacher User.ids for a classroom (lead + all assigned subject teachers). */
export async function getTeacherUserIdsForClassroom(classroomId: string): Promise<string[]> {
  try {
    const links = await prisma.classroomTeacher.findMany({
      where: { classroomId },
      select: { teacher: { select: { userId: true } } },
    });
    return Array.from(
      new Set(
        links.map((l) => l.teacher?.userId ?? null).filter((x): x is string => !!x),
      ),
    );
  } catch {
    return [];
  }
}

/** Get active student User.ids for a classroom (excludes left). */
export async function getStudentUserIdsForClassroom(classroomId: string): Promise<string[]> {
  try {
    const links = await prisma.classroomStudent.findMany({
      where: { classroomId, leftAt: null },
      select: { student: { select: { userId: true } } },
    });
    return Array.from(
      new Set(
        links.map((l) => l.student?.userId ?? null).filter((x): x is string => !!x),
      ),
    );
  } catch {
    return [];
  }
}

/** Get parent User.ids for every active student in a classroom (deduped). */
export async function getParentUserIdsForClassroom(classroomId: string): Promise<string[]> {
  try {
    const links = await prisma.classroomStudent.findMany({
      where: { classroomId, leftAt: null },
      select: {
        student: {
          select: {
            parents: { select: { parent: { select: { userId: true } } } },
          },
        },
      },
    });
    const ids: string[] = [];
    for (const l of links) {
      for (const ps of l.student?.parents ?? []) {
        if (ps.parent?.userId) ids.push(ps.parent.userId);
      }
    }
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

/**
 * Notify every admin user. Best-effort; admins with no User row are skipped.
 * `payload.priority` defaults to NORMAL; pass HIGH/URGENT for ops-critical events.
 */
export async function notifyAdmins(
  payload: Omit<Parameters<typeof notifyUser>[0], "userId">,
) {
  const ids = await getAdminUserIds();
  if (ids.length === 0) return;
  await notifyUsers(ids, payload);
}

// ─── Inbox read API ────────────────────────────────────────────────────────

export type InboxFilter = {
  /** "all" | "unread" | "archived". Default "all". */
  view?: "all" | "unread" | "archived";
  /** Filter on `category` (one of `InboxCategory`). */
  category?: import("@prisma/client").InboxCategory | null;
  /** Pagination. Default 50, max 200. */
  take?: number;
  skip?: number;
};

/**
 * Fetch inbox messages for a single user with optional filters.
 * Always scoped by `recipientUserId` — never returns another user's row.
 */
export async function getInboxMessagesForUser(userId: string, filter: InboxFilter = {}) {
  const view = filter.view ?? "all";
  const where: Record<string, unknown> = { recipientUserId: userId };
  if (view === "unread") {
    where.readAt = null;
    where.archivedAt = null;
  } else if (view === "archived") {
    where.archivedAt = { not: null };
  } else {
    // "all" excludes archived by default — admins can opt in via view=archived.
    where.archivedAt = null;
  }
  if (filter.category) where.category = filter.category;
  const take = Math.min(Math.max(filter.take ?? 50, 1), 200);
  const skip = Math.max(filter.skip ?? 0, 0);
  return prisma.inboxMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: { createdBy: { select: { name: true, email: true } } },
  });
}

/** Count unread (and not archived) inbox messages for a user. */
export async function getUnreadInboxCount(userId: string): Promise<number> {
  try {
    return await prisma.inboxMessage.count({
      where: { recipientUserId: userId, readAt: null, archivedAt: null },
    });
  } catch {
    return 0;
  }
}

/**
 * Mark a single message as read. Returns true if the row belonged to `userId`
 * and was updated; false otherwise (no leakage, no error to caller).
 */
export async function markInboxMessageReadById(
  userId: string,
  messageId: string,
): Promise<boolean> {
  try {
    const res = await prisma.inboxMessage.updateMany({
      where: { id: messageId, recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count > 0;
  } catch (err) {
    console.warn("[markInboxMessageReadById] failed", err);
    return false;
  }
}

/** Mark every unread message in this user's inbox as read. */
export async function markAllInboxMessagesRead(userId: string): Promise<number> {
  try {
    const res = await prisma.inboxMessage.updateMany({
      where: { recipientUserId: userId, readAt: null, archivedAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  } catch (err) {
    console.warn("[markAllInboxMessagesRead] failed", err);
    return 0;
  }
}
