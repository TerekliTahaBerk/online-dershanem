import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email";
import { revokeAllUserSessions } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().min(3).max(254), fullName: z.string().trim().max(120).optional(), phone: z.string().trim().max(32).optional(),
  classLevel: z.string().trim().max(40).optional(), schoolName: z.string().trim().max(160).optional(), targetGoal: z.string().trim().max(500).optional(),
  subjects: z.array(z.string().trim().min(1).max(80)).max(20).optional(), bio: z.string().trim().max(1200).optional(),
});

const USER_DELETE_COUNT_SELECT = {
  taughtGroups: true,
  taughtLessons: true,
  createdAssignments: true,
  createdMaterials: true,
  generatedRecoveryPackages: true,
  studentHelpResponses: true,
  requestedMfaResets: true,
  approvedMfaResets: true,
  createdCurriculums: true,
  linkedLessonOutcomes: true,
  linkedAssignmentOutcomes: true,
  createdMockExams: true,
  createdPilotCohorts: true,
  createdOdkPilotRuns: true,
  createdOdkExamSeries: true,
  createdOdkExams: true,
  createdOdkExamVersions: true,
  uploadedOdkExamFiles: true,
  odkExamAttempts: true,
  scoredOdkExamAttempts: true,
} as const;

type DeleteBlocker = {
  code: string;
  label: string;
  count: number;
};

type DeleteCountSnapshot = Prisma.UserGetPayload<{
  select: { _count: { select: typeof USER_DELETE_COUNT_SELECT } };
}>["_count"];

