"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { markPayrollPaid } from "@/lib/accounting";
import { auditLog } from "@/lib/audit";

const EntrySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.enum([
    "PACKAGE_SALE",
    "CAMP_SALE",
    "SERVICE_FEE",
    "OTHER_INCOME",
    "TEACHER_PAYROLL",
    "MARKETING",
    "RENT",
    "TAX",
    "OPERATIONAL",
    "OTHER_EXPENSE",
  ]),
  amount: z.coerce.number().int().min(1),
  occurredAt: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  studentId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
});

export async function createAccountingEntryAction(input: z.infer<typeof EntrySchema>) {
  const session = await requireAdmin();
  const data = EntrySchema.parse(input);
  const userId = session.user?.id;

  const e = await prisma.accountingEntry.create({
    data: {
      type: data.type,
      category: data.category,
      amount: data.amount,
      occurredAt: new Date(data.occurredAt),
      description: data.description ?? null,
      studentId: data.studentId ?? null,
      teacherId: data.teacherId ?? null,
      createdById: userId ?? null,
    },
  });

  await auditLog({
    entityType: "AccountingEntry",
    entityId: e.id,
    action: "CREATE",
    payload: { type: data.type, category: data.category, amount: data.amount },
    actorUserId: userId ?? null,
  });

  revalidatePath("/admin/muhasebe");
  return { ok: true as const, id: e.id };
}

const DeleteSchema = z.object({ id: z.string().min(1) });

export async function deleteAccountingEntryAction(input: z.infer<typeof DeleteSchema>) {
  const session = await requireAdmin();
  const { id } = DeleteSchema.parse(input);
  await prisma.accountingEntry.delete({ where: { id } });
  await auditLog({
    entityType: "AccountingEntry",
    entityId: id,
    action: "DELETE",
    actorUserId: session.user?.id ?? null,
  });
  revalidatePath("/admin/muhasebe");
  return { ok: true as const };
}

const PayrollCreateSchema = z.object({
  teacherId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  amount: z.coerce.number().int().min(1),
  notes: z.string().max(500).optional().nullable(),
});

export async function createPayrollAction(input: z.infer<typeof PayrollCreateSchema>) {
  const session = await requireAdmin();
  const data = PayrollCreateSchema.parse(input);
  const p = await prisma.teacherPayroll.create({
    data: {
      teacherId: data.teacherId,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      amount: data.amount,
      notes: data.notes ?? null,
    },
  });
  await auditLog({
    entityType: "TeacherPayroll",
    entityId: p.id,
    action: "CREATE",
    actorUserId: session.user?.id ?? null,
  });
  revalidatePath("/admin/muhasebe/maaslar");
  return { ok: true as const, id: p.id };
}

const PayrollPayschema = z.object({ payrollId: z.string().min(1) });

export async function payPayrollAction(input: z.infer<typeof PayrollPayschema>) {
  const session = await requireAdmin();
  const { payrollId } = PayrollPayschema.parse(input);
  const userId = session.user?.id ?? "system";
  await markPayrollPaid({ payrollId, createdById: userId });
  await auditLog({
    entityType: "TeacherPayroll",
    entityId: payrollId,
    action: "PAY",
    actorUserId: session.user?.id ?? null,
  });
  revalidatePath("/admin/muhasebe/maaslar");
  revalidatePath("/admin/muhasebe");
  return { ok: true as const };
}
