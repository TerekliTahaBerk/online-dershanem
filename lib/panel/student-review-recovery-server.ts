import "server-only";

import type { UserRole } from "@prisma/client";

import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { prisma } from "@/lib/prisma";
import { dailyReviewLimit } from "@/lib/review-scheduler";

/**
 * Öğrenci Tekrar / Telafi / Haftalık özet okuma modelleri — web sayfaları
 * (`app/panel/ogrenci/{tekrar,telafi,haftalik}`) ve mobil JSON uçları AYNI
 * fonksiyonları kullanır. Bayrak ve ürün kapısı ÇAĞIRANDA doğrulanır.
 */

export type StudentReviewQueueView = {
  profileId: string;
  items: Array<{ id: string; title: string; sourceReference: string; solutionNote: string | null; stage: number; dueAt: Date; sourceType: "MOCK_EXAM_SECTION" | "LESSON_OUTCOME" | "TEACHER_REFERENCE" }>;
  activeCount: number;
  masteredCount: number;
  dailyLimit: number;
};

/** Günü gelmiş tekrarlar (en fazla `dailyReviewLimit`); `null` → profil yok. */
export async function loadStudentReviewQueue(input: { studentUserId: string; now?: Date }): Promise<StudentReviewQueueView | null> {
  const now = input.now ?? new Date();
  const profile = await prisma.studentProfile.findUnique({ where: { userId: input.studentUserId }, select: { id: true } });
  if (!profile) return null;
  const [items, activeCount, masteredCount] = await Promise.all([
    prisma.reviewItem.findMany({
      where: { studentId: profile.id, status: "ACTIVE", dueAt: { lte: now } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      take: dailyReviewLimit,
      select: { id: true, title: true, sourceReference: true, solutionNote: true, stage: true, dueAt: true, sourceType: true },
    }),
    prisma.reviewItem.count({ where: { studentId: profile.id, status: "ACTIVE" } }),
    prisma.reviewItem.count({ where: { studentId: profile.id, status: "MASTERED" } }),
  ]);
  return { profileId: profile.id, items, activeCount, masteredCount, dailyLimit: dailyReviewLimit };
}

export type StudentRecoveryPackageView = {
  id: string;
  lessonId: string;
  status: "PUBLISHED" | "COMPLETED";
  lessonTitle: string;
  lessonDate: Date;
  summaryTopic: string;
  sharedNote: string | null;
  summaryNextStep: string;
  checkpointPrompt: string;
  checkpointResponse: "NOT_YET" | "NEED_HELP" | "READY" | null;
  dueAt: Date;
  outcomeTitles: string[];
  items: Array<{
    id: string;
    kind: "MATERIAL" | "ASSIGNMENT";
    title: string;
    completed: boolean;
    material: { id: string; url: string; hasFile: boolean } | null;
    assignmentActive: boolean;
  }>;
};

/**
 * Yayınlanmış / tamamlanmış telafi paketleri. Web sayfasının davranışı
 * korunur: paket İLK kez görüntülendiğinde `firstViewedAt` yazılır ve
 * `recovery_package_viewed` olayı kaydedilir (öğretmen görünürlüğü).
 */
export async function loadStudentRecoveryPackages(input: { studentUserId: string; role: UserRole }): Promise<StudentRecoveryPackageView[]> {
  const packages = await prisma.recoveryPackage.findMany({
    where: { student: { userId: input.studentUserId }, status: { in: ["PUBLISHED", "COMPLETED"] } },
    orderBy: { dueAt: "asc" },
    include: {
      lesson: {
        select: {
          title: true,
          endsAt: true,
          notes: { where: { studentId: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { note: true } },
          outcomeLinks: { take: 3, orderBy: { createdAt: "asc" }, select: { outcome: { select: { title: true } } } },
        },
      },
      items: {
        orderBy: { position: "asc" },
        include: {
          material: { select: { id: true, url: true, blobPathname: true, isActive: true } },
          assignment: { select: { id: true, isActive: true } },
        },
      },
    },
  });

  const firstViews = packages.filter((item) => item.status === "PUBLISHED" && !item.firstViewedAt);
  if (firstViews.length) {
    await prisma.recoveryPackage.updateMany({ where: { id: { in: firstViews.map((item) => item.id) }, firstViewedAt: null }, data: { firstViewedAt: new Date() } });
    for (const item of firstViews) {
      await recordPanelProductEvent(
        {
          name: "recovery_package_viewed",
          properties: { ageMs: Math.min(365 * 86400000, Math.max(0, Date.now() - item.lesson.endsAt.getTime())), itemCount: item.items.length },
        },
        input.role,
      );
    }
  }

  return packages.map((item) => ({
    id: item.id,
    lessonId: item.lessonId,
    status: item.status as "PUBLISHED" | "COMPLETED",
    lessonTitle: item.lesson.title,
    lessonDate: item.lesson.endsAt,
    summaryTopic: item.summaryTopic,
    sharedNote: item.lesson.notes[0]?.note || null,
    summaryNextStep: item.summaryNextStep,
    checkpointPrompt: item.checkpointPrompt,
    checkpointResponse: item.checkpointResponse,
    dueAt: item.dueAt,
    outcomeTitles: item.lesson.outcomeLinks.map((row) => row.outcome.title),
    items: item.items.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      completed: Boolean(row.completedAt),
      material: row.material?.isActive ? { id: row.material.id, url: row.material.url, hasFile: Boolean(row.material.blobPathname) } : null,
      assignmentActive: Boolean(row.assignment?.isActive),
    })),
  }));
}

