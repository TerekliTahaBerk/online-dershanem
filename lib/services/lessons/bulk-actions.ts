"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";

const bulkStatusSchema = z.object({
  lessonIds: z.array(z.string().cuid()).min(1).max(500),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]),
});

export const bulkUpdateLessonStatusAction = defineAction({
  input: bulkStatusSchema,
  permission: "lessons.write",
  audit: {
    entityType: "Lesson",
    action: "bulk_status",
    entityId: ({ input }) => `${input.lessonIds.length}_to_${input.status}`,
  },
  async handler({ input }) {
    const r = await prisma.lesson.updateMany({
      where: { id: { in: input.lessonIds } },
      data: { status: input.status },
    });
    revalidatePath("/v2/admin/dersler");
    return { count: r.count };
  },
});

const bulkRescheduleSchema = z.object({
  lessonIds: z.array(z.string().cuid()).min(1).max(500),
  /** ISO datetime — used as the new scheduledAt anchor; per-lesson preserves time-of-day on the new date */
  newDate: z.string().min(1),
});

export const bulkRescheduleLessonsAction = defineAction({
  input: bulkRescheduleSchema,
  permission: "lessons.write",
  audit: {
    entityType: "Lesson",
    action: "bulk_reschedule",
    entityId: ({ input }) => `${input.lessonIds.length}_to_${input.newDate}`,
  },
  async handler({ input }) {
    const target = new Date(input.newDate);
    const lessons = await prisma.lesson.findMany({
      where: { id: { in: input.lessonIds } },
      select: { id: true, scheduledAt: true },
    });
    let count = 0;
    await prisma.$transaction(
      lessons.map((l) => {
        const next = new Date(target);
        next.setHours(
          l.scheduledAt.getHours(),
          l.scheduledAt.getMinutes(),
          0,
          0
        );
        count++;
        return prisma.lesson.update({
          where: { id: l.id },
          data: { scheduledAt: next, status: "SCHEDULED" },
        });
      })
    );
    revalidatePath("/v2/admin/dersler");
    return { count };
  },
});

const bulkDeleteSchema = z.object({
  lessonIds: z.array(z.string().cuid()).min(1).max(200),
});

export const bulkDeleteLessonsAction = defineAction({
  input: bulkDeleteSchema,
  permission: "lessons.delete",
  audit: {
    entityType: "Lesson",
    action: "bulk_delete",
    entityId: ({ input }) => `count_${input.lessonIds.length}`,
  },
  async handler({ input }) {
    const r = await prisma.lesson.deleteMany({
      where: { id: { in: input.lessonIds } },
    });
    revalidatePath("/v2/admin/dersler");
    return { count: r.count };
  },
});
