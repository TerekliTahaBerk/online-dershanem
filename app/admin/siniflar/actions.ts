"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const ClassroomSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter").max(120),
  branch: z.string().trim().max(80).optional().or(z.literal("")),
  level: z.enum(["LGS", "TYT", "AYT", "YDT", "MIXED"]).default("MIXED"),
  capacity: z.coerce.number().int().min(1).max(500).default(30),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export type ClassroomFormState =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | null;

export async function createClassroom(_prev: ClassroomFormState, formData: FormData): Promise<ClassroomFormState> {
  const session = await requireAdmin();
  const parsed = ClassroomSchema.safeParse({
    name: formData.get("name"),
    branch: formData.get("branch") || "",
    level: formData.get("level") || "MIXED",
    capacity: formData.get("capacity") || 30,
    description: formData.get("description") || "",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form" };

  try {
    const c = await prisma.classroom.create({
      data: {
        name: parsed.data.name,
        branch: parsed.data.branch || null,
        level: parsed.data.level,
        capacity: parsed.data.capacity,
        description: parsed.data.description || null,
        isActive: parsed.data.isActive,
      },
    });
    await auditLog({
      actorUserId: session.user!.id,
      action: "CLASSROOM_CREATE",
      entityType: "Classroom",
      entityId: c.id,
      summary: `Sınıf oluşturuldu: ${c.name}`,
    });
    revalidatePath("/admin/siniflar");
    return { ok: true, id: c.id };
  } catch (err: any) {
    if (err?.code === "P2002") return { ok: false, error: "Bu ad+şube kombinasyonu zaten var." };
    return { ok: false, error: "Sınıf oluşturulamadı." };
  }
}

export async function updateClassroom(id: string, _prev: ClassroomFormState, formData: FormData): Promise<ClassroomFormState> {
  const session = await requireAdmin();
  const parsed = ClassroomSchema.safeParse({
    name: formData.get("name"),
    branch: formData.get("branch") || "",
    level: formData.get("level") || "MIXED",
    capacity: formData.get("capacity") || 30,
    description: formData.get("description") || "",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Geçersiz form" };

  try {
    await prisma.classroom.update({
      where: { id },
      data: {
        name: parsed.data.name,
        branch: parsed.data.branch || null,
        level: parsed.data.level,
        capacity: parsed.data.capacity,
        description: parsed.data.description || null,
        isActive: parsed.data.isActive,
      },
    });
    await auditLog({
      actorUserId: session.user!.id,
      action: "CLASSROOM_UPDATE",
      entityType: "Classroom",
      entityId: id,
    });
    revalidatePath("/admin/siniflar");
    revalidatePath(`/admin/siniflar/${id}`);
    return { ok: true, id };
  } catch (err: any) {
    if (err?.code === "P2002") return { ok: false, error: "Bu ad+şube kombinasyonu zaten var." };
    return { ok: false, error: "Sınıf güncellenemedi." };
  }
}

export async function deleteClassroom(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.classroom.delete({ where: { id } });
  await auditLog({
    actorUserId: session.user!.id,
    action: "CLASSROOM_DELETE",
    entityType: "Classroom",
    entityId: id,
  });
  revalidatePath("/admin/siniflar");
  redirect("/admin/siniflar");
}

// ── Teacher / Student assignments ──────────────────────────

export async function addTeacherToClassroom(formData: FormData) {
  await requireAdmin();
  const classroomId = String(formData.get("classroomId") || "");
  const teacherId = String(formData.get("teacherId") || "");
  const isLead = formData.get("isLead") === "on";
  const subject = String(formData.get("subject") || "") || null;
  if (!classroomId || !teacherId) return;
  await prisma.classroomTeacher.upsert({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    create: { classroomId, teacherId, isLead, subject: subject || null },
    update: { isLead, subject: subject || null },
  });
  revalidatePath(`/admin/siniflar/${classroomId}`);
}

export async function removeTeacherFromClassroom(formData: FormData) {
  await requireAdmin();
  const classroomId = String(formData.get("classroomId") || "");
  const teacherId = String(formData.get("teacherId") || "");
  if (!classroomId || !teacherId) return;
  await prisma.classroomTeacher.delete({
    where: { classroomId_teacherId: { classroomId, teacherId } },
  });
  revalidatePath(`/admin/siniflar/${classroomId}`);
}

export async function addStudentToClassroom(formData: FormData) {
  await requireAdmin();
  const classroomId = String(formData.get("classroomId") || "");
  const studentId = String(formData.get("studentId") || "");
  if (!classroomId || !studentId) return;
  await prisma.classroomStudent.upsert({
    where: { classroomId_studentId: { classroomId, studentId } },
    create: { classroomId, studentId },
    update: { leftAt: null },
  });
  revalidatePath(`/admin/siniflar/${classroomId}`);
}

export async function removeStudentFromClassroom(formData: FormData) {
  await requireAdmin();
  const classroomId = String(formData.get("classroomId") || "");
  const studentId = String(formData.get("studentId") || "");
  const hard = formData.get("hard") === "1";
  if (!classroomId || !studentId) return;
  if (hard) {
    await prisma.classroomStudent.delete({
      where: { classroomId_studentId: { classroomId, studentId } },
    });
  } else {
    await prisma.classroomStudent.update({
      where: { classroomId_studentId: { classroomId, studentId } },
      data: { leftAt: new Date() },
    });
  }
  revalidatePath(`/admin/siniflar/${classroomId}`);
}
