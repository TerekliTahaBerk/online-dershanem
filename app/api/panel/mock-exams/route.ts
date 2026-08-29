import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { mockExamTemplates, validateMockExamSections } from "@/lib/mock-exams";
import { logAudit } from "@/lib/audit";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { mockExamViewInclude, toMockExamView } from "@/lib/mock-exam-view";
import { initialReviewDueAt } from "@/lib/review-scheduler";
import { netScore } from "@/lib/goals";

const category = z.enum(["KNOWLEDGE", "PROCESS", "ATTENTION", "TIME", "BLANK"]);
const schema = z.object({
  studentId: z.string().min(1).optional(),
  exam: z.enum(["LGS", "TYT", "AYT", "YDT"]),
  title: z.string().trim().max(120).optional(),
  publisher: z.string().trim().max(120).optional(),
  takenAt: z.string().datetime(),
  durationMinutes: z.number().int().min(1).max(600).nullable().optional(),
  entryDurationMs: z.number().int().min(0).max(30 * 60 * 1000).optional(),
  source: z.enum(["MANUAL", "PASTE"]).default("MANUAL"),
  sections: z.array(z.object({ subjectCode: z.string().min(1).max(20), correctCount: z.number().int(), incorrectCount: z.number().int(), blankCount: z.number().int(), durationMinutes: z.number().int().min(0).max(600).nullable().optional(), errorCategories: z.array(category).max(3).default([]) })).min(1).max(8),
});

/**
 * Öğrenci Denemeler verisi — JSON karşılığı.
 *
 * `app/panel/ogrenci/denemeler/page.tsx`'in GÖRÜNTÜLEME kısmıyla (üst şerit,
 * ders-bazlı bar, kendi geçmişine göre trend) AYNI sorgu — net formülü
 * `lib/goals.ts` → `netScore`'dan. **Deneme GİRİŞİ formu
 * (`MockExamWorkspace` — CSV yapıştırma, hata nedeni etiketleme, ısı
 * haritası) bu turda taşınmadı**, ayrı ve daha büyük bir kapsam; bu route
 * yalnız salt-okunur analiz verisini döner.
 */
