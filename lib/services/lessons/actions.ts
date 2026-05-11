"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import { createNotification, broadcastNotification, parentUserIdsForStudents } from "@/lib/notifications";
import {
  lessonCreateSchema,
  lessonUpdateSchema,
  lessonDeleteSchema,
} from "./schemas";

export const createLessonAction = defineAction({
  input: lessonCreateSchema,
  permission: "lessons.write",
  audit: { entityType: "Lesson", action: "create", entityId: ({ output }) => (output as any)?.id ?? "—" },
  async handler({ input }) {
    const l = await prisma.lesson.create({
      data: {
        studentId: input.studentId,
        teacherId: input.teacherId,
        packageId: input.packageId ?? null,
        classroomId: input.classroomId ?? null,
        title: input.title ?? null,
        subject: input.subject ?? null,
        scheduledAt: input.scheduledAt,
        duration: input.duration,
        googleMeetLink: input.googleMeetLink ?? null,
        status: input.status,
        notes: input.notes ?? null,
      },
      select: { id: true },
    });

    // 🔔 Notify the student
    const stu = await prisma.student.findUnique({
      where: { id: input.studentId },
      select: { userId: true, fullName: true },
    });
    if (stu?.userId && input.status !== "CANCELLED") {
      const dateText = input.scheduledAt.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      await createNotification({
        userId: stu.userId,
        type: "LESSON",
        priority: "NORMAL",
        title: `Yeni ders programlandı`,
        body: `${input.title ?? input.subject ?? "Ders"} · ${dateText}`,
        href: "/v2/panel/dersler",
      });

      // 🔔 Parents
      const parentIds = await parentUserIdsForStudents([input.studentId]);
      if (parentIds.length > 0) {
        await broadcastNotification(parentIds, {
          type: "LESSON",
          priority: "LOW",
          title: `Çocuğunuza ders programlandı`,
          body: `${input.title ?? input.subject ?? "Ders"} · ${dateText}`,
          href: "/v2/veli/dersler",
        });
      }
    }

    revalidatePath("/v2/admin/dersler");
    return l;
  },
});

export const updateLessonAction = defineAction({
  input: lessonUpdateSchema,
  permission: "lessons.write",
  audit: { entityType: "Lesson", action: "update", entityId: ({ input }) => input.id },
  async handler({ input }) {
    const { id, ...rest } = input;
    const l = await prisma.lesson.update({
      where: { id },
      data: {
        ...(rest.studentId !== undefined && { studentId: rest.studentId }),
        ...(rest.teacherId !== undefined && { teacherId: rest.teacherId }),
        ...(rest.packageId !== undefined && { packageId: rest.packageId ?? null }),
        ...(rest.classroomId !== undefined && { classroomId: rest.classroomId ?? null }),
        ...(rest.title !== undefined && { title: rest.title ?? null }),
        ...(rest.subject !== undefined && { subject: rest.subject ?? null }),
        ...(rest.scheduledAt !== undefined && { scheduledAt: rest.scheduledAt }),
        ...(rest.duration !== undefined && { duration: rest.duration }),
        ...(rest.googleMeetLink !== undefined && { googleMeetLink: rest.googleMeetLink ?? null }),
        ...(rest.status !== undefined && { status: rest.status }),
        ...(rest.notes !== undefined && { notes: rest.notes ?? null }),
      },
      select: { id: true },
    });
    revalidatePath("/v2/admin/dersler");
    return l;
  },
});

export const deleteLessonAction = defineAction({
  input: lessonDeleteSchema,
  permission: "lessons.delete",
  audit: { entityType: "Lesson", action: "delete", entityId: ({ input }) => input.id },
  async handler({ input }) {
    await prisma.lesson.delete({ where: { id: input.id } });
    revalidatePath("/v2/admin/dersler");
    return { id: input.id };
  },
});
