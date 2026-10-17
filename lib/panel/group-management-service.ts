import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sanitizeAuditPayload } from "@/lib/audit-policy";
import { DEFAULT_GROUP_CAPACITY } from "@/lib/panel-group-capacity";
import { groupActionSchema, groupMembersActionSchema } from "./group-route-contract";
import { addStudentToGroup, ensureActiveGroup, ensureActiveStudent, lockGroupRow, previewStudentTransfer, removeStudentFromGroup, transferStudentsBetweenGroups } from "./group-lifecycle";
import { assertLessonNoConflict } from "./lesson-lifecycle";
import { notifyGroupAudience, type GroupNotificationInput } from "./group-notifications";
import { assertGroupRevision, GroupMutationError, groupRevision, mutationReceiptKey, operationDigest, readGroupReceipt } from "./group-mutation-core";
import type { GroupMutationEnvelope } from "./group-mutation-input";

export const groupCreateSchema = z.object({ name: z.string().trim().min(2).max(80), subject: z.string().trim().min(2).max(80), level: z.string().trim().max(40).optional(), teacherId: z.string().min(1), studentIds: z.array(z.string().min(1)).max(DEFAULT_GROUP_CAPACITY).default([]) });
export type GroupCreateInput = z.infer<typeof groupCreateSchema>;
export type GroupAction = z.infer<typeof groupActionSchema>;
export type GroupMembersAction = z.infer<typeof groupMembersActionSchema>;
type Tx = Prisma.TransactionClient;
type Audit = { action: string; summary: string; details?: Record<string, unknown> };

export async function loadGroupMutationState(tx: Pick<Tx, "group">, id: string) {
  const group = await tx.group.findUnique({ where: { id }, include: { enrollments: { where: { endedAt: null }, select: { studentId: true, startedAt: true } } } });
  if (!group) throw new GroupMutationError("GROUP_NOT_FOUND", "Grup bulunamadı.", 404);
  return group;
}

/** Audit'ın tekil anahtarı aynı zamanda atomik işlem makbuzudur. Anahtar aktöre bağlıdır.
 * İş değişikliği, in-app bildirim, e-posta outbox'ı ve makbuz birlikte commit olur.
 * Legacy web formları aynı servisi kullanır; Bearer önkoşulları route katmanında zorunludur.
 */
async function writeGroupOperation(input: { actorId: string; groupId?: string; targetId?: string; operation: unknown; envelope: GroupMutationEnvelope }, execute: (tx: Tx) => Promise<{ id: string; result?: Record<string, unknown>; audit: Audit }>) {
  const key = mutationReceiptKey(input.actorId, input.envelope.idempotencyKey ?? randomUUID());
  const digest = operationDigest({ groupId: input.groupId ?? null, operation: input.operation, expectedRevision: input.envelope.expectedRevision ?? null, expectedTargetRevision: input.envelope.expectedTargetRevision ?? null });
  const replay = async () => {
    const saved = await prisma.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
    return saved ? readGroupReceipt(saved.payload, digest) : null;
  };
  const prior = await replay();
  if (prior) return prior;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
      const saved = await tx.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
      if (saved) return readGroupReceipt(saved.payload, digest);
      // Kaynak/hedef her zaman aynı sırada kilitlenir; ters yönlü transfer deadlock üretmez.
      for (const id of [...new Set([input.groupId, input.targetId].filter((id): id is string => !!id))].sort()) await lockGroupRow(tx, id);
      if (input.groupId) assertGroupRevision(groupRevision(await loadGroupMutationState(tx, input.groupId)), input.envelope.expectedRevision);
      if (input.targetId) assertGroupRevision(groupRevision(await loadGroupMutationState(tx, input.targetId)), input.envelope.expectedTargetRevision);
      const completed = await execute(tx);
      const result = { ok: true, id: completed.id, ...completed.result, revision: groupRevision(await loadGroupMutationState(tx, completed.id)), replayed: false };
      await tx.auditLog.create({ data: {
        actorUserId: input.actorId, actorType: "USER", entityType: "Group", entityId: completed.id,
        action: completed.audit.action, summary: completed.audit.summary, idempotencyKey: key,
        payload: { ...sanitizeAuditPayload(completed.audit.details ?? {}) as Prisma.InputJsonObject, operationDigest: digest, result } as Prisma.InputJsonObject,
      } });
      return result;
    }, { isolationLevel: "Serializable", timeout: 15_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) {
      const completed = await replay();
      if (completed) return completed;
      throw new GroupMutationError("GROUP_CONFLICT", "Eşzamanlı bir grup işlemi oldu. Görünümü yenileyin.");
    }
    throw error;
  }
}

