import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { log } from "@/lib/logger";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { initialReviewDueAt } from "@/lib/review-scheduler";
import { lessonCloseRequestHash } from "@/lib/lesson-close";
import { generateRecoveryPackage, publishRecoveryPackage } from "@/lib/recovery-package-server";

const attendance = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
const outcomeEvidence = z.enum(["TAUGHT", "OBSERVED", "INDEPENDENT", "NEEDS_REVIEW"]);
const schema = z.object({
  topic: z.string().trim().max(160).default(""),
  note: z.string().trim().max(2000).default(""),
  nextGoal: z.string().trim().max(500).default(""),
  homework: z.string().trim().max(1000).default(""),
  complete: z.boolean().default(false),
  students: z.array(z.object({ studentId: z.string().min(1), note: z.string().trim().max(1000).default(""), attendance })),
  outcomes: z.array(z.object({ outcomeId: z.string().min(1), evidenceType: outcomeEvidence })).max(3).default([]),
  outcomeSkipReason: z.enum(["CATALOG_MISSING", "COMPLETE_LATER", "NOT_APPLICABLE"]).nullable().default(null),
  expectedVersion: z.number().int().min(0).optional(),
  idempotencyKey: z.string().uuid().optional(),
  assignmentDraft: z.object({
    title: z.string().trim().min(2).max(140),
    description: z.string().trim().min(1).max(2000),
    dueAt: z.string().datetime(),
    studentIds: z.array(z.string().min(1)).min(1).max(100),
  }).nullable().optional(),
});

