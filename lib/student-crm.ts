"use server";

/**
 * Faz 3 — Student CRM (Notes / Teacher Comments / Files / Tag assignments).
 *
 * Yetki kuralları:
 *  - StudentNote: ADMIN ve öğretmen (kendi öğrencisiyse) yazabilir; isPrivate=true
 *    notları sadece ADMIN görür/düzenler.
 *  - TeacherComment: sadece öğrencinin atandığı öğretmen veya ADMIN yazar/düzenler;
 *    visibleToParent=true ise veli panelinde de listelenir.
 *  - StudentFile: ADMIN/öğretmen yükler; öğrenci ve veli görüntüler.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import {
  requireAdmin,
  assertTeacherOwnsStudent,
} from "@/lib/auth-guards";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

async function resolveStudentEditor(studentId: string) {
  const session = await getServerAuthSession();
  if (!session) redirect("/giris");
  const access = getPanelAccess(session.user);

  if (access.hasAdminPanel) {
    return { session, isAdmin: true, teacherId: null as string | null };
  }
  if (access.hasTeacherPanel && session.user?.id) {
    const t = await prisma.teacher.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (t) {
      await assertTeacherOwnsStudent(t.id, studentId);
      return { session, isAdmin: false, teacherId: t.id };
    }
  }
  redirect("/giris");
}

// ── Notes ──────────────────────────────────────────────────

const NoteSchema = z.object({
  studentId: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
  isPrivate: z.coerce.boolean().default(false),
});

export async function addStudentNote(formData: FormData) {
  const studentId = String(formData.get("studentId") || "");
  const ctx = await resolveStudentEditor(studentId);
  const parsed = NoteSchema.safeParse({
    studentId,
    content: formData.get("content"),
    isPrivate: formData.get("isPrivate") === "on",
  });
  if (!parsed.success) return;

  // Sadece admin private not yazabilir.
  const isPrivate = ctx.isAdmin ? parsed.data.isPrivate : false;

  const note = await prisma.studentNote.create({
    data: {
      studentId,
      content: parsed.data.content,
      isPrivate,
      authorId: ctx.session.user!.id,
    },
  });
  await auditLog({
    actorUserId: ctx.session.user!.id,
    action: "STUDENT_NOTE_CREATE",
    entityType: "StudentNote",
    entityId: note.id,
    payload: { studentId, isPrivate },
  });
  revalidatePath(`/admin/ogrenciler/${studentId}`);
  revalidatePath(`/ogretmen/ogrencilerim/${studentId}`);
}

export async function deleteStudentNote(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const note = await prisma.studentNote.findUnique({ where: { id } });
  if (!note) return;
  await resolveStudentEditor(note.studentId);
  await prisma.studentNote.delete({ where: { id } });
  revalidatePath(`/admin/ogrenciler/${note.studentId}`);
  revalidatePath(`/ogretmen/ogrencilerim/${note.studentId}`);
}

// ── Teacher Comments ───────────────────────────────────────

const CommentSchema = z.object({
  studentId: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
  rating: z.coerce.number().int().min(1).max(10).optional().nullable(),
  visibleToParent: z.coerce.boolean().default(true),
});

export async function addTeacherComment(formData: FormData) {
  const studentId = String(formData.get("studentId") || "");
  const ctx = await resolveStudentEditor(studentId);
  if (!ctx.teacherId && !ctx.isAdmin) return;

  const parsed = CommentSchema.safeParse({
    studentId,
    content: formData.get("content"),
    rating: formData.get("rating") || null,
    visibleToParent: formData.get("visibleToParent") === "on",
  });
  if (!parsed.success) return;

  // Admin'in adına bir teacher seçimi yoksa, comment ataması için bir teacher gerekli.
  // Admin tarafında comment yazılırsa, bu durumda ilk ders/öğretmen ilişkisi alınır.
  let teacherIdForComment = ctx.teacherId;
  if (!teacherIdForComment) {
    const lesson = await prisma.lesson.findFirst({
      where: { studentId },
      orderBy: { scheduledAt: "desc" },
      select: { teacherId: true },
    });
    teacherIdForComment = lesson?.teacherId ?? null;
    if (!teacherIdForComment) return;
  }

  const c = await prisma.teacherComment.create({
    data: {
      studentId,
      teacherId: teacherIdForComment,
      content: parsed.data.content,
      rating: parsed.data.rating ?? null,
      visibleToParent: parsed.data.visibleToParent,
    },
  });
  await auditLog({
    actorUserId: ctx.session.user!.id,
    action: "TEACHER_COMMENT_CREATE",
    entityType: "TeacherComment",
    entityId: c.id,
    payload: { studentId, visibleToParent: parsed.data.visibleToParent },
  });
  revalidatePath(`/admin/ogrenciler/${studentId}`);
  revalidatePath(`/ogretmen/ogrencilerim/${studentId}`);
}

export async function deleteTeacherComment(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const c = await prisma.teacherComment.findUnique({ where: { id } });
  if (!c) return;
  await resolveStudentEditor(c.studentId);
  await prisma.teacherComment.delete({ where: { id } });
  revalidatePath(`/admin/ogrenciler/${c.studentId}`);
  revalidatePath(`/ogretmen/ogrencilerim/${c.studentId}`);
}

// ── Student Files (URL kayıt; upload ileride Vercel Blob ile) ───

const FileSchema = z.object({
  studentId: z.string().min(1),
  fileName: z.string().trim().min(1).max(200),
  fileUrl: z.string().trim().url(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  mimeType: z.string().trim().max(80).optional().or(z.literal("")),
  byteSize: z.coerce.number().int().min(0).default(0),
});

export async function addStudentFile(formData: FormData) {
  const studentId = String(formData.get("studentId") || "");
  const ctx = await resolveStudentEditor(studentId);
  const parsed = FileSchema.safeParse({
    studentId,
    fileName: formData.get("fileName"),
    fileUrl: formData.get("fileUrl"),
    description: formData.get("description") || "",
    mimeType: formData.get("mimeType") || "",
    byteSize: formData.get("byteSize") || 0,
  });
  if (!parsed.success) return;

  const f = await prisma.studentFile.create({
    data: {
      studentId,
      fileName: parsed.data.fileName,
      fileUrl: parsed.data.fileUrl,
      mimeType: parsed.data.mimeType || null,
      description: parsed.data.description || null,
      byteSize: parsed.data.byteSize,
      uploadedById: ctx.session.user!.id,
    },
  });
  await auditLog({
    actorUserId: ctx.session.user!.id,
    action: "STUDENT_FILE_CREATE",
    entityType: "StudentFile",
    entityId: f.id,
    payload: { studentId, fileName: parsed.data.fileName },
  });
  revalidatePath(`/admin/ogrenciler/${studentId}`);
}

export async function deleteStudentFile(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const f = await prisma.studentFile.findUnique({ where: { id } });
  if (!f) return;
  await resolveStudentEditor(f.studentId);
  await prisma.studentFile.delete({ where: { id } });
  revalidatePath(`/admin/ogrenciler/${f.studentId}`);
}

// ── Quick risk tag assigner (re-uses studentTag) ───────────

export async function quickToggleTag(formData: FormData) {
  const session = await requireAdmin();
  const studentId = String(formData.get("studentId") || "");
  const tagId = String(formData.get("tagId") || "");
  if (!studentId || !tagId) return;
  const existing = await prisma.studentTag.findUnique({
    where: { studentId_tagId: { studentId, tagId } },
  });
  if (existing) {
    await prisma.studentTag.delete({ where: { studentId_tagId: { studentId, tagId } } });
  } else {
    await prisma.studentTag.create({
      data: { studentId, tagId, assignedById: session.user!.id },
    });
  }
  revalidatePath(`/admin/ogrenciler/${studentId}`);
}
