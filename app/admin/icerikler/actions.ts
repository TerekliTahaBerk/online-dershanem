"use server";

import { ContentType, CourseStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalInt(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function withFlash(returnTo: string, updated: string) {
  const [pathname, queryString = ""] = returnTo.split("?");
  const params = new URLSearchParams(queryString);
  params.set("updated", updated);
  return `${pathname}?${params.toString()}`;
}

async function requireAdminUserId() {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/giris");
  return userId;
}

export async function createCourseAction(formData: FormData) {
  const userId = await requireAdminUserId();
  const returnTo = readString(formData, "returnTo") || "/admin/icerikler";

  const title = readString(formData, "title");
  const slug = readString(formData, "slug");
  const subject = readString(formData, "subject");
  const examType = readString(formData, "examType");
  const levelLabel = readString(formData, "levelLabel");
  const description = readString(formData, "description");
  const estimatedMinutes = readOptionalInt(formData, "estimatedMinutes");
  const status = readString(formData, "status") as CourseStatus;

  if (!title || !slug || !subject || !Object.values(CourseStatus).includes(status)) {
    redirect(withFlash(returnTo, "course-error"));
  }

  const exists = await prisma.course.findUnique({ where: { slug } });
  if (exists) {
    redirect(withFlash(returnTo, "course-slug-taken"));
  }

  const course = await prisma.course.create({
    data: {
      title,
      slug,
      subject,
      examType: examType || null,
      levelLabel: levelLabel || null,
      description: description || null,
      estimatedMinutes,
      status
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorType: "USER",
      entityType: "course",
      entityId: course.id,
      action: "course.created",
      summary: `${title} kursu olusturuldu.`
    }
  });

  revalidatePath("/admin/icerikler");
  revalidatePath("/admin");
  redirect(withFlash(returnTo, "course-created"));
}

export async function createModuleAction(formData: FormData) {
  const userId = await requireAdminUserId();
  const returnTo = readString(formData, "returnTo") || "/admin/icerikler";
  const courseId = readString(formData, "courseId");
  const title = readString(formData, "title");
  const description = readString(formData, "description");

  if (!courseId || !title) {
    redirect(withFlash(returnTo, "module-error"));
  }

  const existing = await prisma.courseModule.findFirst({
    where: { courseId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true }
  });

  const module = await prisma.courseModule.create({
    data: {
      courseId,
      title,
      description: description || null,
      orderIndex: (existing?.orderIndex ?? -1) + 1
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorType: "USER",
      entityType: "course-module",
      entityId: module.id,
      action: "course-module.created",
      summary: `${title} modulu eklendi.`
    }
  });

  revalidatePath("/admin/icerikler");
  redirect(withFlash(returnTo, "module-created"));
}

export async function createContentAction(formData: FormData) {
  const userId = await requireAdminUserId();
  const returnTo = readString(formData, "returnTo") || "/admin/icerikler";
  const moduleId = readString(formData, "moduleId");
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const contentType = readString(formData, "contentType") as ContentType;
  const durationMinutes = readOptionalInt(formData, "durationMinutes");
  const videoUrl = readString(formData, "videoUrl");
  const fileUrl = readString(formData, "fileUrl");
  const externalUrl = readString(formData, "externalUrl");
  const liveStartsAt = readOptionalDate(formData, "liveStartsAt");
  const liveEndsAt = readOptionalDate(formData, "liveEndsAt");
  const status = readString(formData, "status") as CourseStatus;

  if (
    !moduleId ||
    !title ||
    !Object.values(ContentType).includes(contentType) ||
    !Object.values(CourseStatus).includes(status)
  ) {
    redirect(withFlash(returnTo, "content-error"));
  }

  const existing = await prisma.courseContent.findFirst({
    where: { moduleId },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true }
  });

  const content = await prisma.courseContent.create({
    data: {
      moduleId,
      title,
      description: description || null,
      contentType,
      orderIndex: (existing?.orderIndex ?? -1) + 1,
      durationMinutes,
      status,
      liveStartsAt,
      liveEndsAt,
      videoUrl: videoUrl || null,
      fileUrl: fileUrl || null,
      externalUrl: externalUrl || null,
      createdById: userId
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorType: "USER",
      entityType: "course-content",
      entityId: content.id,
      action: "course-content.created",
      summary: `${title} icerigi eklendi.`
    }
  });

  revalidatePath("/admin/icerikler");
  revalidatePath("/admin");
  redirect(withFlash(returnTo, "content-created"));
}

export async function linkCourseToPackageAction(formData: FormData) {
  const userId = await requireAdminUserId();
  const returnTo = readString(formData, "returnTo") || "/admin/icerikler";
  const courseId = readString(formData, "courseId");
  const packageId = readString(formData, "packageId");

  if (!courseId || !packageId) {
    redirect(withFlash(returnTo, "package-link-error"));
  }

  await prisma.packageCourse.upsert({
    where: { packageId_courseId: { packageId, courseId } },
    update: {},
    create: { packageId, courseId }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorType: "USER",
      entityType: "package-course",
      entityId: `${packageId}:${courseId}`,
      action: "package-course.linked",
      summary: "Kurs pakete baglandi."
    }
  });

  revalidatePath("/admin/icerikler");
  revalidatePath("/admin/paketler");
  redirect(withFlash(returnTo, "package-linked"));
}

export async function updateCourseStatusAction(formData: FormData) {
  const userId = await requireAdminUserId();
  const returnTo = readString(formData, "returnTo") || "/admin/icerikler";
  const courseId = readString(formData, "courseId");
  const status = readString(formData, "status") as CourseStatus;

  if (!courseId || !Object.values(CourseStatus).includes(status)) {
    redirect(withFlash(returnTo, "course-status-error"));
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { status },
    select: { id: true, title: true }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      actorType: "USER",
      entityType: "course",
      entityId: updated.id,
      action: "course.status.updated",
      summary: `${updated.title} durumu ${status} olarak guncellendi.`
    }
  });

  revalidatePath("/admin/icerikler");
  revalidatePath("/admin");
  redirect(withFlash(returnTo, "course-status-updated"));
}