export function createManagedGroup(actorId: string, data: GroupCreateInput, envelope: GroupMutationEnvelope) {
  const studentIds = [...new Set(data.studentIds)];
  return writeGroupOperation({ actorId, operation: { action: "CREATE", ...data, studentIds }, envelope }, async (tx) => {
    const teacher = await tx.user.findFirst({ where: { id: data.teacherId, role: "TEACHER", status: "ACTIVE" }, select: { id: true } });
    if (!teacher) throw new GroupMutationError("TEACHER_NOT_FOUND", "Aktif öğretmen bulunamadı.", 400);
    for (const studentId of studentIds) await ensureActiveStudent(tx, studentId);
    const group = await tx.group.create({ data: { name: data.name, subject: data.subject, level: data.level || null, teacherId: teacher.id, capacity: DEFAULT_GROUP_CAPACITY, enrollments: { create: studentIds.map((studentId) => ({ studentId })) } } });
    return { id: group.id, audit: { action: "group.created", summary: `${group.name} grubu oluşturuldu`, details: { teacherId: teacher.id, studentCount: studentIds.length } } };
  });
}

export async function updateManagedGroup(actorId: string, id: string, action: GroupAction, envelope: GroupMutationEnvelope) {
  if (action.action === "PREVIEW_TRANSFER") return prisma.$transaction(async (tx) => ({ ok: true, preview: await previewStudentTransfer(tx, { sourceGroupId: id, targetGroupId: action.targetGroupId, studentIds: [action.studentId] }) }));
  if (action.action === "TRANSFER_STUDENT") return executeGroupMembers(actorId, id, { action: "TRANSFER", mode: "EXECUTE", studentIds: [action.studentId], targetGroupId: action.targetGroupId }, envelope);
  if (action.action === "REMOVE_STUDENT") return executeGroupMembers(actorId, id, { action: "REMOVE", mode: "EXECUTE", studentIds: [action.studentId] }, envelope);
  return writeGroupOperation({ actorId, groupId: id, operation: action, envelope }, async (tx) => {
    const group = await loadGroupMutationState(tx, id);
    let audit: Audit;
    if (action.action === "UPDATE_META") {
      await tx.group.update({ where: { id }, data: { name: action.name, subject: action.subject, level: action.level || null } });
      audit = { action: "group.updated", summary: `${action.name} grubu güncellendi`, details: { subject: action.subject, level: action.level || null } };
    } else if (action.action === "SET_ACTIVE") {
      await tx.group.update({ where: { id }, data: { isActive: action.isActive } });
      await tx.lessonSeries.updateMany({ where: { groupId: id }, data: { isActive: action.isActive } });
      audit = { action: action.isActive ? "group.reopened" : "group.closed", summary: `${group.name} ${action.isActive ? "tekrar açıldı" : "kapatıldı"}`, details: { previous: group.isActive, next: action.isActive } };
    } else if (action.action === "ADD_STUDENT") {
      await ensureActiveGroup(tx, id);
      await ensureActiveStudent(tx, action.studentId);
      const [student] = await memberAudience(tx, [action.studentId]);
      await addStudentToGroup(tx, group, student.id);
      await notifyGroupAudience([
        ...studentAudience(student, `${group.name} grubuna katıldın, aramıza hoş geldin! 🎉`, `${group.name} grubuna eklendi.`),
        { userId: group.teacherId, title: "Grubunuza yeni bir öğrenci katıldı 👋", body: `${student.user.fullName || student.user.email} öğrencisi ${group.name} grubuna eklendi.`, href: "/panel/ogretmen/ogrenci" },
      ], tx);
      audit = { action: "group.membership_added", summary: "Öğrenci gruba eklendi", details: { studentId: student.id } };
    } else {
      const teacher = await tx.user.findFirst({ where: { id: action.teacherId, role: "TEACHER", status: "ACTIVE" }, select: { id: true } });
      if (!teacher) throw new GroupMutationError("TEACHER_NOT_FOUND", "Aktif öğretmen bulunamadı.", 400);
      const now = new Date();
      const upcoming = await tx.lesson.findMany({ where: { groupId: id, status: "PLANNED", startsAt: { gte: now } }, select: { id: true, startsAt: true, endsAt: true } });
      for (const lesson of upcoming) await assertLessonNoConflict(tx, { lessonId: lesson.id, teacherId: teacher.id, groupId: id, startsAt: lesson.startsAt, endsAt: lesson.endsAt, studentIds: group.enrollments.map((row) => row.studentId) });
      await tx.group.update({ where: { id }, data: { teacherId: teacher.id } });
      await tx.lessonSeries.updateMany({ where: { groupId: id, isActive: true }, data: { teacherId: teacher.id } });
      await tx.lesson.updateMany({ where: { groupId: id, status: "PLANNED", startsAt: { gte: now } }, data: { teacherId: teacher.id } });
      const students = await memberAudience(tx, group.enrollments.map((row) => row.studentId));
      await notifyGroupAudience([
        { userId: teacher.id, title: "Yeni bir grup size emanet 🤝", body: `${group.name} grubu size atandı. Kolay gelsin!`, href: "/panel/ogretmen" },
        ...(group.teacherId !== teacher.id ? [{ userId: group.teacherId, title: "Grup ataması güncellendi", body: `${group.name} grubu üzerindeki sorumluluğunuz değişti.`, href: "/panel/ogretmen" }] : []),
        ...students.flatMap((student) => studentAudience(student, `${group.name} grubunun öğretmeni güncellendi.`, `${group.name} grubunda öğretmen değişikliği yapıldı.`)),
      ], tx);
      audit = { action: "group.teacher_changed", summary: `${group.name} öğretmeni güncellendi`, details: { previousTeacherId: group.teacherId, teacherId: teacher.id } };
    }
    return { id, audit };
  });
}

