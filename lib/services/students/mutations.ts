import "server-only";

import { prisma } from "@/lib/prisma";
import type { ActionContext } from "@/lib/rbac/define-action";
import type { StudentCreateInput, StudentUpdateInput } from "./schemas";

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export async function createStudent(input: StudentCreateInput, _ctx: ActionContext) {
  const phoneKey = normalizePhone(input.phone);
  return prisma.student.create({
    data: {
      fullName: input.fullName,
      phone: input.phone,
      phoneKey,
      email: input.email ?? null,
      classLevel: input.classLevel ?? null,
      examType: input.examType ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      schoolName: input.schoolName ?? null,
      notes: input.notes ?? null,
      status: "NEW",
      submittedAt: new Date()
    },
    select: { id: true, fullName: true }
  });
}

export async function updateStudent(input: StudentUpdateInput, _ctx: ActionContext) {
  const { id, phone, ...rest } = input;
  return prisma.student.update({
    where: { id },
    data: {
      ...rest,
      ...(phone ? { phone, phoneKey: normalizePhone(phone) } : {})
    },
    select: { id: true, fullName: true }
  });
}

export async function deleteStudent(id: string, _ctx: ActionContext) {
  await prisma.student.delete({ where: { id } });
  return { id };
}
