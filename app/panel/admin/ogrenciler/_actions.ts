"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { normalizePhone } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StudentStatus } from "@prisma/client";
import type { ParentRelationship } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { isParentRelationshipType } from "@/lib/parents";
import {
  generateParentInviteToken,
  defaultParentInviteExpiresAt,
  buildParentInviteUrl,
} from "@/lib/parent-invites";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { notifyAdmins, notifyUser, getParentUserIdsForStudent } from "@/lib/notifications";
import {
  createUserAccountForStudent,
  findStudentDuplicates,
  regenerateUserInvite,
  revokeUserInvite,
  disableUserAccount,
  enableUserAccount,
  forceUserPasswordChange,
  type AccountCreateMode,
} from "@/lib/panel/account-onboarding";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(v: string): string | null { return v.length === 0 ? null : v; }
function isAccountMode(s: string): s is AccountCreateMode {
  return s === "none" || s === "invite" || s === "tempPassword";
}

/**
 * Reads the structured `relationshipType` (Phase 1.5 enum) from FormData and
 * the optional `relationship` free-text fallback. Returns both so the caller
 * can store them. If `relationshipType` is missing/invalid, the form may be
 * a legacy submission — we keep the old free-text path working.
 */
function readRelationship(fd: FormData): {
  relationshipType: ParentRelationship | null;
  relationship: string | null;
} {
  const raw = readStr(fd, "relationshipType");
  const free = readStr(fd, "relationship");
  if (isParentRelationshipType(raw)) {
    return { relationshipType: raw as ParentRelationship, relationship: opt(free) };
  }
  // Legacy: only free text was sent.
  return { relationshipType: null, relationship: opt(free) };
}

export async function createStudentAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");

  // Phase 2 / Session 17 abuse hardening — 60 student creates / 10 min /
  // admin is far above any human workflow but blocks scripted abuse.
  await enforceMutation({
    action: "studentLifecycle.create",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 60, windowMs: 10 * 60_000 },
  });

  // ─── 1. Read + validate identity ─────────────────────────────────────
  const fullName = readStr(fd, "fullName");
  const phoneRaw = readStr(fd, "phone");
  if (!fullName || !phoneRaw) throw new Error("Ad ve telefon zorunlu");
  const phoneKey = normalizePhone(phoneRaw);
  const email = opt(readStr(fd, "email"));

  // ─── 2. Duplicate detection (BEFORE insert) ──────────────────────────
  const dupes = await findStudentDuplicates({ phoneKey, email: email?.toLowerCase() ?? null });
  if (dupes.length > 0) {
    const detail = dupes
      .map((d) => `${d.entity} "${d.existingLabel}" (${d.field})`)
      .join(", ");
    throw new Error(`Duplicate kayıt: ${detail}. Mevcut kaydı güncelleyin veya farklı bir telefon/email girin.`);
  }

  // ─── 3. Read remaining sections ──────────────────────────────────────
  const classroomId = opt(readStr(fd, "classroomId"));
  const parentId = opt(readStr(fd, "parentId"));
  const packageId = opt(readStr(fd, "packageId"));
  const tagId = opt(readStr(fd, "tagId"));
  const accountModeRaw = readStr(fd, "accountMode") || "invite";
  const accountMode: AccountCreateMode = isAccountMode(accountModeRaw) ? accountModeRaw : "invite";

  // ─── 4. Create the student row first ─────────────────────────────────
  const created = await prisma.student.create({
    data: {
      fullName,
      phone: phoneRaw,
      phoneKey,
      email,
      city:         opt(readStr(fd, "city")),
      district:     opt(readStr(fd, "district")),
      schoolName:   opt(readStr(fd, "schoolName")),
      classLevel:   opt(readStr(fd, "classLevel")),
      department:   opt(readStr(fd, "department")),
      examType:     opt(readStr(fd, "examType")),
      currentLevel: opt(readStr(fd, "currentLevel")),
      targetGoal:   opt(readStr(fd, "targetGoal")),
      targetSchool: opt(readStr(fd, "targetSchool")),
      targetRanking: opt(readStr(fd, "targetRanking")),
      source:       opt(readStr(fd, "source")),
      notes:        opt(readStr(fd, "notes")),
      status: (readStr(fd, "status") as StudentStatus) || "NEW",
    },
    select: { id: true },
  });

  // ─── 5. Optional account (invite or temp password) ───────────────────
  let accountResult: Awaited<ReturnType<typeof createUserAccountForStudent>> | null = null;
  if (accountMode !== "none") {
    if (!email) {
      // Roll back so the admin isn't left with a halfway record.
      await prisma.student.delete({ where: { id: created.id } });
      throw new Error("Hesap oluşturmak için email zorunlu. Email alanını doldurun veya 'Hesap oluşturma' modunu seçin.");
    }
    try {
      accountResult = await createUserAccountForStudent({
        studentId: created.id,
        email,
        fullName,
        mode: accountMode,
        actorUserId: ctx.userId,
      });
    } catch (err) {
      // Roll back the student so we don't leave orphan records.
      await prisma.student.delete({ where: { id: created.id } }).catch(() => {});
      throw err;
    }
  }

  // ─── 6. Optional classroom assignment ────────────────────────────────
  if (classroomId) {
    await prisma.classroomStudent.create({ data: { classroomId, studentId: created.id } });
  }

  // ─── 7. Optional parent linking ──────────────────────────────────────
  if (parentId) {
    const rel = readRelationship(fd);
    await prisma.parentStudent.create({
      data: {
        parentId,
        studentId: created.id,
        relationship: rel.relationship,
        relationshipType: rel.relationshipType,
        isPrimary: fd.get("parentIsPrimary") === "on",
      },
    });
  }

  // ─── 8. Optional package assignment ──────────────────────────────────
  if (packageId) {
    await prisma.studentPackage.create({
      data: { studentId: created.id, packageId, assignedById: ctx.userId },
    });
  }

  // ─── 9. Optional tag assignment ──────────────────────────────────────
  if (tagId) {
    await prisma.studentTag.create({
      data: { studentId: created.id, tagId, assignedById: ctx.userId },
    });
  }

  // ─── 10. Audit + notifications ───────────────────────────────────────
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: created.id,
    action: "STUDENT_CREATE",
    summary: fullName,
    payload: {
      phoneKey,
      email,
      classroomId,
      parentId,
      packageId,
      tagId,
      accountMode,
      userId: accountResult && "userId" in accountResult ? accountResult.userId : null,
    },
  });
  await notifyAdmins({
    type: "SYSTEM",
    title: "Yeni öğrenci eklendi",
    body: `${fullName} (${phoneRaw})`,
    relatedEntityType: "Student",
    relatedEntityId: created.id,
  });

  revalidatePath("/panel/admin/ogrenciler");
  revalidatePath(`/panel/admin/ogrenciler/${created.id}`);
  redirect(`/panel/admin/ogrenciler/${created.id}`);
}

