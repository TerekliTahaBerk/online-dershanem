"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CourseStatus } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function readOpt(fd: FormData, key: string): string | null {
  const v = readStr(fd, key);
  return v || null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base || "ders";
  let n = 1;
  while (true) {
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export async function createCourseAction(fd: FormData) {
  await requirePanelRole("admin");
  const title = readStr(fd, "title");
  if (!title) throw new Error("Ders adı zorunlu");
  const subject = readStr(fd, "subject");
  if (!subject) throw new Error("Branş zorunlu");

  const baseSlug = slugify(readStr(fd, "slug") || title);
  const slug = await uniqueSlug(baseSlug);

  const minutes = parseInt(readStr(fd, "estimatedMinutes") || "0", 10);
  const created = await prisma.course.create({
    data: {
      title,
      slug,
      subject,
      description: readOpt(fd, "description"),
      examType: readOpt(fd, "examType"),
      levelLabel: readOpt(fd, "levelLabel"),
      estimatedMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      status: (readStr(fd, "status") as CourseStatus) || "PUBLISHED",
      isActive: fd.get("isActive") !== "off",
      defaultTeacherId: readOpt(fd, "defaultTeacherId"),
      defaultClassroomId: readOpt(fd, "defaultClassroomId"),
    },
  });

  revalidatePath("/panel/admin/dersler");
  redirect(`/panel/admin/dersler/${created.id}`);
}

export async function updateCourseAction(id: string, fd: FormData) {
  await requirePanelRole("admin");
  const title = readStr(fd, "title");
  if (!title) throw new Error("Ders adı zorunlu");
  const subject = readStr(fd, "subject");
  if (!subject) throw new Error("Branş zorunlu");

  // slug değişirse benzersizleştir
  const rawSlug = slugify(readStr(fd, "slug") || title);
  const slug = await uniqueSlug(rawSlug, id);

  const minutes = parseInt(readStr(fd, "estimatedMinutes") || "0", 10);
  await prisma.course.update({
    where: { id },
    data: {
      title,
      slug,
      subject,
      description: readOpt(fd, "description"),
      examType: readOpt(fd, "examType"),
      levelLabel: readOpt(fd, "levelLabel"),
      estimatedMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      status: (readStr(fd, "status") as CourseStatus) || "PUBLISHED",
      isActive: fd.get("isActive") !== "off",
      defaultTeacherId: readOpt(fd, "defaultTeacherId"),
      defaultClassroomId: readOpt(fd, "defaultClassroomId"),
    },
  });

  revalidatePath("/panel/admin/dersler");
  revalidatePath(`/panel/admin/dersler/${id}`);
  redirect(`/panel/admin/dersler/${id}`);
}

export async function toggleCourseActiveAction(id: string, makeActive: boolean) {
  await requirePanelRole("admin");
  await prisma.course.update({ where: { id }, data: { isActive: makeActive } });
  revalidatePath("/panel/admin/dersler");
  revalidatePath(`/panel/admin/dersler/${id}`);
}

export async function deleteCourseAction(id: string) {
  const ctx = await requirePanelRole("admin");
  // Eğer kullanılıyorsa pasifleştir, değilse sil.
  const c = await prisma.course.findUnique({
    where: { id },
    select: {
      title: true,
      _count: { select: { lessons: true, packageCourses: true, modules: true, studentProgress: true } },
    },
  });
  const used =
    (c?._count.lessons ?? 0) +
    (c?._count.packageCourses ?? 0) +
    (c?._count.modules ?? 0) +
    (c?._count.studentProgress ?? 0);
  if (used > 0) {
    await prisma.course.update({ where: { id }, data: { isActive: false, status: "ARCHIVED" } });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "Course",
      entityId: id,
      action: "COURSE_ARCHIVE",
      summary: `${c?.title ?? id} arşivlendi (kullanım: ${used} kayıt)`,
    });
  } else {
    await prisma.course.delete({ where: { id } });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "Course",
      entityId: id,
      action: "COURSE_DELETE",
      summary: `${c?.title ?? id} kalıcı silindi`,
    });
  }
  revalidatePath("/panel/admin/dersler");
  redirect("/panel/admin/dersler");
}
