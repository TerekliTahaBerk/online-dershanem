"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/panel-teacher";
import { canTeacherAccessMaterial } from "@/lib/panel/materials";
import { logAudit } from "@/lib/audit";

const TYPES = ["PDF", "VIDEO", "LINK", "FILE", "NOTE"] as const;
const VIS = ["CLASSROOM", "STUDENTS", "TEACHERS", "PRIVATE"] as const;

const CreateSchema = z.object({
  title: z.string().trim().min(2, "Başlık en az 2 karakter olmalı").max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  type: z.enum(TYPES),
  url: z.string().trim().url("Geçerli bir URL girin").max(2000).optional().or(z.literal("")),
  classroomId: z.string().trim().min(1).optional().or(z.literal("")),
  courseId: z.string().trim().min(1).optional().or(z.literal("")),
  subject: z.string().trim().max(80).optional().or(z.literal("")),
  visibility: z.enum(VIS).default("CLASSROOM"),
  isPublished: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional(),
});

type ActionState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };

function fd(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  return typeof v === "string" ? v : undefined;
}

export async function createMaterialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ctx, teacher } = await requireTeacher();
  if (!teacher) return { ok: false, error: "Öğretmen kaydı bulunamadı." };

  const parsed = CreateSchema.safeParse({
    title: fd(formData, "title"),
    description: fd(formData, "description"),
    type: fd(formData, "type"),
    url: fd(formData, "url"),
    classroomId: fd(formData, "classroomId"),
    courseId: fd(formData, "courseId"),
    subject: fd(formData, "subject"),
    visibility: fd(formData, "visibility") ?? "CLASSROOM",
    isPublished: fd(formData, "isPublished"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "_");
      if (!fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, error: "Form geçerli değil.", fieldErrors };
  }
  const data = parsed.data;

  // Classroom ownership gate.
  const classroomId = data.classroomId || null;
  if (classroomId) {
    const link = await prisma.classroomTeacher.findUnique({
      where: { classroomId_teacherId: { classroomId, teacherId: teacher.id } },
      select: { teacherId: true },
    });
    if (!link) return { ok: false, error: "Bu sınıfa materyal ekleme yetkiniz yok." };
  }

  // Course existence (if provided) — basic sanity check.
  const courseId = data.courseId || null;
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) return { ok: false, error: "Seçilen ders bulunamadı." };
  }

  const url = (data.url || "").trim() || null;
  const isPublished = data.isPublished === "on" || data.isPublished === "true";

  // PDF/FILE/VIDEO/LINK require url; NOTE may have only description.
  if (data.type !== "NOTE" && !url) {
    return {
      ok: false,
      error: "Bu tür için URL zorunludur.",
      fieldErrors: { url: "URL gerekli." },
    };
  }
  if (data.type === "NOTE" && !(data.description ?? "").trim()) {
    return {
      ok: false,
      error: "Not için açıklama zorunludur.",
      fieldErrors: { description: "Not içeriği gerekli." },
    };
  }

  const created = await prisma.material.create({
    data: {
      title: data.title,
      description: (data.description ?? "").trim() || null,
      type: data.type,
      url,
      fileUrl: null,
      subject: (data.subject ?? "").trim() || null,
      courseId,
      classroomId,
      teacherId: teacher.id,
      createdById: ctx.userId,
      visibility: data.visibility,
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
    select: { id: true, title: true },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Material",
    entityId: created.id,
    action: "MATERIAL_CREATE",
    summary: created.title,
    payload: {
      type: data.type,
      classroomId,
      courseId,
      visibility: data.visibility,
      isPublished,
    },
  });

  revalidatePath("/panel/ogretmen/materyaller");
  if (classroomId) revalidatePath(`/panel/ogretmen/siniflarim/${classroomId}`);
  redirect("/panel/ogretmen/materyaller");
}

const ToggleSchema = z.object({
  id: z.string().min(1),
});

export async function archiveMaterialAction(formData: FormData): Promise<void> {
  const { ctx, teacher } = await requireTeacher();
  if (!teacher) return;
  const parsed = ToggleSchema.safeParse({ id: fd(formData, "id") });
  if (!parsed.success) return;

  const ok = await canTeacherAccessMaterial(teacher.id, parsed.data.id, { write: true });
  if (!ok) return;

  await prisma.material.update({
    where: { id: parsed.data.id },
    data: { isArchived: true, isPublished: false },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Material",
    entityId: parsed.data.id,
    action: "MATERIAL_ARCHIVE",
  });
  revalidatePath("/panel/ogretmen/materyaller");
}

export async function deleteMaterialAction(formData: FormData): Promise<void> {
  const { ctx, teacher } = await requireTeacher();
  if (!teacher) return;
  const parsed = ToggleSchema.safeParse({ id: fd(formData, "id") });
  if (!parsed.success) return;

  const ok = await canTeacherAccessMaterial(teacher.id, parsed.data.id, { write: true });
  if (!ok) return;

  await prisma.material.delete({ where: { id: parsed.data.id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Material",
    entityId: parsed.data.id,
    action: "MATERIAL_DELETE",
  });
  revalidatePath("/panel/ogretmen/materyaller");
}

export async function togglePublishMaterialAction(formData: FormData): Promise<void> {
  const { ctx, teacher } = await requireTeacher();
  if (!teacher) return;
  const parsed = ToggleSchema.safeParse({ id: fd(formData, "id") });
  if (!parsed.success) return;

  const ok = await canTeacherAccessMaterial(teacher.id, parsed.data.id, { write: true });
  if (!ok) return;

  const current = await prisma.material.findUnique({
    where: { id: parsed.data.id },
    select: { isPublished: true },
  });
  if (!current) return;
  const next = !current.isPublished;
  await prisma.material.update({
    where: { id: parsed.data.id },
    data: { isPublished: next, publishedAt: next ? new Date() : null },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Material",
    entityId: parsed.data.id,
    action: next ? "MATERIAL_PUBLISH" : "MATERIAL_UNPUBLISH",
  });
  revalidatePath("/panel/ogretmen/materyaller");
}