export async function updateStudentAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Ad zorunlu");
  await prisma.student.update({
    where: { id },
    data: {
      fullName,
      email: opt(readStr(fd, "email")),
      city: opt(readStr(fd, "city")),
      district: opt(readStr(fd, "district")),
      schoolName: opt(readStr(fd, "schoolName")),
      classLevel: opt(readStr(fd, "classLevel")),
      examType: opt(readStr(fd, "examType")),
      targetGoal: opt(readStr(fd, "targetGoal")),
      status: (readStr(fd, "status") as StudentStatus) || "NEW",
      notes: opt(readStr(fd, "notes")),
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: id,
    action: "STUDENT_UPDATE",
    summary: fullName,
  });
  revalidatePath(`/panel/admin/ogrenciler/${id}`);
  revalidatePath("/panel/admin/ogrenciler");
}

export async function deleteStudentAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const existing = await prisma.student.findUnique({
    where: { id },
    select: { fullName: true, phoneKey: true, email: true },
  });
  await prisma.student.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: id,
    action: "STUDENT_DELETE",
    summary: existing?.fullName || id,
    payload: {
      phoneKey: existing?.phoneKey,
      email: existing?.email,
      kvkkHardDelete: true,
    },
  });
  revalidatePath("/panel/admin/ogrenciler");
  redirect("/panel/admin/ogrenciler");
}

// ─── Relations ───────────────────────────────────────────────────────────────

