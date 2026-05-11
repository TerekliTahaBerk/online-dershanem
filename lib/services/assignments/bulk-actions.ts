"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";

const bulkStatusSchema = z.object({
  assignmentIds: z.array(z.string().cuid()).min(1).max(500),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]),
});

export const bulkUpdateAssignmentStatusAction = defineAction({
  input: bulkStatusSchema,
  permission: "assignments.write",
  audit: {
    entityType: "Assignment",
    action: "bulk_status",
    entityId: ({ input }) => `${input.assignmentIds.length}_to_${input.status}`,
  },
  async handler({ input }) {
    const r = await prisma.assignment.updateMany({
      where: { id: { in: input.assignmentIds } },
      data: { status: input.status },
    });
    revalidatePath("/v2/admin/odevler");
    return { count: r.count };
  },
});

const bulkDeleteSchema = z.object({
  assignmentIds: z.array(z.string().cuid()).min(1).max(200),
});

export const bulkDeleteAssignmentsAction = defineAction({
  input: bulkDeleteSchema,
  permission: "assignments.write",
  audit: {
    entityType: "Assignment",
    action: "bulk_delete",
    entityId: ({ input }) => `count_${input.assignmentIds.length}`,
  },
  async handler({ input }) {
    const r = await prisma.assignment.deleteMany({
      where: { id: { in: input.assignmentIds } },
    });
    revalidatePath("/v2/admin/odevler");
    return { count: r.count };
  },
});
