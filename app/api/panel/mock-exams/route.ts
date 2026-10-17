import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAnyProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { hasFreshStepUp } from "@/lib/auth/mfa-policy";
import { netScore } from "@/lib/goals";
import { createMockExamService, MockExamError } from "@/lib/panel/mock-exam-service";
import { isBearerRequest, stepUpRequired } from "@/lib/panel/mock-exam-http";

const category = z.enum(["KNOWLEDGE", "PROCESS", "ATTENTION", "TIME", "BLANK"]);
const listQuerySchema = z.object({ deneme: z.string().trim().min(1).max(191).optional() });
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
  idempotencyKey: z.string().uuid().optional(),
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
  const auth = await requireApiAnyProductRole(["OD", "OK"], "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) {
    return NextResponse.json({ error: "Deneme analizi şu an kullanıma kapalı, çok yakında açılacak." }, { status: 404 });
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
  const query = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!query.success) return NextResponse.json({ error: "Deneme filtresi geçerli görünmüyor." }, { status: 400 });
  const requested = query.data.deneme;
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
  const auth = await requireApiAnyProductRole(["OD", "OK"], "ADMIN", "TEACHER", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) return NextResponse.json({ error: "Deneme analizi şu an kullanıma kapalı, çok yakında açılacak." }, { status: 404 });
  // Yönetici yazmaları (web + mobil) taze step-up ister; öğretmen / öğrenci akışı değişmez.
  if (auth.session.role === "ADMIN" && !hasFreshStepUp(auth.session.stepUpAt)) return stepUpRequired();
  const guard = await guardMutation({ action: "panel.mock_exam.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:mock-exam:${auth.session.userId}`, rateLimit: { max: 40, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Lütfen deneme bilgilerini bir kez daha kontrol eder misiniz?" }, { status: 400 });
  if (isBearerRequest(request) && !parsed.data.idempotencyKey) return NextResponse.json({ error: "Güvenli işlem bilgisi eksik görünüyor. Sayfayı yenileyip tekrar dener misiniz?", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  try {
    const result = await createMockExamService({ userId: auth.session.userId, role: auth.session.role }, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MockExamError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