export async function assignStudentToClassroomAction(studentId: string, fd: FormData) {
  await requirePanelRole("admin");
  const classroomId = readStr(fd, "classroomId");
  if (!classroomId) throw new Error("Sınıf zorunlu");
  await prisma.classroomStudent.upsert({
    where: { classroomId_studentId: { classroomId, studentId } },
    update: {},
    create: { classroomId, studentId },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
}

export async function removeStudentFromClassroomAction(studentId: string, classroomId: string) {
  await requirePanelRole("admin");
  await prisma.classroomStudent.delete({
    where: { classroomId_studentId: { classroomId, studentId } },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
}

export async function assignPackageToStudentAction(studentId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const packageId = readStr(fd, "packageId");
  if (!packageId) throw new Error("Paket zorunlu");
  await prisma.studentPackage.upsert({
    where: { studentId_packageId: { studentId, packageId } },
    update: { revokedAt: null, notes: opt(readStr(fd, "notes")) },
    create: {
      studentId, packageId,
      assignedById: ctx.userId,
      notes: opt(readStr(fd, "notes")),
    },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function removePackageFromStudentAction(studentId: string, packageId: string) {
  await requirePanelRole("admin");
  await prisma.studentPackage.delete({
    where: { studentId_packageId: { studentId, packageId } },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function linkParentToStudentAction(studentId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const parentId = readStr(fd, "parentId");
  if (!parentId) throw new Error("Veli zorunlu");
  const rel = readRelationship(fd);
  const isPrimary = fd.get("isPrimary") === "on";
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: {
      relationship: rel.relationship,
      relationshipType: rel.relationshipType,
      isPrimary,
    },
    create: {
      parentId, studentId,
      relationship: rel.relationship,
      relationshipType: rel.relationshipType,
      isPrimary,
    },
  });
  // Audit + notify parent (if they have a user account) and admins.
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { fullName: true, userId: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: studentId,
    action: "STUDENT_PARENT_LINK",
    summary: parent?.fullName ?? parentId,
    payload: { parentId, relationshipType: rel.relationshipType, isPrimary },
  });
  if (parent?.userId) {
    await notifyUser({
      userId: parent.userId,
      type: "SYSTEM",
      title: "Yeni öğrenci bağlandı",
      body: `${parent.fullName} adına bir öğrenci hesabına bağlandınız.`,
      relatedEntityType: "Student",
      relatedEntityId: studentId,
    });
  }
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
}

export async function unlinkParentFromStudentAction(studentId: string, parentId: string) {
  await requirePanelRole("admin");
  await prisma.parentStudent.delete({
    where: { parentId_studentId: { parentId, studentId } },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
}

/**
 * Create a brand-new Parent and immediately link it to a student. Used by the
 * smart parent linking flow (ParentLinkCard) when admin types a name that
 * doesn't match any existing parent and clicks "+ Yeni veli oluştur".
 *
 * If a parent with the same normalized phone already exists, we link the
 * existing one instead of creating a duplicate (idempotent).
 */
export async function createParentAndLinkAction(studentId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Veli adı zorunlu");

  const phoneRaw = readStr(fd, "phone");
  const phoneKey = phoneRaw ? normalizePhone(phoneRaw) : null;
  const email = opt(readStr(fd, "email"));
  const rel = readRelationship(fd);
  const isPrimary = fd.get("isPrimary") === "on";

  // Idempotent: phoneKey is unique. Reuse if exists.
  let parent = phoneKey
    ? await prisma.parent.findUnique({ where: { phoneKey }, select: { id: true } })
    : null;
  if (!parent && email) {
    parent = await prisma.parent.findUnique({ where: { email }, select: { id: true } });
  }
  if (!parent) {
    parent = await prisma.parent.create({
      data: {
        fullName,
        phone: phoneRaw || null,
        phoneKey,
        email,
      },
      select: { id: true },
    });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "Parent",
      entityId: parent.id,
      action: "PARENT_CREATE",
      summary: fullName,
      payload: { phoneKey, email, viaStudentLink: studentId },
    });
  }

  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId } },
    update: {
      relationship: rel.relationship,
      relationshipType: rel.relationshipType,
      isPrimary,
    },
    create: {
      parentId: parent.id, studentId,
      relationship: rel.relationship,
      relationshipType: rel.relationshipType,
      isPrimary,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: studentId,
    action: "STUDENT_PARENT_LINK",
    summary: fullName,
    payload: { parentId: parent.id, relationship: rel.relationship, relationshipType: rel.relationshipType, isPrimary, created: true },
  });

  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
  revalidatePath(`/panel/admin/veliler/${parent.id}/duzenle`);
}

// ── Parent invite (Phase 1.5 — D3) ──────────────────────────────────────

/**
 * Create or rotate a parent's invite token. Marks `parentInviteSentAt` to
 * "now" so the onboarding state derives as INVITE_PENDING. Returns the URL
 * the admin can copy/paste — no email/WhatsApp provider is invoked here.
 */
export async function regenerateParentInviteAction(parentId: string): Promise<{
  ok: true; token: string; url: string; expiresAt: Date;
}> {
  const ctx = await requirePanelRole("admin");
  // Phase 2 / Session 17 — abuse hardening: per-admin rate-limit + same-origin.
  // 30 token rotation / saat — operatif iş için bol, brute-force token tahmini için sıkı.
  await enforceMutation({
    action: "parent-invite.generate",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60 * 60_000 },
  });
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { id: true, fullName: true, phone: true, email: true },
  });
  if (!parent) throw new Error("Veli bulunamadı");

  const token = generateParentInviteToken();
  const expiresAt = defaultParentInviteExpiresAt();
  await prisma.parent.update({
    where: { id: parentId },
    data: {
      parentInviteToken: token,
      parentInviteTokenExpiresAt: expiresAt,
      parentInviteSentAt: new Date(),
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: parentId,
    action: "PARENT_INVITE_GENERATE",
    summary: parent.fullName,
    payload: { expiresAt: expiresAt.toISOString() },
  });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  return { ok: true, token, url: buildParentInviteUrl(token), expiresAt };
}

/** Revoke an active invite token (parent decided not to onboard yet). */
export async function revokeParentInviteAction(parentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  await prisma.parent.update({
    where: { id: parentId },
    data: {
      parentInviteToken: null,
      parentInviteTokenExpiresAt: null,
      parentInviteSentAt: null,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: parentId,
    action: "PARENT_INVITE_REVOKE",
    summary: parentId,
  });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  return { ok: true };
}

// ── Phase 3 / Session 1 — Student account actions ───────────────────────

/**
 * Create a User account for an existing student that has none yet.
 * Used by the onboarding card on `/panel/admin/ogrenciler/[id]`.
 */
export async function createStudentAccountAction(
  studentId: string,
  fd: FormData,
): Promise<{ ok: true; mode: AccountCreateMode; url?: string; tempPassword?: string }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "student-account.create",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60 * 60_000 },
  });

  const modeRaw = readStr(fd, "mode") || "invite";
  const mode: AccountCreateMode = isAccountMode(modeRaw) ? modeRaw : "invite";

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { fullName: true, email: true, userId: true },
  });
  if (!student) throw new Error("Öğrenci bulunamadı");
  if (student.userId) throw new Error("Bu öğrencinin zaten bir hesabı var");
  if (!student.email) throw new Error("Hesap oluşturmak için öğrencinin email'i olmalı");

  const result = await createUserAccountForStudent({
    studentId,
    email: student.email,
    fullName: student.fullName,
    mode,
    actorUserId: ctx.userId,
  });

  revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
  if (result.mode === "invite") return { ok: true, mode: "invite", url: result.url };
  if (result.mode === "tempPassword") return { ok: true, mode: "tempPassword", tempPassword: result.tempPassword };
  return { ok: true, mode: "none" };
}

