"use server";
/**
 * Phase 3 / Session 4 — Teacher operational CRUD + account lifecycle.
 *
 * Reuses Phase 3 / Session 1–3 shared helpers from
 * `lib/panel/account-onboarding.ts`. No invite/temp-password logic is
 * duplicated here.
 *
 * Admin-only for teacher writes; account, classroom and compensation
 * mutations all log audit and revalidate the relevant pages.
 */
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { TeacherStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { notifyUser } from "@/lib/notifications";
import {
  createUserAccountForTeacher,
  findTeacherDuplicates,
  regenerateUserInvite,
  revokeUserInvite,
  disableUserAccount,
  enableUserAccount,
  forceUserPasswordChange,
  generateTemporaryPassword,
  type AccountCreateMode,
  type DuplicateMatch,
} from "@/lib/panel/account-onboarding";

// ─── Helpers ────────────────────────────────────────────────────────────────

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(v: string): string | null {
  return v.length === 0 ? null : v;
}
function isAccountMode(s: string): s is AccountCreateMode {
  return s === "none" || s === "invite" || s === "tempPassword";
}
function parseAmountToKurus(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
function parseDateOrNull(input: string): Date | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

const LIST_PATH = "/panel/admin/ogretmenler";
function detailPath(id: string) {
  return `/panel/admin/ogretmenler/${id}/duzenle`;
}

// ─── Basic CRUD ─────────────────────────────────────────────────────────────

export async function createTeacherAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  const subjects = readStr(fd, "subjects");
  if (!fullName || !subjects) throw new Error("Ad ve branş zorunlu");
  const email = readStr(fd, "email").toLowerCase() || null;
  if (email) {
    const e = await prisma.teacher.findUnique({ where: { email }, select: { id: true } });
    if (e) throw new Error("Bu email ile kayıtlı öğretmen zaten var");
  }
  const created = await prisma.teacher.create({
    data: {
      fullName,
      subjects,
      email,
      phone: opt(readStr(fd, "phone")),
      bio: opt(readStr(fd, "bio")),
      status: (readStr(fd, "status") as TeacherStatus) || "ACTIVE",
    },
    select: { id: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Teacher",
    entityId: created.id,
    action: "TEACHER_CREATE",
    summary: fullName,
    payload: { email, subjects },
  });
  revalidatePath(LIST_PATH);
}

export async function updateTeacherAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  const subjects = readStr(fd, "subjects");
  if (!fullName || !subjects) throw new Error("Ad ve branş zorunlu");
  const email = readStr(fd, "email").toLowerCase() || null;
  if (email) {
    const e = await prisma.teacher.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
    if (e) throw new Error("Bu email ile kayıtlı başka öğretmen var");
  }
  await prisma.teacher.update({
    where: { id },
    data: {
      fullName,
      subjects,
      email,
      phone: opt(readStr(fd, "phone")),
      bio: opt(readStr(fd, "bio")),
      status: (readStr(fd, "status") as TeacherStatus) || "ACTIVE",
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Teacher",
    entityId: id,
    action: "TEACHER_UPDATE",
    summary: fullName,
  });
  revalidatePath(LIST_PATH);
  revalidatePath(detailPath(id));
}

export async function deleteTeacherAction(id: string) {
  const ctx = await requirePanelRole("admin");
  await prisma.teacher.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Teacher",
    entityId: id,
    action: "TEACHER_DELETE",
    summary: id,
  });
  revalidatePath(LIST_PATH);
}

// ─── Classroom assignments ──────────────────────────────────────────────────

export async function assignClassroomToTeacherAction(teacherId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const classroomId = readStr(fd, "classroomId");
  if (!classroomId) throw new Error("Sınıf zorunlu");
  const isLead = fd.get("isLead") === "on";
  const subject = opt(readStr(fd, "subject"));
  await prisma.classroomTeacher.upsert({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    update: { isLead, subject },
    create: { classroomId, teacherId, isLead, subject },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Teacher",
    entityId: teacherId,
    action: "TEACHER_CLASSROOM_ASSIGN",
    summary: `${teacherId} -> ${classroomId}`,
    payload: { classroomId, isLead, subject },
  });
  revalidatePath(detailPath(teacherId));
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
}

