"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { normalizePhone } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StudentStatus } from "@prisma/client";
import type { ParentRelationship } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import {
  isParentRelationshipType,
  generateParentInviteToken,
  defaultParentInviteExpiresAt,
  buildParentInviteUrl,
} from "@/lib/parents";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(v: string): string | null { return v.length === 0 ? null : v; }

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
  const fullName = readStr(fd, "fullName");
  const phoneRaw = readStr(fd, "phone");
  if (!fullName || !phoneRaw) throw new Error("Ad ve telefon zorunlu");
  const phoneKey = normalizePhone(phoneRaw);
  const classroomId = opt(readStr(fd, "classroomId"));
  const parentId = opt(readStr(fd, "parentId"));
  const created = await prisma.student.create({
    data: {
      fullName,
      phone: phoneRaw,
      phoneKey,
      email: opt(readStr(fd, "email")),
      city: opt(readStr(fd, "city")),
      district: opt(readStr(fd, "district")),
      schoolName: opt(readStr(fd, "schoolName")),
      classLevel: opt(readStr(fd, "classLevel")),
      examType: opt(readStr(fd, "examType")),
      targetGoal: opt(readStr(fd, "targetGoal")),
      status: (readStr(fd, "status") as StudentStatus) || "NEW",
    },
  });
  if (classroomId) {
    await prisma.classroomStudent.create({ data: { classroomId, studentId: created.id } });
  }
  if (parentId) {
    const rel = readRelationship(fd);
    await prisma.parentStudent.create({
      data: {
        parentId, studentId: created.id,
        relationship: rel.relationship,
        relationshipType: rel.relationshipType,
        isPrimary: fd.get("parentIsPrimary") === "on",
      },
    });
  }
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: created.id,
    action: "STUDENT_CREATE",
    summary: fullName,
    payload: { phoneKey, classroomId, parentId },
  });
  revalidatePath("/panel/admin/ogrenciler");
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
  await requirePanelRole("admin");
  const parentId = readStr(fd, "parentId");
  if (!parentId) throw new Error("Veli zorunlu");
  const rel = readRelationship(fd);
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: {
      relationship: rel.relationship,
      relationshipType: rel.relationshipType,
      isPrimary: fd.get("isPrimary") === "on",
    },
    create: {
      parentId, studentId,
      relationship: rel.relationship,
      relationshipType: rel.relationshipType,
      isPrimary: fd.get("isPrimary") === "on",
    },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
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
