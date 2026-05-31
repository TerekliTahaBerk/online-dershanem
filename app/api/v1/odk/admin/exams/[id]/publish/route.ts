import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";
import { notifyUsers } from "@/lib/notifications";
import { guardMutation } from "@/lib/security/mutation-guard";

export const dynamic = "force-dynamic";

/**
 * Publish gate. Aşağıdaki şartların tümü sağlanmalı:
 *   - DRAFT statüsünde
 *   - Booklet PDF yüklü
 *   - En az 1 section + en az 1 official answer
 *   - section.questionCount toplamı = official answer sayısı
 *   - Tüm official answer satırlarında learningOutcomeCode dolu (kazanım yüklü)
 *   - En az 1 access tag bağlı
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  // Phase 2 / Session 17 — abuse hardening: per-admin rate-limit + same-origin.
  const guard = await guardMutation({
    action: "odk.exam.publish",
    userId: auth.userId,
    requireSameOrigin: true,
    headers: _req.headers,
    rateLimit: { max: 30, windowMs: 60 * 60_000 },
  });
  if (!guard.ok) {
    return apiErr(guard.message, guard.code === "RATE_LIMIT" ? 429 : 403);
  }

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    include: {
      sections: { select: { id: true, questionCount: true } },
      files: { select: { fileType: true } },
      officialAnswers: { select: { learningOutcomeCode: true } },
      examAccessTags: { select: { accessTagId: true } },
    } as never,
  }) as unknown as
    | (null)
    | {
        id: string;
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        sections: { id: string; questionCount: number }[];
        files: { fileType: "BOOKLET_PDF" | "ANSWER_KEY_PDF" }[];
        officialAnswers: { learningOutcomeCode: string | null }[];
        examAccessTags: { accessTagId: string }[];
      };
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam.status === "PUBLISHED") return apiErr("Zaten yayında.", 409);
  if (exam.status === "ARCHIVED") return apiErr("Arşivlenmiş deneme yayınlanamaz.", 409);

  const issues: string[] = [];
  if (exam.sections.length === 0) issues.push("Bölüm tanımlanmamış.");
  if (!exam.files.some((f) => f.fileType === "BOOKLET_PDF")) issues.push("Deneme PDF yüklenmemiş.");
  if (exam.officialAnswers.length === 0) issues.push("Cevap anahtarı yüklenmemiş.");
  const sectionTotal = exam.sections.reduce((a, s) => a + s.questionCount, 0);
  if (sectionTotal !== exam.officialAnswers.length) {
    issues.push(`Bölüm soru toplamı (${sectionTotal}) ile cevap anahtarı (${exam.officialAnswers.length}) eşleşmiyor.`);
  }
  const missingOutcomes = exam.officialAnswers.filter((a) => !a.learningOutcomeCode).length;
  if (missingOutcomes > 0) issues.push(`${missingOutcomes} soru için kazanım eksik.`);
  if (exam.examAccessTags.length === 0) issues.push("Erişim tagı bağlanmamış.");

  if (issues.length > 0) {
    return apiErr("Yayın için eksikler var.", 422, { issues });
  }

  const now = new Date();
  const updated = await prisma.odkExam.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: now },
    select: { id: true, status: true, publishedAt: true, title: true },
  });

  // Phase 2 / Session 16 — Notify entitled students. Best-effort: failures
  // here MUST NOT roll back the publish above. Audience = active
  // OdkUserAccessTag rows whose accessTagId is linked to this exam.
  try {
    const tagIds = exam.examAccessTags.map((t) => t.accessTagId);
    if (tagIds.length > 0) {
      const grants = await prisma.odkUserAccessTag.findMany({
        where: {
          accessTagId: { in: tagIds },
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        select: { userId: true },
      });
      const recipientIds = Array.from(new Set(grants.map((g) => g.userId)));
      if (recipientIds.length > 0) {
        await notifyUsers(recipientIds, {
          title: "Yeni deneme yayında",
          body: `${updated.title} adlı deneme yayına alındı. Çözmeye hemen başlayabilirsiniz.`,
          href: `/odk/denemeler/${id}`,
          type: "ANNOUNCEMENT",
          priority: "NORMAL",
          category: "ANNOUNCEMENT",
          inboxPriority: "NORMAL",
          relatedEntityType: "OdkExam",
          relatedEntityId: id,
        });
      }
    }
  } catch (err) {
    console.warn("[odk/exam/publish] notification fan-out failed", err);
  }

  return apiOk({ exam: updated });
}

/** DELETE = unpublish (PUBLISHED → DRAFT). Mevcut attempt'ları korur. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam.status !== "PUBLISHED") return apiErr("Sadece PUBLISHED denemeler unpublish edilebilir.", 409);
  await prisma.odkExam.update({ where: { id }, data: { status: "DRAFT" } });
  return apiOk({ unpublished: true });
}