export async function updateClassroomAssignmentAction(
  teacherId: string,
  classroomId: string,
  fd: FormData,
) {
  const ctx = await requirePanelRole("admin");
  const isLead = fd.get("isLead") === "on";
  const subject = opt(readStr(fd, "subject"));
  await prisma.classroomTeacher.update({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    data: { isLead, subject },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Teacher",
    entityId: teacherId,
    action: "TEACHER_CLASSROOM_UPDATE",
    summary: `${teacherId} -> ${classroomId}`,
    payload: { isLead, subject },
  });
  revalidatePath(detailPath(teacherId));
}

export async function removeClassroomFromTeacherAction(teacherId: string, classroomId: string) {
  const ctx = await requirePanelRole("admin");
  await prisma.classroomTeacher.delete({
    where: { classroomId_teacherId: { classroomId, teacherId } },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Teacher",
    entityId: teacherId,
    action: "TEACHER_CLASSROOM_REMOVE",
    summary: `${teacherId} -> ${classroomId}`,
    payload: { classroomId },
  });
  revalidatePath(detailPath(teacherId));
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
}

// ─── Account lifecycle ──────────────────────────────────────────────────────

export async function createTeacherAccountAction(
  teacherId: string,
  fd: FormData,
): Promise<{ ok: true; mode: AccountCreateMode; url?: string; tempPassword?: string }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "teacher-account.create",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60 * 60_000 },
  });
  const modeRaw = readStr(fd, "mode") || "invite";
  const mode: AccountCreateMode = isAccountMode(modeRaw) ? modeRaw : "invite";
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { fullName: true, email: true, userId: true },
  });
  if (!teacher) throw new Error("Öğretmen bulunamadı");
  if (teacher.userId) throw new Error("Bu öğretmenin zaten bir hesabı var");
  if (!teacher.email) throw new Error("Hesap oluşturmak için öğretmenin email'i olmalı");
  const result = await createUserAccountForTeacher({
    teacherId,
    email: teacher.email,
    fullName: teacher.fullName,
    mode,
    actorUserId: ctx.userId,
  });
  revalidatePath(detailPath(teacherId));
  if (result.mode === "invite") return { ok: true, mode: "invite", url: result.url };
  if (result.mode === "tempPassword") return { ok: true, mode: "tempPassword", tempPassword: result.tempPassword };
  return { ok: true, mode: "none" };
}

export async function regenerateTeacherUserInviteAction(
  teacherId: string,
): Promise<{ ok: true; url: string; expiresAt: Date }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "teacher-account.invite",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60 * 60_000 },
  });
  const t = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
  if (!t?.userId) throw new Error("Öğretmenin hesabı yok — önce hesap oluşturun");
  const r = await regenerateUserInvite({ userId: t.userId, actorUserId: ctx.userId });
  revalidatePath(detailPath(teacherId));
  return { ok: true, url: r.url, expiresAt: r.expiresAt };
}

export async function revokeTeacherUserInviteAction(teacherId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  const t = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
  if (!t?.userId) throw new Error("Öğretmenin hesabı yok");
  await revokeUserInvite({ userId: t.userId, actorUserId: ctx.userId });
  revalidatePath(detailPath(teacherId));
  return { ok: true };
}

export async function disableTeacherAccountAction(teacherId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "teacher-account.toggle",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60 * 60_000 },
  });
  const t = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
  if (!t?.userId) throw new Error("Öğretmenin hesabı yok");
  await disableUserAccount({ userId: t.userId, actorUserId: ctx.userId });
  revalidatePath(detailPath(teacherId));
  return { ok: true };
}

export async function enableTeacherAccountAction(teacherId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "teacher-account.toggle",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60 * 60_000 },
  });
  const t = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
  if (!t?.userId) throw new Error("Öğretmenin hesabı yok");
  await enableUserAccount({ userId: t.userId, actorUserId: ctx.userId });
  revalidatePath(detailPath(teacherId));
  return { ok: true };
}

export async function forceTeacherPasswordChangeAction(teacherId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  const t = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
  if (!t?.userId) throw new Error("Öğretmenin hesabı yok");
  await forceUserPasswordChange({ userId: t.userId, actorUserId: ctx.userId });
  revalidatePath(detailPath(teacherId));
  return { ok: true };
}

export async function resetTeacherTempPasswordAction(
  teacherId: string,
): Promise<{ ok: true; tempPassword: string }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "teacher-account.temp-password",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60 * 60_000 },
  });
  const t = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true, fullName: true },
  });
  if (!t?.userId) throw new Error("Öğretmenin hesabı yok");
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({
    where: { id: t.userId },
    data: { passwordHash, mustChangePassword: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "User",
    entityId: t.userId,
    action: "USER_TEMP_PASSWORD_RESET",
    summary: t.fullName,
    payload: { teacherId },
  });
  await notifyUser({
    userId: t.userId,
    type: "ANNOUNCEMENT",
    title: "Geçici şifreniz oluşturuldu",
    body: "İlk girişte şifrenizi değiştirmeniz gerekecek.",
    relatedEntityType: "User",
    relatedEntityId: t.userId,
  });
  revalidatePath(detailPath(teacherId));
  return { ok: true, tempPassword };
}

