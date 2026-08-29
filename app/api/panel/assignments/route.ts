import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

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
export async function GET() {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;

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
            group: { select: { name: true, subject: true } },
            rubricCriteria: { orderBy: { position: "asc" } },
            submissions: { where: { studentId: profile.id }, orderBy: { attemptNumber: "desc" }, include: { scores: true } },
          },
        })
      : Promise.resolve([]),
    prisma.weeklyPlan.findFirst({
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

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.assignments.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:assignments:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ödev bilgilerini kontrol edin." }, { status: 400 });

  const group = await prisma.group.findFirst({
    where: { id: parsed.data.groupId, isActive: true, ...(auth.session.role === "TEACHER" ? { teacherId: auth.session.userId } : {}) },
    include: { enrollments: { where: { endedAt: null }, include: { student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } } } } },
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
  const body = `${assignment.title} · son tarih ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(assignment.dueAt)}`;
  const studentRecipients = [...new Set(group.enrollments.map((item) => item.student.userId))];
  const parentRecipients = [...new Set(group.enrollments.flatMap((item) => item.student.parents.map((link) => link.parentId)))];
  const rawNotificationRows = [...studentRecipients.map((userId) => ({ userId, type: "ASSIGNMENT" as const, title: "Yeni çalışma eklendi", body, href: "/panel/ogrenci/odevler" })), ...parentRecipients.map((userId) => ({ userId, type: "ASSIGNMENT" as const, title: "Yeni çalışma eklendi", body, href: "/panel/veli/takip" }))];
  const notificationRows = await filterNotificationRows(rawNotificationRows, "assignment");
  if (notificationRows.length) await prisma.notification.createMany({ data: notificationRows });
  await queuePanelNotificationEmails(rawNotificationRows, "assignment");
  await logAudit({ actorUserId: auth.session.userId, entityType: "Assignment", entityId: assignment.id, action: "assignment.created", summary: `${assignment.title} ödevi oluşturuldu`, payload: { groupId: group.id, dueAt: assignment.dueAt.toISOString() } });
  if (flags.learningOutcomes) await recordPanelProductEvent({ name: "curriculum_link_saved", properties: { targetType: "ASSIGNMENT", outcomeCount: outcomeIds.length, needsReviewCount: 0, skipReason: parsed.data.outcomeSkipReason || "NONE" } }, auth.session.role);
  return NextResponse.json({ id: assignment.id });
}
