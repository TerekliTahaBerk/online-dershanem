"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";

const bulkStatusSchema = z.object({
  studentIds: z.array(z.string().cuid()).min(1).max(500),
  status: z.enum(["NEW", "FOLLOW_UP", "ACTIVE", "AT_RISK", "COMPLETED", "INACTIVE"]),
});

export const bulkUpdateStudentStatusAction = defineAction({
  input: bulkStatusSchema,
  permission: "students.write",
  audit: {
    entityType: "Student",
    action: "bulk_status",
    entityId: ({ input }) => `${input.studentIds.length}_to_${input.status}`,
  },
  async handler({ input }) {
    const r = await prisma.student.updateMany({
      where: { id: { in: input.studentIds } },
      data: { status: input.status },
    });
    revalidatePath("/v2/admin/ogrenciler");
    return { count: r.count };
  },
});

const bulkTagSchema = z.object({
  studentIds: z.array(z.string().cuid()).min(1).max(500),
  tagId: z.string().cuid(),
  mode: z.enum(["add", "remove"]).default("add"),
});

export const bulkToggleStudentTagAction = defineAction({
  input: bulkTagSchema,
  permission: "students.write",
  audit: {
    entityType: "Student",
    action: "bulk_tag",
    entityId: ({ input }) => `${input.studentIds.length}_${input.mode}_${input.tagId}`,
  },
  async handler({ input, ctx }) {
    if (input.mode === "remove") {
      const r = await prisma.studentTag.deleteMany({
        where: { tagId: input.tagId, studentId: { in: input.studentIds } },
      });
      revalidatePath("/v2/admin/ogrenciler");
      return { count: r.count };
    }
    // add (skipDuplicates)
    const data = input.studentIds.map((sid) => ({
      studentId: sid,
      tagId: input.tagId,
      assignedById: ctx.user.id,
    }));
    const r = await prisma.studentTag.createMany({ data, skipDuplicates: true });
    revalidatePath("/v2/admin/ogrenciler");
    return { count: r.count };
  },
});

const bulkDeleteSchema = z.object({
  studentIds: z.array(z.string().cuid()).min(1).max(200),
});

export const bulkDeleteStudentsAction = defineAction({
  input: bulkDeleteSchema,
  permission: "students.delete",
  audit: {
    entityType: "Student",
    action: "bulk_delete",
    entityId: ({ input }) => `count_${input.studentIds.length}`,
  },
  async handler({ input }) {
    const r = await prisma.student.deleteMany({
      where: { id: { in: input.studentIds } },
    });
    revalidatePath("/v2/admin/ogrenciler");
    return { count: r.count };
  },
});