function collectDeleteBlockers(counts: DeleteCountSnapshot): DeleteBlocker[] {
  const blockers: DeleteBlocker[] = [];
  if (counts.taughtGroups > 0) blockers.push({ code: "taught_groups", label: "aktif/pasif grup sorumluluğu", count: counts.taughtGroups });
  if (counts.taughtLessons > 0) blockers.push({ code: "taught_lessons", label: "ders kayıtları", count: counts.taughtLessons });
  if (counts.createdAssignments > 0) blockers.push({ code: "created_assignments", label: "oluşturulmuş ödevler", count: counts.createdAssignments });
  if (counts.createdMaterials > 0) blockers.push({ code: "created_materials", label: "oluşturulmuş materyaller", count: counts.createdMaterials });
  if (counts.generatedRecoveryPackages > 0) blockers.push({ code: "recovery_packages", label: "oluşturulmuş telafi paketleri", count: counts.generatedRecoveryPackages });
  if (counts.studentHelpResponses > 0) blockers.push({ code: "student_help_responses", label: "öğrenci yardım yanıtları", count: counts.studentHelpResponses });
  if (counts.requestedMfaResets > 0 || counts.approvedMfaResets > 0) blockers.push({ code: "mfa_resets", label: "MFA sıfırlama kayıtları", count: counts.requestedMfaResets + counts.approvedMfaResets });
  if (counts.createdCurriculums > 0) blockers.push({ code: "created_curriculums", label: "oluşturulmuş müfredat sürümleri", count: counts.createdCurriculums });
  if (counts.linkedLessonOutcomes > 0 || counts.linkedAssignmentOutcomes > 0) blockers.push({ code: "outcome_links", label: "kazanım eşleştirme kayıtları", count: counts.linkedLessonOutcomes + counts.linkedAssignmentOutcomes });
  if (counts.createdMockExams > 0) blockers.push({ code: "mock_exams", label: "oluşturulmuş deneme analizleri", count: counts.createdMockExams });
  if (counts.createdPilotCohorts > 0 || counts.createdOdkPilotRuns > 0) blockers.push({ code: "pilot_rollout", label: "pilot rollout kayıtları", count: counts.createdPilotCohorts + counts.createdOdkPilotRuns });
  if (counts.createdOdkExamSeries > 0 || counts.createdOdkExams > 0 || counts.createdOdkExamVersions > 0 || counts.uploadedOdkExamFiles > 0) blockers.push({ code: "odk_exam_content", label: "ODK sınav içerik geçmişi", count: counts.createdOdkExamSeries + counts.createdOdkExams + counts.createdOdkExamVersions + counts.uploadedOdkExamFiles });
  if (counts.odkExamAttempts > 0 || counts.scoredOdkExamAttempts > 0) blockers.push({ code: "odk_exam_attempts", label: "ODK deneme sonuçları", count: counts.odkExamAttempts + counts.scoredOdkExamAttempts });
  return blockers;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.users.delete.preview", requireSameOrigin: true, headers: { get: (name: string) => request.headers.get(name) }, rateLimitKey: `panel:users:delete-preview:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });

  const { id } = await context.params;
  if (id === auth.session.userId) {
    return NextResponse.json({ canDelete: false, blockers: [{ code: "self_account", label: "kendi hesabınızı silemezsiniz", count: 1 }], suggestedAction: "SUSPEND" as const });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      _count: { select: USER_DELETE_COUNT_SELECT },
    },
  });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });

  const blockers = collectDeleteBlockers(target._count);
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) blockers.unshift({ code: "last_admin", label: "son yönetici hesabı", count: 1 });
  }

  return NextResponse.json({
    canDelete: blockers.length === 0,
    blockers,
    suggestedAction: blockers.length === 0 ? "DELETE" : "SUSPEND",
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.users.update", requireSameOrigin: true, headers: { get: (name: string) => request.headers.get(name) }, rateLimitKey: `panel:users:update:${auth.session.userId}`, rateLimit: { max: 90, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Profil alanlarını kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  const email = normalizeEmail(parsed.data.email);
  if (!isPlausibleEmail(email)) return NextResponse.json({ error: "E-posta adresi geçerli görünmüyor." }, { status: 400 });
  if (await prisma.user.findFirst({ where: { email, id: { not: id } }, select: { id: true } })) return NextResponse.json({ error: "Bu e-posta başka bir hesapta kullanılıyor." }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { email, fullName: parsed.data.fullName || null, phone: parsed.data.phone || null } });
    if (target.role === "STUDENT") await tx.studentProfile.upsert({ where: { userId: id }, create: { userId: id, classLevel: parsed.data.classLevel || null, schoolName: parsed.data.schoolName || null, targetGoal: parsed.data.targetGoal || null }, update: { classLevel: parsed.data.classLevel || null, schoolName: parsed.data.schoolName || null, targetGoal: parsed.data.targetGoal || null } });
    if (target.role === "TEACHER") await tx.teacherProfile.upsert({ where: { userId: id }, create: { userId: id, subjects: parsed.data.subjects || [], bio: parsed.data.bio || null }, update: { subjects: parsed.data.subjects || [], bio: parsed.data.bio || null } });
  });
  const emailChanged = target.email !== email;
  if (emailChanged) await revokeAllUserSessions(id);
  await logAudit({ actorUserId: auth.session.userId, entityType: "User", entityId: id, action: "panel.user_updated", summary: `${email} profili güncellendi${emailChanged ? "; açık oturumları kapatıldı" : ""}` });
  return NextResponse.json({ ok: true });
}

function formatDeleteBlockers(blockers: string[]): string {
  const shortlist = blockers.slice(0, 4);
  return shortlist.join(", ") + (blockers.length > shortlist.length ? ", …" : "");
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.delete",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:delete:${auth.session.userId}`,
    rateLimit: { max: 20, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const { id } = await context.params;

  if (id === auth.session.userId) {
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      _count: { select: USER_DELETE_COUNT_SELECT },
    },
  });
  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Son yönetici hesabı silinemez. Önce başka bir yönetici hesabı açın." },
        { status: 400 },
      );
    }
  }

  const blockers = collectDeleteBlockers(target._count);

  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Bu hesapta korunması gereken geçmiş var (${formatDeleteBlockers(blockers.map((item) => item.label))}). Silmek yerine askıya alın.` },
      { status: 409 },
    );
  }

  try {
    await prisma.user.delete({ where: { id: target.id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "Bu hesap başka kayıtlar tarafından kullanılıyor. Silmek yerine askıya alın." },
        { status: 409 },
      );
    }
    throw error;
  }

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: target.id,
    action: "panel.user_deleted",
    summary: `${target.email} hesabı silindi`,
    payload: { role: target.role },
  });

  return NextResponse.json({ ok: true });
}