class LessonCloseConflict extends Error {}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestStartedAt = performance.now();
  const auth = await requireApiOdRole("TEACHER");
  if (!auth.ok) return auth.response;
  const recordFinished = (outcome: "success" | "validation" | "rejected" | "system_error", data = { completionAttempt: false, groupSize: 0, privateNoteCount: 0, filledSharedFieldCount: 0 }) => recordPanelProductEvent({ name: "lesson_notes_finished", properties: { durationMs: Math.round(performance.now() - requestStartedAt), outcome, ...data } }, auth.session.role);
  const guard = await guardMutation({ action: "panel.lesson_notes.save", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:notes:${auth.session.userId}`, rateLimit: { max: 240, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) { await recordFinished("rejected"); return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 }); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) { await recordFinished("validation"); return NextResponse.json({ error: "Notlar kaydedilemedi; alanları kontrol edin." }, { status: 400 }); }
  const eventData = {
    completionAttempt: parsed.data.complete,
    groupSize: parsed.data.students.length,
    privateNoteCount: parsed.data.students.filter((item) => item.note.length > 0).length,
    filledSharedFieldCount: [parsed.data.topic, parsed.data.note, parsed.data.nextGoal, parsed.data.homework].filter(Boolean).length,
  };
  const { id } = await context.params;
  const featureFlags = getPanelFeatureFlags();
  const lesson = await prisma.lesson.findFirst({
    where: { id, teacherId: auth.session.userId },
    include: { group: { include: { enrollments: { where: { endedAt: null }, include: { student: { select: { id: true, userId: true, parents: { select: { parentId: true } } } } } } } } },
  });
  if (!lesson) { await recordFinished("rejected", eventData); return NextResponse.json({ error: "Ders bulunamadı." }, { status: 404 }); }
  const allowed = new Set(lesson.group.enrollments.map((item) => item.student.id));
  if (parsed.data.students.some((item) => !allowed.has(item.studentId))) { await recordFinished("rejected", eventData); return NextResponse.json({ error: "Bu gruba ait olmayan öğrenci gönderildi." }, { status: 403 }); }
  const assignmentStudentIds = [...new Set(parsed.data.assignmentDraft?.studentIds || [])];
  if (assignmentStudentIds.some((studentId) => !allowed.has(studentId))) { await recordFinished("rejected", eventData); return NextResponse.json({ error: "Ödev taslağında bu gruba ait olmayan öğrenci var." }, { status: 403 }); }
  if (parsed.data.assignmentDraft && new Date(parsed.data.assignmentDraft.dueAt) <= new Date()) { await recordFinished("validation", eventData); return NextResponse.json({ error: "Ödev son tarihi gelecekte olmalı." }, { status: 400 }); }
  if (featureFlags.quickLessonClose && parsed.data.complete && (!parsed.data.idempotencyKey || parsed.data.expectedVersion === undefined)) { await recordFinished("validation", eventData); return NextResponse.json({ error: "Güvenli kapanış bilgisi eksik; sayfayı yenileyip tekrar deneyin." }, { status: 400 }); }
  const closeHash = parsed.data.complete ? lessonCloseRequestHash({ topic: parsed.data.topic, note: parsed.data.note, nextGoal: parsed.data.nextGoal, homework: parsed.data.homework, students: parsed.data.students, outcomes: parsed.data.outcomes, outcomeSkipReason: parsed.data.outcomeSkipReason, assignmentDraft: parsed.data.assignmentDraft || null }) : null;
  if (featureFlags.quickLessonClose && parsed.data.complete && lesson.closeIdempotencyKey === parsed.data.idempotencyKey) {
    if (lesson.closeRequestHash !== closeHash) { await recordPanelProductEvent({ name: "lesson_close_conflict", properties: { reason: "IDEMPOTENCY_REUSE" } }, auth.session.role); await recordFinished("rejected", eventData); return NextResponse.json({ error: "Aynı işlem anahtarı farklı içerikle kullanılamaz." }, { status: 409 }); }
    await recordFinished("success", eventData);
    return NextResponse.json({ savedAt: lesson.updatedAt.toISOString(), version: lesson.closeVersion, replayed: true });
  }
  if (featureFlags.quickLessonClose && parsed.data.complete && lesson.closeVersion !== parsed.data.expectedVersion) { await recordPanelProductEvent({ name: "lesson_close_conflict", properties: { reason: "VERSION" } }, auth.session.role); await recordFinished("rejected", eventData); return NextResponse.json({ error: "Bu ders başka bir sekmede güncellendi. Son kaydı görüp değişikliklerinizi yeniden uygulayın.", code: "LESSON_CLOSE_CONFLICT", latestVersion: lesson.closeVersion }, { status: 409 }); }
  const uniqueOutcomes = [...new Map(parsed.data.outcomes.map((item) => [item.outcomeId, item])).values()];
  if (featureFlags.learningOutcomes && parsed.data.complete && !uniqueOutcomes.length && !parsed.data.outcomeSkipReason) { await recordFinished("validation", eventData); return NextResponse.json({ error: "Kazanım seçin veya sonra tamamlama nedenini belirtin." }, { status: 400 }); }
  let outcomeDetails: { id: string; title: string }[] = [];
  if (featureFlags.learningOutcomes && uniqueOutcomes.length) {
    outcomeDetails = await prisma.learningOutcome.findMany({ where: { id: { in: uniqueOutcomes.map((item) => item.outcomeId) }, isActive: true, unit: { subject: { version: { status: "ACTIVE" } } } }, select: { id: true, title: true } });
    if (outcomeDetails.length !== uniqueOutcomes.length) { await recordFinished("validation", eventData); return NextResponse.json({ error: "Seçilen kazanımlardan biri artık aktif değil." }, { status: 400 }); }
  }

  const firstCompletion = parsed.data.complete && lesson.status !== "COMPLETED";
  const summary = parsed.data.topic || lesson.title;
  const rawSummaryRows = firstCompletion ? [
    ...lesson.group.enrollments.map((item) => ({ userId: item.student.userId, type: "LESSON_SUMMARY" as const, title: "Ders özeti hazır", body: `${lesson.title} · ${summary}`, href: "/panel/ogrenci" })),
    ...lesson.group.enrollments.flatMap((item) => item.student.parents.map((link) => ({ userId: link.parentId, type: "LESSON_SUMMARY" as const, title: "Ders özeti hazır", body: `${lesson.title} · ${summary}`, href: `/panel/veli?studentId=${item.student.id}` }))),
  ] : [];
  const rawAbsenceRows = firstCompletion ? parsed.data.students.filter((item) => item.attendance === "ABSENT").flatMap((absent) => lesson.group.enrollments.find((item) => item.student.id === absent.studentId)?.student.parents.map((link) => ({ userId: link.parentId, type: "ABSENCE" as const, title: "Devamsızlık bilgisi", body: `${lesson.title} dersine katılım görünmüyor.`, href: `/panel/veli?studentId=${absent.studentId}` })) || []) : [];
  const assignmentRecipients = lesson.group.enrollments.filter((item) => assignmentStudentIds.includes(item.student.id));
  const assignmentBody = parsed.data.assignmentDraft ? `${parsed.data.assignmentDraft.title} · son tarih ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(parsed.data.assignmentDraft.dueAt))}` : "";
  const rawAssignmentRows = firstCompletion && parsed.data.assignmentDraft ? [
    ...assignmentRecipients.map((item) => ({ userId: item.student.userId, type: "ASSIGNMENT" as const, title: "Yeni çalışma eklendi", body: assignmentBody, href: "/panel/ogrenci/odevler" })),
    ...assignmentRecipients.flatMap((item) => item.student.parents.map((link) => ({ userId: link.parentId, type: "ASSIGNMENT" as const, title: "Yeni çalışma eklendi", body: assignmentBody, href: "/panel/veli/takip" }))),
  ] : [];
  const [summaryRows, absenceRows, assignmentRows] = await Promise.all([
    filterNotificationRows(rawSummaryRows, "lessonSummary"),
    filterNotificationRows(rawAbsenceRows, "absence"),
    filterNotificationRows(rawAssignmentRows, "assignment"),
  ]);

  try {
    await prisma.$transaction(async (tx) => {
    if (featureFlags.quickLessonClose && parsed.data.complete) {
      const claimed = await tx.lesson.updateMany({ where: { id, teacherId: auth.session.userId, closeVersion: parsed.data.expectedVersion }, data: { closeVersion: { increment: 1 }, closeIdempotencyKey: parsed.data.idempotencyKey, closeRequestHash: closeHash, completedAt: new Date() } });
      if (claimed.count !== 1) throw new LessonCloseConflict();
    }
    const common = await tx.lessonNote.findFirst({ where: { lessonId: id, studentId: null }, select: { id: true } });
    const commonData = { topic: parsed.data.topic || null, note: parsed.data.note || null, nextGoal: parsed.data.nextGoal || null, homework: parsed.data.homework || null };
    if (common) await tx.lessonNote.update({ where: { id: common.id }, data: commonData });
    else await tx.lessonNote.create({ data: { lessonId: id, ...commonData } });

    for (const item of parsed.data.students) {
      const existing = await tx.lessonNote.findFirst({ where: { lessonId: id, studentId: item.studentId }, select: { id: true } });
      if (item.note) {
        if (existing) await tx.lessonNote.update({ where: { id: existing.id }, data: { note: item.note } });
        else await tx.lessonNote.create({ data: { lessonId: id, studentId: item.studentId, note: item.note } });
      } else if (existing) await tx.lessonNote.delete({ where: { id: existing.id } });
      await tx.attendance.upsert({ where: { lessonId_studentId: { lessonId: id, studentId: item.studentId } }, create: { lessonId: id, studentId: item.studentId, status: item.attendance }, update: { status: item.attendance } });
    }
    if (parsed.data.complete) {
      await tx.lesson.update({ where: { id }, data: { status: "COMPLETED" } });
      if (summaryRows.length || absenceRows.length || assignmentRows.length) await tx.notification.createMany({ data: [...summaryRows, ...absenceRows, ...assignmentRows] });
      if (featureFlags.quickLessonClose && firstCompletion && parsed.data.assignmentDraft) await tx.assignment.create({ data: { groupId: lesson.groupId, lessonId: id, createdById: auth.session.userId, title: parsed.data.assignmentDraft.title, description: parsed.data.assignmentDraft.description, dueAt: new Date(parsed.data.assignmentDraft.dueAt), progress: { create: assignmentStudentIds.map((studentId) => ({ studentId })) }, outcomeLinks: { create: uniqueOutcomes.map((item) => ({ outcomeId: item.outcomeId, linkedById: auth.session.userId })) }, outcomeSkipReason: uniqueOutcomes.length ? null : parsed.data.outcomeSkipReason } });
    }
    if (featureFlags.learningOutcomes) {
      await tx.lessonOutcome.deleteMany({ where: { lessonId: id } });
      if (uniqueOutcomes.length) await tx.lessonOutcome.createMany({ data: uniqueOutcomes.map((item) => ({ lessonId: id, outcomeId: item.outcomeId, evidenceType: item.evidenceType, linkedById: auth.session.userId })) });
      await tx.lesson.update({ where: { id }, data: { outcomeSkipReason: uniqueOutcomes.length ? null : parsed.data.outcomeSkipReason } });
      if (featureFlags.reviewQueue && parsed.data.complete) for (const student of parsed.data.students.filter((item) => item.attendance === "PRESENT" || item.attendance === "LATE")) for (const selectedOutcome of uniqueOutcomes.filter((item) => item.evidenceType === "NEEDS_REVIEW")) {
        const detail = outcomeDetails.find((item) => item.id === selectedOutcome.outcomeId);
        if (detail) await tx.reviewItem.upsert({ where: { studentId_lessonId_outcomeId: { studentId: student.studentId, lessonId: id, outcomeId: detail.id } }, create: { studentId: student.studentId, sourceType: "LESSON_OUTCOME", lessonId: id, outcomeId: detail.id, createdById: auth.session.userId, title: detail.title, sourceReference: `${lesson.title} · ${new Intl.DateTimeFormat("tr-TR").format(lesson.startsAt)}`, dueAt: initialReviewDueAt(lesson.startsAt) }, update: { title: detail.title, sourceReference: `${lesson.title} · ${new Intl.DateTimeFormat("tr-TR").format(lesson.startsAt)}` } });
      }
    }
    });
  } catch (error) {
    if (error instanceof LessonCloseConflict) { await recordPanelProductEvent({ name: "lesson_close_conflict", properties: { reason: "VERSION" } }, auth.session.role); await recordFinished("rejected", eventData); return NextResponse.json({ error: "Bu ders başka bir sekmede güncellendi. Son kaydı görüp değişikliklerinizi yeniden uygulayın.", code: "LESSON_CLOSE_CONFLICT" }, { status: 409 }); }
    await recordFinished("system_error", eventData);
    throw error;
  }
  if (firstCompletion) {
    await Promise.all([
      queuePanelNotificationEmails(rawSummaryRows, "lessonSummary"),
      queuePanelNotificationEmails(rawAbsenceRows, "absence"),
      queuePanelNotificationEmails(rawAssignmentRows, "assignment"),
    ]);
    if (featureFlags.recoveryPackage) {
      const absences = await prisma.attendance.findMany({ where: { lessonId: id, status: "ABSENT" }, select: { id: true } });
      for (const attendance of absences) {
        const generated = await generateRecoveryPackage(attendance.id, auth.session.userId);
        if (!generated) continue;
        const items = generated.package.items;
        await recordPanelProductEvent({ name: "recovery_package_generated", properties: { ruleVersion: "recovery-v1", itemCount: items.length, hasMaterial: items.some((item) => item.kind === "MATERIAL"), hasAssignment: items.some((item) => item.kind === "ASSIGNMENT"), reused: generated.reused } }, auth.session.role);
        const published = await publishRecoveryPackage({ packageId: generated.package.id, teacherId: auth.session.userId, rebalancePlan: featureFlags.adaptivePlan });
        if (published.kind === "PUBLISHED") await recordPanelProductEvent({ name: "recovery_package_published", properties: { publishDelayMs: published.publishDelayMs, itemCount: published.itemCount, planRebalanced: published.planRebalanced } }, auth.session.role);
      }
    }
  }
  if (featureFlags.baselineMetrics) {
    log.info("panel.lesson_notes.saved", {
      durationMs: Math.round(performance.now() - requestStartedAt),
      completionAttempt: parsed.data.complete,
      firstCompletion,
      studentCount: parsed.data.students.length,
      privateNoteCount: parsed.data.students.filter((item) => item.note.length > 0).length,
      filledSharedFieldCount: [parsed.data.topic, parsed.data.note, parsed.data.nextGoal, parsed.data.homework].filter(Boolean).length,
      attendancePresentCount: parsed.data.students.filter((item) => item.attendance === "PRESENT").length,
    });
  }
  await recordFinished("success", eventData);
  if (featureFlags.quickLessonClose && parsed.data.complete) await recordPanelProductEvent({ name: "lesson_close_quality", properties: { missingFieldCount: [parsed.data.topic, parsed.data.note, parsed.data.nextGoal].filter((value) => !value).length, exceptionCount: parsed.data.students.filter((item) => item.attendance !== "PRESENT" || item.note.length > 0).length, assignmentRecipientCount: assignmentStudentIds.length, outcomeLinked: uniqueOutcomes.length > 0 } }, auth.session.role);
  if (featureFlags.quickLessonClose && !parsed.data.complete && lesson.status === "COMPLETED" && lesson.completedAt) { const ageHours = (Date.now() - lesson.completedAt.getTime()) / 3600000; await recordPanelProductEvent({ name: "lesson_close_revised", properties: { ageBand: ageHours <= 24 ? "0-24H" : ageHours <= 24 * 7 ? "25H-7D" : "8D+" } }, auth.session.role); }
  if (featureFlags.learningOutcomes && parsed.data.complete) await recordPanelProductEvent({ name: "curriculum_link_saved", properties: { targetType: "LESSON", outcomeCount: uniqueOutcomes.length, needsReviewCount: uniqueOutcomes.filter((item) => item.evidenceType === "NEEDS_REVIEW").length, skipReason: parsed.data.outcomeSkipReason || "NONE" } }, auth.session.role);
  const reviewItemCount = featureFlags.reviewQueue && parsed.data.complete ? parsed.data.students.filter((item) => item.attendance === "PRESENT" || item.attendance === "LATE").length * uniqueOutcomes.filter((item) => item.evidenceType === "NEEDS_REVIEW").length : 0;
  if (reviewItemCount) await recordPanelProductEvent({ name: "review_items_created", properties: { sourceType: "LESSON_OUTCOME", itemCount: reviewItemCount } }, auth.session.role);
  return NextResponse.json({ savedAt: new Date().toISOString(), version: featureFlags.quickLessonClose && parsed.data.complete ? lesson.closeVersion + 1 : lesson.closeVersion, replayed: false, assignmentCreated: Boolean(firstCompletion && parsed.data.assignmentDraft) });
}
