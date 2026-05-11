"use server";

import { revalidatePath } from "next/cache";
import { defineAction } from "@/lib/rbac/define-action";
import {
  studentCreateSchema,
  studentUpdateSchema,
  studentDeleteSchema,
} from "./schemas";
import {
  createStudent as svcCreate,
  updateStudent as svcUpdate,
  deleteStudent as svcDelete,
} from "./mutations";

export const createStudentAction = defineAction({
  input: studentCreateSchema,
  permission: "students.write",
  audit: { entityType: "Student", action: "create", entityId: async ({ output }) => (output as any)?.id ?? "—" },
  async handler({ input, ctx }) {
    const out = await svcCreate(input, ctx);
    revalidatePath("/v2/admin/ogrenciler");
    return out;
  },
});

export const updateStudentAction = defineAction({
  input: studentUpdateSchema,
  permission: "students.write",
  audit: { entityType: "Student", action: "update", entityId: async ({ input }) => input.id },
  async handler({ input, ctx }) {
    const out = await svcUpdate(input, ctx);
    revalidatePath("/v2/admin/ogrenciler");
    revalidatePath(`/v2/admin/ogrenciler/${input.id}`);
    return out;
  },
});

export const deleteStudentAction = defineAction({
  input: studentDeleteSchema,
  permission: "students.delete",
  audit: { entityType: "Student", action: "delete", entityId: async ({ input }) => input.id },
  async handler({ input, ctx }) {
    const out = await svcDelete(input.id, ctx);
    revalidatePath("/v2/admin/ogrenciler");
    return out;
  },
});