/** Rotate an active invite or issue a fresh one for the student's user. */
export async function regenerateStudentInviteAction(
  studentId: string,
): Promise<{ ok: true; url: string; expiresAt: Date }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "student-invite.generate",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60 * 60_000 },
  });
  const s = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!s?.userId) throw new Error("Öğrencinin hesabı yok — önce hesap oluşturun");
  const r = await regenerateUserInvite({ userId: s.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
  return { ok: true, url: r.url, expiresAt: r.expiresAt };
}

export async function revokeStudentInviteAction(studentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  const s = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!s?.userId) throw new Error("Öğrencinin hesabı yok");
  await revokeUserInvite({ userId: s.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
  return { ok: true };
}

export async function disableStudentAccountAction(studentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "student-account.toggle",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60 * 60_000 },
  });
  const s = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!s?.userId) throw new Error("Öğrencinin hesabı yok");
  await disableUserAccount({ userId: s.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
  return { ok: true };
}

export async function enableStudentAccountAction(studentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "student-account.toggle",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60 * 60_000 },
  });
  const s = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!s?.userId) throw new Error("Öğrencinin hesabı yok");
  await enableUserAccount({ userId: s.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
  return { ok: true };
}

export async function forceStudentPasswordChangeAction(studentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  const s = await prisma.student.findUnique({
    where: { id: studentId },
    select: { userId: true },
  });
  if (!s?.userId) throw new Error("Öğrencinin hesabı yok");
  await forceUserPasswordChange({ userId: s.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}`);
  return { ok: true };
}
