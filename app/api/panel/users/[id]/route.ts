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
      _count: {
        select: {
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
        },
      },
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

  const blockers: string[] = [];
  if (target._count.taughtGroups > 0) blockers.push("aktif/pasif grup sorumluluğu");
  if (target._count.taughtLessons > 0) blockers.push("ders kayıtları");
  if (target._count.createdAssignments > 0) blockers.push("oluşturulmuş ödevler");
  if (target._count.createdMaterials > 0) blockers.push("oluşturulmuş materyaller");
  if (target._count.generatedRecoveryPackages > 0) blockers.push("oluşturulmuş telafi paketleri");
  if (target._count.studentHelpResponses > 0) blockers.push("öğrenci yardım yanıtları");
  if (target._count.requestedMfaResets > 0 || target._count.approvedMfaResets > 0) blockers.push("MFA sıfırlama kayıtları");
  if (target._count.createdCurriculums > 0) blockers.push("oluşturulmuş müfredat sürümleri");
  if (target._count.linkedLessonOutcomes > 0 || target._count.linkedAssignmentOutcomes > 0) blockers.push("kazanım eşleştirme kayıtları");
  if (target._count.createdMockExams > 0) blockers.push("oluşturulmuş deneme analizleri");
  if (target._count.createdPilotCohorts > 0 || target._count.createdOdkPilotRuns > 0) blockers.push("pilot rollout kayıtları");
  if (target._count.createdOdkExamSeries > 0 || target._count.createdOdkExams > 0 || target._count.createdOdkExamVersions > 0 || target._count.uploadedOdkExamFiles > 0) blockers.push("ODK sınav içerik geçmişi");
  if (target._count.odkExamAttempts > 0 || target._count.scoredOdkExamAttempts > 0) blockers.push("ODK deneme sonuçları");

  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Bu hesapta korunması gereken geçmiş var (${formatDeleteBlockers(blockers)}). Silmek yerine askıya alın.` },
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
