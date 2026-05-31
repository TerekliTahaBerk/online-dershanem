"use server";
/**
 * Phase 3 / Session 3 — Parent operational CRUD + account lifecycle.
 * Reuses Session 1–2 shared helpers from `lib/panel/account-onboarding.ts`.
 */
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { normalizePhone } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ParentRelationship } from "@prisma/client";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";
import { isParentRelationshipType } from "@/lib/parents";
import { enforceMutation } from "@/lib/security/mutation-guard";
import { notifyUser } from "@/lib/notifications";
import {
  createUserAccountForParent,
  findParentDuplicates,
  regenerateUserInvite,
  revokeUserInvite,
  disableUserAccount,
  enableUserAccount,
  forceUserPasswordChange,
  generateTemporaryPassword,
  type AccountCreateMode,
  type DuplicateMatch,
} from "@/lib/panel/account-onboarding";

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
function readRelationship(fd: FormData): {
  relationshipType: ParentRelationship | null;
  relationship: string | null;
} {
  const raw = readStr(fd, "relationshipType");
  const free = readStr(fd, "relationship");
  if (isParentRelationshipType(raw)) {
    return { relationshipType: raw as ParentRelationship, relationship: opt(free) };
  }
  return { relationshipType: null, relationship: opt(free) };
}

export async function createParentAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Ad zorunlu");
  const phoneRaw = readStr(fd, "phone");
  const phoneKey = phoneRaw ? normalizePhone(phoneRaw) : null;
  const emailLower = readStr(fd, "email").toLowerCase() || null;
  if (phoneKey) {
    const existing = await prisma.parent.findUnique({ where: { phoneKey }, select: { id: true } });
    if (existing) throw new Error("Ayni telefon ile kayitli veli zaten var");
  }
  if (emailLower) {
    const existing = await prisma.parent.findUnique({ where: { email: emailLower }, select: { id: true } });
    if (existing) throw new Error("Ayni email ile kayitli veli zaten var");
  }
  const parent = await prisma.parent.create({
    data: {
      fullName,
      phone: phoneRaw || null,
      phoneKey,
      email: emailLower,
      notes: readStr(fd, "notes") || null,
    },
    select: { id: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: parent.id,
    action: "PARENT_CREATE",
    summary: fullName,
    payload: { phoneKey, email: emailLower },
  });
  revalidatePath("/panel/admin/veliler");
}

export async function updateParentAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Ad zorunlu");
  const phoneRaw = readStr(fd, "phone");
  const phoneKey = phoneRaw ? normalizePhone(phoneRaw) : null;
  const emailLower = readStr(fd, "email").toLowerCase() || null;
  if (phoneKey) {
    const existing = await prisma.parent.findFirst({ where: { phoneKey, NOT: { id } }, select: { id: true } });
    if (existing) throw new Error("Ayni telefon ile kayitli baska veli var");
  }
  if (emailLower) {
    const existing = await prisma.parent.findFirst({ where: { email: emailLower, NOT: { id } }, select: { id: true } });
    if (existing) throw new Error("Ayni email ile kayitli baska veli var");
  }
  await prisma.parent.update({
    where: { id },
    data: {
      fullName,
      phone: phoneRaw || null,
      phoneKey,
      email: emailLower,
      notes: readStr(fd, "notes") || null,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: id,
    action: "PARENT_UPDATE",
    summary: fullName,
  });
  revalidatePath("/panel/admin/veliler");
  revalidatePath(`/panel/admin/veliler/${id}/duzenle`);
}

export async function deleteParentAction(id: string) {
  const ctx = await requirePanelRole("admin");
  await prisma.parent.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: id,
    action: "PARENT_DELETE",
    summary: id,
  });
  revalidatePath("/panel/admin/veliler");
}