export async function GET(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) {
    return NextResponse.json({ error: "Deneme analizi henüz açık değil." }, { status: 404 });
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId } });
  if (!profile) {
    return NextResponse.json({ profile: null, exams: [] });
  }

  const exams = await prisma.mockExam.findMany({
    where: { studentId: profile.id },
    orderBy: { takenAt: "desc" },
    take: 10,
    include: { sections: { orderBy: { position: "asc" } } },
  });

  const url = new URL(request.url);
  const requested = url.searchParams.get("deneme");
  const currentIndex = requested ? exams.findIndex((e) => e.id === requested) : 0;
  const current = exams[currentIndex >= 0 ? currentIndex : 0] ?? null;
  const previous = current ? exams[(currentIndex >= 0 ? currentIndex : 0) + 1] : undefined;

  const examTotal = (e: (typeof exams)[number]) => e.sections.reduce((sum, s) => sum + netScore(s.correctCount, s.incorrectCount), 0);

  return NextResponse.json({
    profile: { id: profile.id },
    exams: exams.map((e) => ({ id: e.id, title: e.title || e.exam, takenAt: e.takenAt })),
    // Kendi geçmişi — eskiden yeniye, trend çizgisi için.
    trend: [...exams].reverse().map((e) => ({ id: e.id, takenAt: e.takenAt, net: Number(examTotal(e).toFixed(2)) })),
    current: current
      ? {
          id: current.id,
          title: current.title || current.exam,
          takenAt: current.takenAt,
          durationMinutes: current.durationMinutes,
          nextAction: current.nextAction,
          total: Number(examTotal(current).toFixed(2)),
          delta: previous ? Number((examTotal(current) - examTotal(previous)).toFixed(2)) : null,
          sections: current.sections.map((s) => ({
            id: s.id,
            subjectName: s.subjectName,
            correctCount: s.correctCount,
            incorrectCount: s.incorrectCount,
            net: Number(netScore(s.correctCount, s.incorrectCount).toFixed(2)),
          })),
        }
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN", "TEACHER", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) return NextResponse.json({ error: "Deneme analizi henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.mock_exam.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:mock-exam:${auth.session.userId}`, rateLimit: { max: 40, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Deneme bilgilerini kontrol edin." }, { status: 400 });
  const input = parsed.data;
  const ownProfile = auth.session.role === "STUDENT" ? await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } }) : null;
  const studentId = auth.session.role === "STUDENT" ? ownProfile?.id : input.studentId;
  if (!studentId) return NextResponse.json({ error: "Öğrenci seçin." }, { status: 400 });
  const student = await prisma.studentProfile.findFirst({ where: { id: studentId, user: { status: "ACTIVE" }, ...(auth.session.role === "TEACHER" ? { enrollments: { some: { endedAt: null, group: { teacherId: auth.session.userId, isActive: true } } } } : {}) }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Yetkili olduğunuz öğrenci bulunamadı." }, { status: 404 });
  const validationError = validateMockExamSections(input.exam, input.sections);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const sectionDuration = input.sections.reduce((sum, section) => sum + (section.durationMinutes || 0), 0);
  if (input.durationMinutes && sectionDuration > input.durationMinutes) return NextResponse.json({ error: "Bölüm süreleri toplam süreden büyük olamaz." }, { status: 400 });
  const template = mockExamTemplates[input.exam];
  const exam = await prisma.$transaction(async (tx) => {
    const created = await tx.mockExam.create({ data: { studentId, exam: input.exam, title: input.title || null, publisher: input.publisher || null, takenAt: new Date(input.takenAt), durationMinutes: input.durationMinutes || null, createdById: auth.session.userId } });
    for (const [position, expected] of template.sections.entries()) {
      const section = input.sections.find((item) => item.subjectCode === expected.code)!;
      const createdSection = await tx.mockExamSection.create({ data: { mockExamId: created.id, subjectCode: expected.code, subjectName: expected.name, questionCount: expected.questions, correctCount: section.correctCount, incorrectCount: section.incorrectCount, blankCount: section.blankCount, durationMinutes: section.durationMinutes || null, position, errors: { create: section.errorCategories.map((errorCategory) => ({ category: errorCategory })) } } });
      if (getPanelFeatureFlags().reviewQueue && section.incorrectCount > 0) await tx.reviewItem.create({ data: { studentId, sourceType: "MOCK_EXAM_SECTION", mockExamSectionId: createdSection.id, createdById: auth.session.userId, title: `${expected.name} deneme dönüşü`, sourceReference: `${input.exam} · ${input.title || input.publisher || "deneme"} · ${section.incorrectCount} yanlış`, dueAt: initialReviewDueAt(new Date(input.takenAt)) } });
    }
    return created;
  });
  await logAudit({ actorUserId: auth.session.userId, entityType: "MockExam", entityId: exam.id, action: "mock_exam.created", summary: `${input.exam} deneme sonucu eklendi`, payload: { exam: input.exam, sectionCount: input.sections.length, reasonCount: input.sections.reduce((sum, section) => sum + section.errorCategories.length, 0) } });
  await recordPanelProductEvent({ name: "mock_exam_entry_completed", properties: { examType: input.exam, entryDurationMs: input.entryDurationMs || 0, sectionCount: input.sections.length, reasonCount: input.sections.reduce((sum, section) => sum + section.errorCategories.length, 0), source: input.source } }, auth.session.role);
  const reviewItemCount = getPanelFeatureFlags().reviewQueue ? input.sections.filter((section) => section.incorrectCount > 0).length : 0;
  if (reviewItemCount) await recordPanelProductEvent({ name: "review_items_created", properties: { sourceType: "MOCK_EXAM_SECTION", itemCount: reviewItemCount } }, auth.session.role);
  const fullExam = await prisma.mockExam.findUniqueOrThrow({ where: { id: exam.id }, include: mockExamViewInclude });
  return NextResponse.json({ exam: toMockExamView(fullExam) });
}
