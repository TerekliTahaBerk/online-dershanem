import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOdkApiAccess } from "@/lib/access/odk";
import { apiOk, apiErr } from "@/lib/odk/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/odk/student/exams
 * Öğrencinin erişim taglarına göre çözebileceği YAYINDAKİ denemelerin listesi.
 * Her deneme için kullanıcının mevcut attempt durumu da döner.
 */
export async function GET(_req: NextRequest) {
  const auth = await ensureOdkApiAccess();
  if (!auth.ok) return apiErr(auth.message, auth.status);

  const userId = auth.userId;
  const role = auth.role;

  // Kullanıcının aktif ODK tagları
  const userTagRows = await prisma.odkUserAccessTag.findMany({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      accessTag: { isActive: true, service: "ODK" },
    },
    select: { accessTagId: true },
  });
  const tagIds = userTagRows.map((t) => t.accessTagId);

  // Admin → tüm yayındaki denemeleri görür
  const where = role === "ADMIN"
    ? { status: "PUBLISHED" as const }
    : tagIds.length === 0
      ? { id: "__none__" }
      : {
          status: "PUBLISHED" as const,
          examAccessTags: { some: { accessTagId: { in: tagIds } } },
        };

  const exams = await prisma.odkExam.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      cadenceFamily: true,
      classLevel: true,
      durationMinutes: true,
      publishedAt: true,
      sections: { select: { questionCount: true } },
      attempts: {
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { id: true, status: true, score: true, submittedAt: true },
      },
    },
  });

  const data = exams.map((e) => {
    const totalSlots = e.sections.reduce((a, s) => a + s.questionCount, 0);
    const lastAttempt = e.attempts[0] ?? null;
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      family: e.cadenceFamily,
      classLevel: e.classLevel,
      durationMinutes: e.durationMinutes,
      publishedAt: e.publishedAt,
      totalQuestions: totalSlots,
      lastAttempt: lastAttempt
        ? {
            id: lastAttempt.id,
            status: lastAttempt.status,
            score: lastAttempt.score ? Number(lastAttempt.score) : null,
            submittedAt: lastAttempt.submittedAt,
          }
        : null,
    };
  });

  return apiOk({ exams: data });
}