export async function linkChildAction(parentId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const studentId = readStr(fd, "studentId");
  if (!studentId) throw new Error("Ogrenci zorunlu");
  const rel = readRelationship(fd);
  const isPrimary = fd.get("isPrimary") === "on";
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: { relationship: rel.relationship, relationshipType: rel.relationshipType, isPrimary },
    create: {
      parentId,
      studentId,
      relationship: rel.relationship,
      relationshipType: rel.relationshipType,
      isPrimary,
    },
  });
  const [parent, student] = await Promise.all([
    prisma.parent.findUnique({ where: { id: parentId }, select: { fullName: true, userId: true } }),
    prisma.student.findUnique({ where: { id: studentId }, select: { fullName: true } }),
  ]);
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: parentId,
    action: "PARENT_STUDENT_LINK",
    summary: `${parent?.fullName ?? parentId} <-> ${student?.fullName ?? studentId}`,
    payload: { parentId, studentId, relationshipType: rel.relationshipType, isPrimary },
  });
  if (parent?.userId) {
    await notifyUser({
      userId: parent.userId,
      type: "SYSTEM",
      title: "Yeni ogrenci baglandi",
      body: `${student?.fullName ?? "Bir ogrenci"} hesabiniza baglandi.`,
      relatedEntityType: "Student",
      relatedEntityId: studentId,
    });
  }
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function unlinkChildAction(parentId: string, studentId: string) {
  const ctx = await requirePanelRole("admin");
  await prisma.parentStudent.delete({ where: { parentId_studentId: { parentId, studentId } } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: parentId,
    action: "PARENT_STUDENT_UNLINK",
    summary: `${parentId} <-> ${studentId}`,
    payload: { parentId, studentId },
  });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function updateRelationshipAction(parentId: string, studentId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const rel = readRelationship(fd);
  const isPrimary = fd.get("isPrimary") === "on";
  await prisma.parentStudent.update({
    where: { parentId_studentId: { parentId, studentId } },
    data: { relationship: rel.relationship, relationshipType: rel.relationshipType, isPrimary },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: parentId,
    action: "PARENT_STUDENT_RELATIONSHIP_UPDATE",
    summary: `${parentId} <-> ${studentId}`,
    payload: { relationshipType: rel.relationshipType, isPrimary },
  });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
}

export async function createParentAccountAction(
  parentId: string,
  fd: FormData,
): Promise<{ ok: true; mode: AccountCreateMode; url?: string; tempPassword?: string }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "parent-account.create",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60 * 60_000 },
  });
  const modeRaw = readStr(fd, "mode") || "invite";
  const mode: AccountCreateMode = isAccountMode(modeRaw) ? modeRaw : "invite";
  const parent = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { fullName: true, email: true, userId: true },
  });
  if (!parent) throw new Error("Veli bulunamadi");
  if (parent.userId) throw new Error("Bu velinin zaten bir hesabi var");
  if (!parent.email) throw new Error("Hesap olusturmak icin velinin email'i olmali");
  const result = await createUserAccountForParent({
    parentId,
    email: parent.email,
    fullName: parent.fullName,
    mode,
    actorUserId: ctx.userId,
  });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  if (result.mode === "invite") return { ok: true, mode: "invite", url: result.url };
  if (result.mode === "tempPassword") return { ok: true, mode: "tempPassword", tempPassword: result.tempPassword };
  return { ok: true, mode: "none" };
}

export async function regenerateParentUserInviteAction(
  parentId: string,
): Promise<{ ok: true; url: string; expiresAt: Date }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "parent-account.invite",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 30, windowMs: 60 * 60_000 },
  });
  const p = await prisma.parent.findUnique({ where: { id: parentId }, select: { userId: true } });
  if (!p?.userId) throw new Error("Velinin hesabi yok - once hesap olusturun");
  const r = await regenerateUserInvite({ userId: p.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  return { ok: true, url: r.url, expiresAt: r.expiresAt };
}

export async function revokeParentUserInviteAction(parentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  const p = await prisma.parent.findUnique({ where: { id: parentId }, select: { userId: true } });
  if (!p?.userId) throw new Error("Velinin hesabi yok");
  await revokeUserInvite({ userId: p.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  return { ok: true };
}

export async function disableParentAccountAction(parentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "parent-account.toggle",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60 * 60_000 },
  });
  const p = await prisma.parent.findUnique({ where: { id: parentId }, select: { userId: true } });
  if (!p?.userId) throw new Error("Velinin hesabi yok");
  await disableUserAccount({ userId: p.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  return { ok: true };
}

export async function enableParentAccountAction(parentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "parent-account.toggle",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60 * 60_000 },
  });
  const p = await prisma.parent.findUnique({ where: { id: parentId }, select: { userId: true } });
  if (!p?.userId) throw new Error("Velinin hesabi yok");
  await enableUserAccount({ userId: p.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  return { ok: true };
}

export async function forceParentPasswordChangeAction(parentId: string): Promise<{ ok: true }> {
  const ctx = await requirePanelRole("admin");
  const p = await prisma.parent.findUnique({ where: { id: parentId }, select: { userId: true } });
  if (!p?.userId) throw new Error("Velinin hesabi yok");
  await forceUserPasswordChange({ userId: p.userId, actorUserId: ctx.userId });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  return { ok: true };
}

export async function resetParentTempPasswordAction(
  parentId: string,
): Promise<{ ok: true; tempPassword: string }> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "parent-account.temp-password",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 20, windowMs: 60 * 60_000 },
  });
  const p = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { userId: true, fullName: true },
  });
  if (!p?.userId) throw new Error("Velinin hesabi yok");
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({
    where: { id: p.userId },
    data: { passwordHash, mustChangePassword: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "User",
    entityId: p.userId,
    action: "USER_TEMP_PASSWORD_RESET",
    summary: p.fullName,
    payload: { parentId },
  });
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
  return { ok: true, tempPassword };
}

