import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma as defaultDb } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { transactionalAudit } from "@/lib/panel/education-write";
import { notifyAssignmentCreated } from "@/lib/panel/study-notifications";
import { afterResponse } from "@/lib/after-response";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent as emitProductEvent } from "@/lib/panel-product-events";
import { afterEducationCommit } from "@/lib/panel/education-write";

const schema = z.object({
  groupId: z.string().min(1),
  lessonId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.string().datetime(),
  outcomeIds: z.array(z.string().min(1)).max(3).default([]),
  outcomeSkipReason: z.enum(["CATALOG_MISSING", "COMPLETE_LATER", "NOT_APPLICABLE"]).nullable().default(null),
  evidenceRequired: z.boolean().default(false),
  rubricCriteria: z.array(z.string().trim().min(2).max(120)).max(4).default([]),
});

/**
 * Öğrenci Çalışmalar verisi — JSON karşılığı.
 *
 * `app/panel/ogrenci/odevler/page.tsx` ile AYNI iki kaynak (Assignment +
 * WeeklyPlanTask) ve AYNI Bugün/Bu hafta/Sonraki/Tamamlananlar gruplama
 * mantığı. Web sayfası bu route'a geçirilmedi (riskten kaçınmak için).
 */
const listQuerySchema = z.object({ scope: z.literal("OD").optional() });

/**
 * `?scope=OD` (M2 mobil): yanıt yalnız Dershanem ödevlerini taşır — Yön
 * Koçluk plan görevleri sorgulanmaz ve `planTasks: []` döner (plan görevleri
 * Yön çalışma alanına aittir). Parametresiz istek eski davranıştır.
 * Ödev / teslim satırlarındaki `teacherName`, `submittedAt`, `reviewedAt`
 * eklemelidir; eski istemciler yok sayar.
 */
export async function GET(request: Request) {
  const prisma = defaultDb;
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;
  const query = listQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return NextResponse.json({ error: "Geçersiz çalışma alanı kapsamı." }, { status: 400 });
  const odOnly = query.data.scope === "OD";

  const evidenceEnabled = getPanelFeatureFlags().assignmentEvidence;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId } });
  if (!profile) {
    return NextResponse.json({ profile: null, assignments: [], planTasks: [], evidenceEnabled });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [assignments, plan] = await Promise.all([
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          orderBy: { dueAt: "asc" },
          include: {
            progress: { where: { studentId: profile.id }, take: 1 },
            group: { select: { name: true, subject: true, teacher: { select: { fullName: true } } } },
            rubricCriteria: { orderBy: { position: "asc" } },
            submissions: { where: { studentId: profile.id }, orderBy: { attemptNumber: "desc" }, include: { scores: true } },
          },
        })
      : Promise.resolve([]),
    odOnly
      ? Promise.resolve(null)
      : prisma.weeklyPlan.findFirst({
          where: { studentId: profile.id },
          orderBy: { weekStart: "desc" },
          include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
        }),
  ]);

  return NextResponse.json({
    profile: { id: profile.id },
    evidenceEnabled,
    assignments: assignments.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description || "",
      dueAt: item.dueAt,
      groupName: item.group.name,
      subject: item.group.subject,
      teacherName: item.group.teacher.fullName,
      status: item.progress[0]?.status || "TODO",
      version: item.progress[0]?.version || 0,
      evidenceRequired: item.evidenceRequired,
      criteria: item.rubricCriteria.map((criterion) => ({ id: criterion.id, label: criterion.label })),
      submissions: item.submissions.map((submission) => ({
        id: submission.id,
        attemptNumber: submission.attemptNumber,
        status: submission.status,
        textEvidence: submission.textEvidence,
        feedback: submission.feedback,
        scores: submission.scores.map((score) => ({ criterionId: score.criterionId, level: score.level })),
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt,
      })),
    })),
    planTasks: (plan?.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      durationMinutes: t.durationMinutes,
      scheduledFor: t.scheduledFor,
      done: t.status === "DONE",
    })),
  });
}