// ─── Compensation rules ─────────────────────────────────────────────────────

export async function createTeacherCompensationRuleAction(
  teacherId: string,
  fd: FormData,
): Promise<{ ok: true; id: string }> {
  const ctx = await requirePanelRole("admin");
  const hourlyRate = parseAmountToKurus(readStr(fd, "hourlyRate"));
  if (hourlyRate === null || hourlyRate <= 0) throw new Error("Saatlik ücret pozitif olmalı");
  const courseId = opt(readStr(fd, "courseId"));
  const classroomId = opt(readStr(fd, "classroomId"));
  const startsAt = parseDateOrNull(readStr(fd, "startsAt"));
  const endsAt = parseDateOrNull(readStr(fd, "endsAt"));
  if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
    throw new Error("Başlangıç tarihi bitiş tarihinden sonra olamaz");
  }
  const note = opt(readStr(fd, "note"));

  // Detect identical active rule (same teacher+course+classroom+rate, both active)
  const dup = await prisma.teacherCompensationRule.findFirst({
    where: {
      teacherId,
      courseId,
      classroomId,
      hourlyRate,
      isActive: true,
    },
    select: { id: true },
  });
  if (dup) {
    throw new Error("Aynı kapsamda ve aynı ücretli aktif bir kural zaten var");
  }

  const created = await prisma.teacherCompensationRule.create({
    data: {
      teacherId,
      courseId,
      classroomId,
      hourlyRate,
      isActive: true,
      startsAt,
      endsAt,
      note,
      createdById: ctx.userId,
    },
    select: { id: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherCompensationRule",
    entityId: created.id,
    action: "PAYROLL_RULE_CREATE",
    payload: { teacherId, hourlyRate, courseId, classroomId },
  });
  revalidatePath(detailPath(teacherId));
  revalidatePath("/panel/admin/ogretmen-hakedisleri/kurallar");
  return { ok: true, id: created.id };
}

export async function deactivateTeacherCompensationRuleAction(
  teacherId: string,
  ruleId: string,
): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  await prisma.teacherCompensationRule.update({
    where: { id: ruleId },
    data: { isActive: false },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherCompensationRule",
    entityId: ruleId,
    action: "PAYROLL_RULE_DEACTIVATE",
    payload: { teacherId },
  });
  revalidatePath(detailPath(teacherId));
  revalidatePath("/panel/admin/ogretmen-hakedisleri/kurallar");
  return { ok: true };
}

// ─── Duplicate lookup (for the wizard, debounced from the client) ───────────

export async function lookupTeacherDuplicatesAction(opts: {
  phone: string;
  email: string;
  fullName: string;
  excludeTeacherId?: string;
}): Promise<DuplicateMatch[]> {
  await requirePanelRole("admin");
  return findTeacherDuplicates({
    phone: opts.phone || null,
    email: opts.email || null,
    fullName: opts.fullName || null,
    excludeTeacherId: opts.excludeTeacherId,
  });
}

// ─── Atomic create-with-account wizard action ───────────────────────────────

export type TeacherCreateResult = {
  ok: true;
  teacherId: string;
  accountMode: AccountCreateMode;
  inviteUrl?: string;
  tempPassword?: string;
  classroomIds: string[];
  compensationRuleId?: string;
  duplicates: DuplicateMatch[];
};

