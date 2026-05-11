"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import { broadcastNotification, parentUserIdsForStudents } from "@/lib/notifications";

const recordSchema = z.object({
  lessonId: z.string().min(1),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
        minutesLate: z.coerce.number().int().nonnegative().optional().nullable(),
        notes: z.string().max(500).optional().nullable(),
      }),
    )
    .min(1),
});

/**
 * Bir ders için yoklama kaydı (öğretmen). Mevcut Attendance rows
 * upsert edilir (lessonId+studentId tekil).
 */
export const recordLessonAttendanceAction = defineAction({
  input: recordSchema,
  permission: "lessons.attendance.write",
  audit: { entityType: "Attendance", action: "record", entityId: async ({ input }) => input.lessonId },
  async handler({ input, ctx }) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
      select: { id: true, scheduledAt: true, teacher: { select: { userId: true } } },
    });
    if (!lesson) throw new Error("Ders bulunamadı");

    // Teacher rolündeki kullanıcı sadece kendi dersine yoklama girebilir.
    if (ctx.user.role === "TEACHER" && lesson.teacher.userId !== ctx.user.id) {
      throw new Error("Bu derse yoklama girme yetkiniz yok.");
    }

    for (const e of input.entries) {
      const existing = await prisma.attendance.findFirst({
        where: { lessonId: input.lessonId, studentId: e.studentId, context: "LESSON" },
        select: { id: true },
      });
      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: e.status,
            minutesLate: e.minutesLate ?? null,
            notes: e.notes ?? null,
            recordedById: ctx.user.id,
          },
        });
      } else {
        await prisma.attendance.create({
          data: {
            studentId: e.studentId,
            lessonId: input.lessonId,
            context: "LESSON",
            sessionDate: lesson.scheduledAt,
            status: e.status,
            minutesLate: e.minutesLate ?? null,
            notes: e.notes ?? null,
            recordedById: ctx.user.id,
          },
        });
      }
    }

    revalidatePath("/v2/ogretmen/yoklama");
    revalidatePath(`/v2/ogretmen/dersler/${input.lessonId}`);

    // 🔔 Notify ABSENT students (and their parents via student userId chain — student panel only here)
    const absentIds = input.entries
      .filter((e) => e.status === "ABSENT")
      .map((e) => e.studentId);
    if (absentIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: absentIds } },
        select: { userId: true },
      });
      const userIds = students.map((s) => s.userId).filter((v): v is string => !!v);
      const dateText = lesson.scheduledAt.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      if (userIds.length > 0) {
        await broadcastNotification(userIds, {
          type: "LESSON",
          priority: "HIGH",
          title: "Devamsızlık kaydedildi",
          body: `${dateText} dersine katılmadığınız işaretlendi.`,
          href: "/v2/panel/devamsizlik",
        });
      }

      // 🔔 Parents — HIGH priority for absences
      const parentIds = await parentUserIdsForStudents(absentIds);
      if (parentIds.length > 0) {
        await broadcastNotification(parentIds, {
          type: "LESSON",
          priority: "HIGH",
          title: "Çocuğunuz derse katılmadı",
          body: `${dateText} dersine katılmadığı işaretlendi.`,
          href: "/v2/veli/devamsizlik",
        });
      }
    }

    return { count: input.entries.length };
  },
});