export async function POST(request: Request, _context: { params: Promise<{ id: string }> }, prisma: PrismaClient = defaultDb) {
  const recordPanelProductEvent = (...args: Parameters<typeof emitProductEvent>) => afterEducationCommit(prisma, () => emitProductEvent(...args));
  const logAudit = transactionalAudit(prisma);
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.assignments.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:assignments:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ödev bilgilerini kontrol edin." }, { status: 400 });

  const group = await prisma.group.findFirst({
    where: { id: parsed.data.groupId, isActive: true, ...(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {}) },
    include: { enrollments: { where: { endedAt: null }, include: { student: { select: { id: true, userId: true, parents: { where: { active: true, endedAt: null, canViewAcademic: true }, select: { parentId: true } } } } } } },
  });
  if (!group) return NextResponse.json({ error: "Yetkili olduğunuz aktif grup bulunamadı." }, { status: 404 });
  const flags = getPanelFeatureFlags();
  const evidenceRequired = flags.assignmentEvidence && parsed.data.evidenceRequired;
  const rubricCriteria = [...new Set(parsed.data.rubricCriteria.map((item) => item.trim()))];
  if (evidenceRequired && (rubricCriteria.length < 2 || rubricCriteria.length > 4)) return NextResponse.json({ error: "Kanıtlı ödev için 2–4 farklı değerlendirme ölçütü girin." }, { status: 400 });
  if (parsed.data.lessonId) {
    const lesson = await prisma.lesson.findFirst({ where: { id: parsed.data.lessonId, groupId: group.id }, select: { id: true } });
    if (!lesson) return NextResponse.json({ error: "Seçilen ders bu gruba ait değil." }, { status: 400 });
  }

  const outcomeIds = flags.learningOutcomes ? [...new Set(parsed.data.outcomeIds)] : [];
  if (flags.learningOutcomes && !outcomeIds.length && !parsed.data.outcomeSkipReason) return NextResponse.json({ error: "Kazanım seçin veya sonra tamamlama nedenini belirtin." }, { status: 400 });
  if (outcomeIds.length) {
    const validOutcomeCount = await prisma.learningOutcome.count({ where: { id: { in: outcomeIds }, isActive: true, unit: { subject: { version: { status: "ACTIVE" } } } } });
    if (validOutcomeCount !== outcomeIds.length) return NextResponse.json({ error: "Seçilen kazanımlardan biri artık aktif değil." }, { status: 400 });
  }

  const assignment = await prisma.assignment.create({
    data: {
      groupId: group.id,
      lessonId: parsed.data.lessonId || null,
      createdById: auth.session.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt: new Date(parsed.data.dueAt),
      progress: { create: group.enrollments.map((item) => ({ studentId: item.student.id })) },
      outcomeLinks: { create: outcomeIds.map((outcomeId) => ({ outcomeId, linkedById: auth.session.userId })) },
      outcomeSkipReason: outcomeIds.length ? null : parsed.data.outcomeSkipReason,
      evidenceRequired,
      rubricCriteria: { create: evidenceRequired ? rubricCriteria.map((label, index) => ({ label, position: index + 1 })) : [] },
    },
  });
  // Öğrenci + akademik izinli veli; tercih, e-posta outbox ve push aynı yoldan.
  await notifyAssignmentCreated(prisma, assignment.id);
  await logAudit({ actorUserId: auth.session.userId, entityType: "Assignment", entityId: assignment.id, action: "assignment.created", summary: `${assignment.title} ödevi oluşturuldu`, payload: { groupId: group.id, dueAt: assignment.dueAt.toISOString() } });
  const { onAssignmentCreated } = await import("@/lib/student-success/server/emit-hooks");
  await afterEducationCommit(prisma, () => afterResponse("panel.assignment.cross_product_emit_failed", () => onAssignmentCreated({
    assignmentId: assignment.id,
    groupId: group.id,
    dueAt: assignment.dueAt,
    outcomeIds,
    actorUserId: auth.session.userId,
    studentIds: group.enrollments.map((item) => item.student.id),
  }), { assignmentId: assignment.id }));
  if (flags.learningOutcomes) await recordPanelProductEvent({ name: "curriculum_link_saved", properties: { targetType: "ASSIGNMENT", outcomeCount: outcomeIds.length, needsReviewCount: 0, skipReason: parsed.data.outcomeSkipReason || "NONE" } }, auth.session.role);
  return NextResponse.json({ id: assignment.id });
}