async function memberAudience(tx: Tx, studentIds: string[]) {
  return tx.studentProfile.findMany({ where: { id: { in: studentIds } }, select: { id: true, userId: true, user: { select: { fullName: true, email: true, status: true } }, parents: { where: { active: true, endedAt: null, canViewAcademic: true }, select: { parentId: true } } } });
}

function studentAudience(student: { id: string; userId: string; user: { fullName: string | null; email: string }; parents: Array<{ parentId: string }> }, body: string, parentBody: string): GroupNotificationInput[] {
  return [{ userId: student.userId, title: "Grup kaydın güncellendi 📌", body, href: "/panel/ogrenci/takvim" }, ...student.parents.map((parent) => ({ userId: parent.parentId, title: "Öğrenci grup kaydı güncellendi", body: `${student.user.fullName || student.user.email} öğrencisi ${parentBody}`, href: `/panel/veli/takvim?studentId=${student.id}` }))];
}

export function executeGroupMembers(actorId: string, id: string, data: GroupMembersAction, envelope: GroupMutationEnvelope) {
  const studentIds = [...new Set(data.studentIds)];
  return writeGroupOperation({ actorId, groupId: id, targetId: data.action === "TRANSFER" ? data.targetGroupId : undefined, operation: { ...data, studentIds }, envelope }, async (tx) => {
    const source = await loadGroupMutationState(tx, id);
    const members = source.enrollments.filter((row) => studentIds.includes(row.studentId));
    if (members.length !== studentIds.length) throw new GroupMutationError("NOT_ENROLLED", "Seçili öğrencilerin bir kısmı bu grupta aktif değil.");
    let audit: Audit;
    if (data.action === "TRANSFER") {
      if (data.targetGroupId === id) throw new GroupMutationError("INVALID_INPUT", "Hedef grup farklı olmalı.", 400);
      await transferStudentsBetweenGroups(tx, id, data.targetGroupId, studentIds);
      const target = await ensureActiveGroup(tx, data.targetGroupId);
      const students = await memberAudience(tx, studentIds);
      await notifyGroupAudience(students.flatMap((student) => [
        ...studentAudience(student, `${source.name} grubundan ${target.name} grubuna taşındın. Yeni grubunda başarılar! 🌟`, `${source.name} grubundan ${target.name} grubuna taşındı.`),
        { userId: source.teacherId, title: "Öğrenci transferi 🔄", body: `${student.user.fullName || student.user.email} öğrencisi ${source.name} grubundan başka bir gruba taşındı.`, href: "/panel/ogretmen/ogrenci" },
        { userId: target.teacherId, title: "Grubunuza yeni bir öğrenci katıldı 👋", body: `${student.user.fullName || student.user.email} öğrencisi ${target.name} grubuna taşındı.`, href: "/panel/ogretmen/ogrenci" },
      ]), tx);
      audit = { action: "group.membership_transferred", summary: `${students.length} öğrenci başka gruba taşındı`, details: { studentIds, sourceGroupId: id, targetGroupId: target.id, confirmed: true } };
    } else if (data.action === "REMOVE") {
      await ensureActiveGroup(tx, id);
      for (const studentId of studentIds) { await ensureActiveStudent(tx, studentId); await removeStudentFromGroup(tx, id, studentId); }
      await notifyGroupAudience((await memberAudience(tx, studentIds)).flatMap((student) => studentAudience(student, `${source.name} grubundaki kaydın sona erdi. Bir sorun olduğunu düşünüyorsan bize yazabilirsin.`, `${source.name} grubundan çıkarıldı.`)), tx);
      audit = { action: "group.membership_removed_bulk", summary: `${studentIds.length} öğrenci gruptan çıkarıldı`, details: { studentIds } };
    } else {
      const title = data.title || `${source.name} grubundan bir bilgilendirme 📣`;
      const body = data.body || "Grup yöneticisinden size yeni bir mesaj var.";
      await notifyGroupAudience((await memberAudience(tx, studentIds)).flatMap((student) => [{ userId: student.userId, title, body, href: "/panel/ogrenci" }, ...student.parents.map((parent) => ({ userId: parent.parentId, title, body, href: `/panel/veli?studentId=${student.id}` }))]), tx);
      audit = { action: "group.members_notified", summary: `${studentIds.length} öğrenciye grup bildirimi oluşturuldu`, details: { studentIds, title } };
    }
    return { id, result: { mode: "EXECUTE", action: data.action, succeeded: studentIds.length }, audit };
  });
}