export async function createTeacherWithAccountAction(fd: FormData): Promise<TeacherCreateResult> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "teacher.create",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 60, windowMs: 10 * 60_000 },
  });

  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Ad Soyad zorunlu");
  const subjects = readStr(fd, "subjects");
  if (!subjects) throw new Error("Branş zorunlu");
  const phoneRaw = readStr(fd, "phone");
  const emailLower = readStr(fd, "email").toLowerCase() || null;
  const bio = readStr(fd, "bio") || null;
  const status = (readStr(fd, "status") as TeacherStatus) || "ACTIVE";

  const modeRaw = readStr(fd, "accountMode") || "none";
  const accountMode: AccountCreateMode = isAccountMode(modeRaw) ? modeRaw : "none";
  if (accountMode !== "none" && !emailLower) {
    throw new Error("Hesap oluşturmak için email zorunlu");
  }

  const duplicates = await findTeacherDuplicates({
    phone: phoneRaw || null,
    email: emailLower,
    fullName,
  });
  const blocking = duplicates.filter(
    (d) =>
      (d.entity === "Teacher" && d.field === "email") ||
      (d.entity === "User" && accountMode !== "none"),
  );
  if (blocking.length > 0) {
    const labels = blocking.map((d) => `${d.entity}#${d.existingId} (${d.existingLabel})`).join(", ");
    throw new Error(`Çakışan kayıt mevcut: ${labels}. Mevcut kaydı kullanın.`);
  }

  const teacher = await prisma.teacher.create({
    data: {
      fullName,
      subjects,
      email: emailLower,
      phone: phoneRaw || null,
      bio,
      status,
    },
    select: { id: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Teacher",
    entityId: teacher.id,
    action: "TEACHER_CREATE",
    summary: fullName,
    payload: { email: emailLower, subjects, accountMode },
  });

  // Account
  let inviteUrl: string | undefined;
  let tempPassword: string | undefined;
  let createdUserId: string | null = null;
  const accountDisabled = readStr(fd, "accountDisabled") === "on";
  if (accountMode !== "none" && emailLower) {
    const acc = await createUserAccountForTeacher({
      teacherId: teacher.id,
      email: emailLower,
      fullName,
      mode: accountMode,
      actorUserId: ctx.userId,
    });
    if (acc.mode === "invite") {
      inviteUrl = acc.url;
      createdUserId = acc.userId;
    }
    if (acc.mode === "tempPassword") {
      tempPassword = acc.tempPassword;
      createdUserId = acc.userId;
    }
    if (accountDisabled && createdUserId) {
      await disableUserAccount({ userId: createdUserId, actorUserId: ctx.userId });
    }
  }

  // Classrooms (multi)
  const classroomIdsRaw = fd.getAll("classroomIds").map((v) => String(v)).filter(Boolean);
  const classroomIds: string[] = [];
  if (classroomIdsRaw.length > 0) {
    const isLead = fd.get("isLead") === "on";
    const subjectForAll = opt(readStr(fd, "classroomSubject"));
    for (const cid of classroomIdsRaw) {
      await prisma.classroomTeacher.upsert({
        where: { classroomId_teacherId: { classroomId: cid, teacherId: teacher.id } },
        update: {},
        create: {
          classroomId: cid,
          teacherId: teacher.id,
          isLead: isLead && classroomIds.length === 0, // only first gets lead
          subject: subjectForAll,
        },
      });
      classroomIds.push(cid);
    }
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "Teacher",
      entityId: teacher.id,
      action: "TEACHER_CLASSROOM_ASSIGN_BATCH",
      summary: `${fullName} -> ${classroomIds.length} sınıf`,
      payload: { classroomIds, isLead, subject: subjectForAll },
    });
  }

  // Compensation rule (optional)
  let compensationRuleId: string | undefined;
  const rateRaw = readStr(fd, "compHourlyRate");
  if (rateRaw) {
    const hourlyRate = parseAmountToKurus(rateRaw);
    if (hourlyRate !== null && hourlyRate > 0) {
      const courseId = opt(readStr(fd, "compCourseId"));
      const classroomId = opt(readStr(fd, "compClassroomId"));
      const startsAt = parseDateOrNull(readStr(fd, "compStartsAt"));
      const note = opt(readStr(fd, "compNote"));
      const rule = await prisma.teacherCompensationRule.create({
        data: {
          teacherId: teacher.id,
          courseId,
          classroomId,
          hourlyRate,
          isActive: true,
          startsAt,
          note,
          createdById: ctx.userId,
        },
        select: { id: true },
      });
      compensationRuleId = rule.id;
      await logAudit({
        actorUserId: ctx.userId,
        entityType: "TeacherCompensationRule",
        entityId: rule.id,
        action: "PAYROLL_RULE_CREATE",
        payload: { teacherId: teacher.id, hourlyRate, courseId, classroomId, viaWizard: true },
      });
    }
  }

  revalidatePath(LIST_PATH);
  revalidatePath(detailPath(teacher.id));

  if (readStr(fd, "intent") === "save-and-go") {
    redirect(detailPath(teacher.id));
  }

  return {
    ok: true,
    teacherId: teacher.id,
    accountMode,
    inviteUrl,
    tempPassword,
    classroomIds,
    compensationRuleId,
    duplicates,
  };
}