export type ParentCreateResult = {
  ok: true;
  parentId: string;
  accountMode: AccountCreateMode;
  inviteUrl?: string;
  tempPassword?: string;
  linkedStudentIds: string[];
  duplicates: DuplicateMatch[];
};

export async function createParentWithAccountAction(fd: FormData): Promise<ParentCreateResult> {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "parent.create",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 60, windowMs: 10 * 60_000 },
  });
  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Ad Soyad zorunlu");
  const phoneRaw = readStr(fd, "phone");
  const phoneKey = phoneRaw ? normalizePhone(phoneRaw) : null;
  const emailLower = readStr(fd, "email").toLowerCase() || null;
  const phoneSecondary = readStr(fd, "phoneSecondary") || null;
  const notes = readStr(fd, "notes") || null;
  const modeRaw = readStr(fd, "accountMode") || "none";
  const accountMode: AccountCreateMode = isAccountMode(modeRaw) ? modeRaw : "none";
  if (accountMode !== "none" && !emailLower) {
    throw new Error("Hesap olusturmak icin email zorunludur");
  }
  const duplicates = await findParentDuplicates({ phoneKey, email: emailLower });
  const blocking = duplicates.filter(
    (d) =>
      (d.entity === "Parent" && (d.field === "phoneKey" || d.field === "email")) ||
      (d.entity === "User" && accountMode !== "none"),
  );
  if (blocking.length > 0) {
    const labels = blocking.map((d) => `${d.entity}#${d.existingId} (${d.existingLabel})`).join(", ");
    throw new Error(`Cakisan kayit mevcut: ${labels}. Mevcut kaydi kullanin.`);
  }
  const parent = await prisma.parent.create({
    data: {
      fullName,
      phone: phoneRaw || null,
      phoneKey,
      email: emailLower,
      notes:
        [notes, phoneSecondary ? `Ikinci tel: ${phoneSecondary}` : null]
          .filter(Boolean)
          .join("\n") || null,
    },
    select: { id: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Parent",
    entityId: parent.id,
    action: "PARENT_CREATE",
    summary: fullName,
    payload: { phoneKey, email: emailLower, accountMode },
  });
  let inviteUrl: string | undefined;
  let tempPassword: string | undefined;
  const accountDisabled = readStr(fd, "accountDisabled") === "on";
  if (accountMode !== "none" && emailLower) {
    const acc = await createUserAccountForParent({
      parentId: parent.id,
      email: emailLower,
      fullName,
      mode: accountMode,
      actorUserId: ctx.userId,
    });
    if (acc.mode === "invite") inviteUrl = acc.url;
    if (acc.mode === "tempPassword") tempPassword = acc.tempPassword;
    if (accountDisabled && (acc.mode === "invite" || acc.mode === "tempPassword")) {
      await disableUserAccount({ userId: acc.userId, actorUserId: ctx.userId });
    }
  }
  const linkedStudentIds: string[] = [];
  const studentIdsRaw = fd.getAll("studentIds").map((v) => String(v)).filter(Boolean);
  if (studentIdsRaw.length > 0) {
    const rel = readRelationship(fd);
    const isPrimary = fd.get("isPrimary") === "on";
    for (const sid of studentIdsRaw) {
      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: sid } },
        update: {},
        create: {
          parentId: parent.id,
          studentId: sid,
          relationship: rel.relationship,
          relationshipType: rel.relationshipType,
          isPrimary: isPrimary && linkedStudentIds.length === 0,
        },
      });
      linkedStudentIds.push(sid);
    }
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "Parent",
      entityId: parent.id,
      action: "PARENT_STUDENT_LINK_BATCH",
      summary: `${fullName} -> ${linkedStudentIds.length} ogrenci`,
      payload: { studentIds: linkedStudentIds, relationshipType: rel.relationshipType },
    });
  }
  revalidatePath("/panel/admin/veliler");
  revalidatePath(`/panel/admin/veliler/${parent.id}/duzenle`);
  for (const sid of linkedStudentIds) {
    revalidatePath(`/panel/admin/ogrenciler/${sid}/duzenle`);
  }
  if (readStr(fd, "intent") === "save-and-go") {
    redirect(`/panel/admin/veliler/${parent.id}/duzenle`);
  }
  return {
    ok: true,
    parentId: parent.id,
    accountMode,
    inviteUrl,
    tempPassword,
    linkedStudentIds,
    duplicates,
  };
}

export async function lookupParentDuplicatesAction(opts: {
  phone: string;
  email: string;
  excludeParentId?: string;
}): Promise<DuplicateMatch[]> {
  await requirePanelRole("admin");
  const phoneKey = opts.phone ? normalizePhone(opts.phone) : null;
  const emailLower = opts.email ? opts.email.toLowerCase() : null;
  return findParentDuplicates({ phoneKey, email: emailLower, excludeParentId: opts.excludeParentId });
}