/** Web telafi bileşeninin beklediği `href` (davranış değişmedi). */
export function recoveryItemWebHref(item: StudentRecoveryPackageView["items"][number]): string | null {
  if (item.kind === "MATERIAL") return item.material ? (item.material.hasFile ? `/api/panel/materials/${item.material.id}/file` : item.material.url) : null;
  return item.assignmentActive ? "/panel/ogrenci/odevler" : null;
}

export type StudentWeeklyDigestView = {
  id: string;
  goodThingOne: string;
  goodThingTwo: string;
  supportArea: string;
  homeQuestion: string;
  dataThrough: Date;
  trendBand: string;
  publishedAt: Date | null;
  feedback: { helpful: boolean | null; anxietyPulse: number | null } | null;
};

/** Son YAYINLANMIŞ haftalık özet (veliyle aynı özet; özel notlar yok). */
export async function loadStudentWeeklyDigest(input: { studentUserId: string }): Promise<StudentWeeklyDigestView | null> {
  const digest = await prisma.weeklyDigest.findFirst({
    where: { status: "PUBLISHED", student: { userId: input.studentUserId } },
    orderBy: { weekStart: "desc" },
    include: { feedback: { where: { userId: input.studentUserId }, take: 1 } },
  });
  if (!digest) return null;
  const feedback = digest.feedback[0];
  return {
    id: digest.id,
    goodThingOne: digest.goodThingOne,
    goodThingTwo: digest.goodThingTwo,
    supportArea: digest.supportArea,
    homeQuestion: digest.homeQuestion,
    dataThrough: digest.dataThrough,
    trendBand: digest.trendBand,
    publishedAt: digest.publishedAt,
    feedback: feedback ? { helpful: feedback.helpful, anxietyPulse: feedback.anxietyPulse } : null,
  };
}

/** Web sayfasıyla aynı görüntüleme olayı. */
export async function recordWeeklyDigestViewed(digest: StudentWeeklyDigestView, role: UserRole): Promise<void> {
  const ageDays = digest.publishedAt ? (Date.now() - digest.publishedAt.getTime()) / 86400000 : 0;
  await recordPanelProductEvent(
    {
      name: "weekly_digest_viewed",
      properties: {
        actorRole: "STUDENT",
        trendBand: digest.trendBand as "IMPROVING" | "STEADY" | "BUILDING" | "LIMITED_DATA",
        ageBand: ageDays <= 2 ? "0-2D" : ageDays <= 7 ? "3-7D" : "8D+",
      },
    },
    role,
  );
}
