"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { PayrollStatus } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createPayrollAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const teacherId = readStr(fd, "teacherId");
  if (!teacherId) throw new Error("Öğretmen seçimi zorunlu");
  const periodStart = new Date(readStr(fd, "periodStart"));
  const periodEnd = new Date(readStr(fd, "periodEnd"));
  if (!Number.isFinite(periodStart.getTime()) || !Number.isFinite(periodEnd.getTime())) {
    throw new Error("Dönem tarihleri geçersiz");
  }
  const amountTry = parseFloat(readStr(fd, "amount") || "0");
  if (!Number.isFinite(amountTry) || amountTry <= 0) {
    throw new Error("Tutar pozitif olmalı");
  }
  const amount = Math.round(amountTry * 100);

  const created = await prisma.teacherPayroll.create({
    data: {
      teacherId,
      periodStart,
      periodEnd,
      amount,
      status: (readStr(fd, "status") as PayrollStatus) || "DUE",
      notes: readStr(fd, "notes") || null,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayroll",
    entityId: created.id,
    action: "PAYROLL_CREATE",
    summary: `${(amount / 100).toFixed(2)} TL · ${created.status}`,
    payload: { teacherId, amount, status: created.status },
  });
  revalidatePath("/panel/admin/maaslar");
  redirect("/panel/admin/maaslar");
}

export async function updatePayrollAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const amountTry = parseFloat(readStr(fd, "amount") || "0");
  if (!Number.isFinite(amountTry) || amountTry <= 0) throw new Error("Tutar pozitif olmalı");
  const updated = await prisma.teacherPayroll.update({
    where: { id },
    data: {
      amount: Math.round(amountTry * 100),
      status: (readStr(fd, "status") as PayrollStatus) || "DUE",
      notes: readStr(fd, "notes") || null,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayroll",
    entityId: updated.id,
    action: "PAYROLL_UPDATE",
    summary: `Güncellendi · ${updated.status}`,
    payload: { id, status: updated.status },
  });
  revalidatePath("/panel/admin/maaslar");
  redirect("/panel/admin/maaslar");
}

/**
 * Maaş ödemesini PAID işaretler + AccountingEntry yazar (idempotent).
 */
export async function markPayrollPaidAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const payroll = await tx.teacherPayroll.findUnique({
      where: { id },
      include: { teacher: { select: { id: true, fullName: true } } },
    });
    if (!payroll) throw new Error("Ödeme bulunamadı");
    if (payroll.status === "PAID") return;

    await tx.teacherPayroll.update({
      where: { id },
      data: { status: "PAID", paidAt: now },
    });

    const existing = await tx.accountingEntry.findFirst({
      where: { refType: "TeacherPayroll", refId: id },
      select: { id: true },
    });
    if (!existing) {
      await tx.accountingEntry.create({
        data: {
          service: "OD",
          type: "EXPENSE",
          category: "TEACHER_PAYROLL",
          amount: payroll.amount,
          occurredAt: now,
          description: `Öğretmen ödemesi: ${payroll.teacher.fullName}`,
          refType: "TeacherPayroll",
          refId: id,
          teacherId: payroll.teacherId,
          createdById: ctx.userId,
        },
      });
    }
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayroll",
    entityId: id,
    action: "PAYROLL_MARK_PAID",
    summary: "Maaş ödendi olarak işaretlendi",
  });
  revalidatePath("/panel/admin/maaslar");
}

export async function deletePayrollAction(id: string) {
  const ctx = await requirePanelRole("admin");
  await prisma.teacherPayroll.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "TeacherPayroll",
    entityId: id,
    action: "PAYROLL_DELETE",
    summary: "Maaş kaydı silindi",
  });
  revalidatePath("/panel/admin/maaslar");
}
