"use server";

import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, CourseStatus } from "@prisma/client";

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
    .toLocaleLowerCase("tr-TR")
    .replace(/\u0131/g, "i")
    .replace(/\u015f/g, "s")
    .replace(/\u011f/g, "g")
    .replace(/\u00fc/g, "u")
    .replace(/\u00f6/g, "o")
    .replace(/\u00e7/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const seed = base || "ders";
  let slug = seed;
  let n = 1;
  while (n < 50) {
    const ex = await prisma.course.findUnique({ where: { slug }, select: { id: true } });
    if (!ex || ex.id === ignoreId) return slug;
    n += 1;
    slug = seed + "-" + n;
  }
  return seed + "-" + Date.now();
}
const ALLOWED_STATUS = new Set<CourseStatus>(["DRAFT", "PUBLISHED", "ARCHIVED"]);
function parseStatus(raw: string): CourseStatus {
  return ALLOWED_STATUS.has(raw as CourseStatus) ? (raw as CourseStatus) : "PUBLISHED";
}

export async function createCourseAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const title = readStr(fd, "title");
  if (!title) throw new Error("Ders adı zorunlu");
  const subject = readStr(fd, "subject");
  if (!subject) throw new Error("Branş zorunlu");

  if (fd.get("allowDuplicate") !== "1") {
    const dup = await prisma.course.findFirst({
      where: {
        title: { equals: title, mode: "insensitive" },
        subject: { equals: subject, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (dup) {
      throw new Error(
        "Aynı başlık ve branşa sahip bir ders zaten var. Yine de oluşturmak için \"Yine de oluştur\" kutusunu işaretleyip tekrar gönderin. (id=" + dup.id + ")",
      );
    }
  }

  const defaultClassroomId = readOpt(fd, "defaultClassroomId");
  if (defaultClassroomId) {
    const c = await prisma.classroom.findUnique({ where: { id: defaultClassroomId }, select: { id: true } });
    if (!c) throw new Error("Seçilen default sınıf bulunamadı");
  }
  const defaultTeacherId = readOpt(fd, "defaultTeacherId");
  if (defaultTeacherId) {
    const t = await prisma.teacher.findUnique({ where: { id: defaultTeacherId }, select: { id: true } });
    if (!t) throw new Error("Seçilen default öğretmen bulunamadı");
  }

  const slug = await uniqueSlug(slugify(readStr(fd, "slug") || title));
  const minutes = parseInt(readStr(fd, "estimatedMinutes") || "0", 10);
  const status = parseStatus(readStr(fd, "status"));
  const isActive = fd.get("isActive") !== null;

  const created = await prisma.course.create({
    data: {
      title,
      slug,
      subject,
      description: readOpt(fd, "description"),
      examType: readOpt(fd, "examType"),
      levelLabel: readOpt(fd, "levelLabel"),
      estimatedMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      status,
      isActive,
      defaultTeacherId,
      defaultClassroomId,
    },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Course",
    entityId: created.id,
    action: "COURSE_CREATE",
    summary: "Ders oluşturuldu: " + created.title,
    payload: {
      title: created.title,
      subject: created.subject,
      status: created.status,
      isActive: created.isActive,
      defaultClassroomId: created.defaultClassroomId,
      defaultTeacherId: created.defaultTeacherId,
    } satisfies Prisma.InputJsonValue,
  });

  revalidatePath("/panel/admin/dersler");
  redirect("/panel/admin/dersler/" + created.id);
}

export async function updateCourseAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const before = await prisma.course.findUnique({ where: { id } });
  if (!before) throw new Error("Ders bulunamadı");

  const title = readStr(fd, "title");
  if (!title) throw new Error("Ders adı zorunlu");
  const subject = readStr(fd, "subject");
  if (!subject) throw new Error("Branş zorunlu");

  if (fd.get("allowDuplicate") !== "1") {
    const dup = await prisma.course.findFirst({
      where: {
        id: { not: id },
        title: { equals: title, mode: "insensitive" },
        subject: { equals: subject, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (dup) {
      throw new Error(
        "Aynı başlık ve branşa sahip başka bir ders var. Yine de güncellemek için \"Yine de kaydet\" kutusunu işaretleyip tekrar gönderin. (id=" + dup.id + ")",
      );
    }
  }

  const defaultClassroomId = readOpt(fd, "defaultClassroomId");
  if (defaultClassroomId) {
    const c = await prisma.classroom.findUnique({ where: { id: defaultClassroomId }, select: { id: true } });
    if (!c) throw new Error("Seçilen default sınıf bulunamadı");
  }
  const defaultTeacherId = readOpt(fd, "defaultTeacherId");
  if (defaultTeacherId) {
    const t = await prisma.teacher.findUnique({ where: { id: defaultTeacherId }, select: { id: true } });
    if (!t) throw new Error("Seçilen default öğretmen bulunamadı");
  }

  const slugSeed = slugify(readStr(fd, "slug") || title);
  const slug = slugSeed === before.slug ? before.slug : await uniqueSlug(slugSeed, id);
  const minutes = parseInt(readStr(fd, "estimatedMinutes") || "0", 10);
  const status = parseStatus(readStr(fd, "status"));
  const isActive = fd.get("isActive") !== null;

  const data: Prisma.CourseUpdateInput = {
    title,
    slug,
    subject,
    description: readOpt(fd, "description"),
    examType: readOpt(fd, "examType"),
    levelLabel: readOpt(fd, "levelLabel"),
    estimatedMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
    status,
    isActive,
    defaultTeacher: defaultTeacherId
      ? { connect: { id: defaultTeacherId } }
      : { disconnect: true },
    defaultClassroom: defaultClassroomId
      ? { connect: { id: defaultClassroomId } }
      : { disconnect: true },
  };

  const after = await prisma.course.update({ where: { id }, data });

  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const watch = [
    "title",
    "slug",
    "subject",
    "description",
    "examType",
    "levelLabel",
    "estimatedMinutes",
    "status",
    "isActive",
    "defaultTeacherId",
    "defaultClassroomId",
  ] as const;
  for (const k of watch) {
    if (before[k] !== after[k]) {
      diff[k] = { from: before[k] as unknown, to: after[k] as unknown };
    }
  }

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Course",
    entityId: id,
    action: "COURSE_UPDATE",
    summary: "Ders güncellendi: " + after.title,
    payload: { diff } as Prisma.InputJsonValue,
  });

  revalidatePath("/panel/admin/dersler");
  revalidatePath("/panel/admin/dersler/" + id);
  redirect("/panel/admin/dersler/" + id);
}

export async function archiveCourseAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const before = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, isActive: true },
  });
  if (!before) throw new Error("Ders bulunamadı");

  await prisma.course.update({ where: { id }, data: { isActive: false, status: "ARCHIVED" } });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Course",
    entityId: id,
    action: "COURSE_ARCHIVE",
    summary: "Ders arşivlendi: " + before.title,
    payload: {
      from: { status: before.status, isActive: before.isActive },
      to: { status: "ARCHIVED", isActive: false },
    } satisfies Prisma.InputJsonValue,
  });

  revalidatePath("/panel/admin/dersler");
  revalidatePath("/panel/admin/dersler/" + id);
}