/** Önizleme hiçbir yazma/bildirim yapmaz. Transferde kapasite ve ders çakışması aynı domain servisinden. */
export function previewGroupMembers(id: string, data: GroupMembersAction) {
  const studentIds = [...new Set(data.studentIds)];
  return prisma.$transaction(async (tx) => {
    const source = await loadGroupMutationState(tx, id);
    const expectedRevision = groupRevision(source);
    if (data.action === "TRANSFER") {
      if (data.targetGroupId === id) throw new GroupMutationError("INVALID_INPUT", "Hedef grup farklı olmalı.", 400);
      const target = await loadGroupMutationState(tx, data.targetGroupId);
      const preview = await previewStudentTransfer(tx, { sourceGroupId: id, targetGroupId: data.targetGroupId, studentIds });
      return { mode: "PREVIEW", action: data.action, preview, expectedRevision, expectedTargetRevision: groupRevision(target) };
    }
    const matches = source.enrollments.filter((row) => studentIds.includes(row.studentId));
    const students = await memberAudience(tx, studentIds);
    if (data.action === "REMOVE") {
      const items = studentIds.map((studentId) => {
        const member = matches.some((row) => row.studentId === studentId);
        const student = students.find((row) => row.id === studentId);
        return { studentId, studentName: student ? student.user.fullName || student.user.email : studentId, blockers: [...(!member ? [{ code: "NOT_ENROLLED", message: "Öğrenci grupta aktif değil." }] : []), ...(!source.isActive ? [{ code: "SOURCE_INACTIVE", message: "Grup kapalı." }] : []), ...(student?.user.status !== "ACTIVE" ? [{ code: "STUDENT_INACTIVE", message: "Öğrenci aktif değil." }] : [])] };
      });
      return { mode: "PREVIEW", action: data.action, canExecute: items.every((item) => !item.blockers.length), items, matched: matches.length, expectedRevision };
    }
    const matchedStudents = students.filter((student) => matches.some((row) => row.studentId === student.id));
    const recipients = new Set(matchedStudents.flatMap((student) => [student.userId, ...student.parents.map((parent) => parent.parentId)]));
    return { mode: "PREVIEW", action: data.action, canExecute: matches.length === studentIds.length, matchedStudents: matches.length, recipientCount: recipients.size, title: data.title || `${source.name} grubundan bir bilgilendirme 📣`, body: data.body || "Grup yöneticisinden size yeni bir mesaj var.", sample: matchedStudents.slice(0, 5).map((student) => ({ studentId: student.id, name: student.user.fullName || student.user.email })), expectedRevision };
  }, { isolationLevel: "RepeatableRead" });
}
