"use server";

import { LessonStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readString, readTurkeyDatetime } from "@/lib/form-utils";
import {
  sendLessonScheduled,
  sendMeetLinkUpdated,
  sendLessonCompleted,
  sendLessonCancelled,
} from "@/lib/email";


function readOptionalDate(formData: FormData, key: string) {
  return readTurkeyDatetime(formData, key);
}

async function fetchLessonWithParties(lessonId: string) {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      student: { select: { fullName: true, email: true } },
      teacher: { select: { fullName: true, email: true } },
      package: { select: { name: true } },
    },
  });
}

export async function createLessonAction(formData: FormData) {
  const studentId = readString(formData, "studentId");
  const teacherId = readString(formData, "teacherId");
  const packageId = readString(formData, "packageId") || null;
  const title = readString(formData, "title") || null;
  const subject = readString(formData, "subject") || null;
  const scheduledAt = readOptionalDate(formData, "scheduledAt");
  const duration = parseInt(readString(formData, "duration") || "60", 10);
  const googleMeetLink = readString(formData, "googleMeetLink") || null;
  const notes = readString(formData, "notes") || null;

  if (!studentId || !teacherId || !scheduledAt) {
    redirect("/admin/dersler/yeni?error=missing");
  }

  const lesson = await prisma.lesson.create({
    data: {
      studentId,
      teacherId,
      packageId,
      title,
      subject,
      scheduledAt,
      duration: isNaN(duration) ? 60 : duration,
      googleMeetLink,
      notes,
      status: "SCHEDULED"
    },
    include: {
      student: { select: { fullName: true, email: true } },
      teacher: { select: { fullName: true, email: true } },
      package: { select: { name: true } },
    },
  });

  await sendLessonScheduled({
    studentEmail: lesson.student.email,
    studentName: lesson.student.fullName,
    teacherEmail: lesson.teacher.email,
    teacherName: lesson.teacher.fullName,
    scheduledAt: lesson.scheduledAt,
    duration: lesson.duration,
    googleMeetLink: lesson.googleMeetLink,
    packageName: lesson.package?.name,
  });

  // Faz 1 entegrasyonu: ders planlandığında öğrenci + bağlı veliler inbox bildirimi alır.
  try {
    const { publishInboxMessage } = await import("@/lib/inbox");
    const studentRow = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        userId: true,
        parents: { select: { parent: { select: { userId: true } } } },
      },
    });
    if (studentRow) {
      const recipients = new Set<string>();
      if (studentRow.userId) recipients.add(studentRow.userId);
      for (const p of studentRow.parents) {
        if (p.parent.userId) recipients.add(p.parent.userId);
      }
      const dateStr = lesson.scheduledAt.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      for (const recipientId of recipients) {
        await publishInboxMessage({
          recipientUserId: recipientId,
          category: "EDUCATION",
          priority: "NORMAL",
          title: "Yeni ders planlandı",
          body: `${lesson.title ?? "Ders"} · ${dateStr} · ${lesson.teacher.fullName}`,
          relatedEntityType: "Lesson",
          relatedEntityId: lesson.id,
        });
      }
    }
  } catch (err) {
    console.error("[lesson.create] inbox publish failed:", err);
  }

  revalidatePath("/admin/dersler");
  revalidatePath("/admin");
  redirect("/admin/dersler");
}

export async function updateLessonAction(formData: FormData) {
  const lessonId = readString(formData, "lessonId");
  const status = readString(formData, "status") as LessonStatus;
  const title = readString(formData, "title") || null;
  const subject = readString(formData, "subject") || null;
  const scheduledAt = readOptionalDate(formData, "scheduledAt");
  const googleMeetLink = readString(formData, "googleMeetLink") || null;
  const notes = readString(formData, "notes") || null;
  const returnTo = readString(formData, "returnTo") || "/admin/dersler";

  if (!lessonId || !Object.values(LessonStatus).includes(status)) {
    redirect("/admin/dersler?error=invalid");
  }

  // Fetch before update to detect changes
  const before = await fetchLessonWithParties(lessonId);

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      status,
      title,
      subject,
      ...(scheduledAt ? { scheduledAt } : {}),
      googleMeetLink,
      notes
    }
  });

  if (before) {
    const meetLinkAdded =
      googleMeetLink &&
      googleMeetLink !== before.googleMeetLink;

    if (status === "COMPLETED" && before.status !== "COMPLETED") {
      await sendLessonCompleted({
        studentEmail: before.student.email,
        studentName: before.student.fullName,
        teacherName: before.teacher.fullName,
        scheduledAt: scheduledAt ?? before.scheduledAt,
        notes,
      });
    } else if (meetLinkAdded) {
      await sendMeetLinkUpdated({
        studentEmail: before.student.email,
        studentName: before.student.fullName,
        teacherName: before.teacher.fullName,
        scheduledAt: scheduledAt ?? before.scheduledAt,
        googleMeetLink,
      });
    }
  }

  revalidatePath("/admin/dersler");
  revalidatePath("/admin");
  redirect(`${returnTo}&updated=lesson`);
}

export async function cancelLessonAction(formData: FormData) {
  const lessonId = readString(formData, "lessonId");
  const returnTo = readString(formData, "returnTo") || "/admin/dersler";

  if (!lessonId) redirect("/admin/dersler");

  const lesson = await fetchLessonWithParties(lessonId);

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: "CANCELLED" }
  });

  if (lesson) {
    await sendLessonCancelled({
      studentEmail: lesson.student.email,
      studentName: lesson.student.fullName,
      teacherEmail: lesson.teacher.email,
      teacherName: lesson.teacher.fullName,
      scheduledAt: lesson.scheduledAt,
    });
  }

  revalidatePath("/admin/dersler");
  revalidatePath("/admin");
  redirect(`${returnTo}&updated=cancelled`);
}

export async function deleteLessonAction(formData: FormData) {
  const lessonId = readString(formData, "lessonId");
  const returnTo = readString(formData, "returnTo") || "/admin/dersler";
  if (!lessonId) redirect("/admin/dersler");

  await prisma.lesson.delete({ where: { id: lessonId } });

  revalidatePath("/admin/dersler");
  revalidatePath("/admin");
  redirect(`${returnTo}?updated=deleted`);
}