export async function reactivateCourseAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const before = await prisma.course.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, isActive: true },
  });
  if (!before) throw new Error("Ders bulunamadı");

  await prisma.course.update({ where: { id }, data: { isActive: true, status: "PUBLISHED" } });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Course",
    entityId: id,
    action: "COURSE_REACTIVATE",
    summary: "Ders yeniden yayınlandı: " + before.title,
    payload: {
      from: { status: before.status, isActive: before.isActive },
      to: { status: "PUBLISHED", isActive: true },
    } satisfies Prisma.InputJsonValue,
  });

  revalidatePath("/panel/admin/dersler");
  revalidatePath("/panel/admin/dersler/" + id);
}

export async function toggleCourseActiveAction(id: string, makeActive: boolean) {
  if (makeActive) {
    await reactivateCourseAction(id);
  } else {
    await archiveCourseAction(id);
  }
}

export async function deleteCourseAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const before = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          lessons: true,
          packageCourses: true,
          modules: true,
          studentProgress: true,
          materials: true,
        },
      },
    },
  });
  if (!before) throw new Error("Ders bulunamadı");

  const inUse =
    before._count.lessons +
      before._count.packageCourses +
      before._count.modules +
      before._count.studentProgress +
      before._count.materials >
    0;

  if (inUse) {
    await prisma.course.update({ where: { id }, data: { isActive: false, status: "ARCHIVED" } });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "Course",
      entityId: id,
      action: "COURSE_SOFT_DELETE",
      summary: "Ders soft-arşiv: " + before.title + " (kullanımda)",
      payload: { reason: "in-use", counts: before._count } satisfies Prisma.InputJsonValue,
    });
    revalidatePath("/panel/admin/dersler");
    redirect("/panel/admin/dersler/" + id);
  }

  await prisma.course.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Course",
    entityId: id,
    action: "COURSE_DELETE",
    summary: "Ders silindi: " + before.title,
    payload: { hard: true, counts: before._count } satisfies Prisma.InputJsonValue,
  });

  revalidatePath("/panel/admin/dersler");
  redirect("/panel/admin/dersler");
}
