// lib/accounting.ts — Accounting CRUD + payroll → accounting auto-entry
import "server-only";
import { prisma } from "./prisma";

export const ENTRY_CATEGORY_LABEL: Record<string, string> = {
  PACKAGE_SALE: "Paket Satışı",
  CAMP_SALE: "Kamp Satışı",
  SERVICE_FEE: "Hizmet Ücreti",
  OTHER_INCOME: "Diğer Gelir",
  TEACHER_PAYROLL: "Öğretmen Maaşı",
  MARKETING: "Pazarlama",
  RENT: "Kira",
  TAX: "Vergi",
  OPERATIONAL: "Operasyonel",
  OTHER_EXPENSE: "Diğer Gider",
};

export interface MonthlyTotals {
  month: string; // "2025-03"
  income: number;
  expense: number;
  net: number;
}

export async function getMonthlyTotals(months = 12): Promise<MonthlyTotals[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const entries = await prisma.accountingEntry.findMany({
    where: { occurredAt: { gte: start } },
    select: { type: true, amount: true, occurredAt: true },
  });

  const buckets: Record<string, MonthlyTotals> = {};
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = { month: key, income: 0, expense: 0, net: 0 };
  }
  for (const e of entries) {
    const d = e.occurredAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets[key]) continue;
    if (e.type === "INCOME") buckets[key].income += e.amount;
    else buckets[key].expense += e.amount;
  }
  for (const k of Object.keys(buckets)) {
    buckets[k].net = buckets[k].income - buckets[k].expense;
  }
  return Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getCategoryBreakdown(type: "INCOME" | "EXPENSE", since?: Date) {
  const entries = await prisma.accountingEntry.groupBy({
    by: ["category"],
    where: { type, occurredAt: since ? { gte: since } : undefined },
    _sum: { amount: true },
  });
  return entries
    .map((e: any) => ({
      category: e.category as string,
      label: ENTRY_CATEGORY_LABEL[e.category] ?? e.category,
      amount: e._sum.amount ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function markPayrollPaid(input: { payrollId: string; createdById: string }) {
  const payroll = await prisma.teacherPayroll.findUnique({
    where: { id: input.payrollId },
    include: { teacher: { select: { user: { select: { name: true } } } } },
  });
  if (!payroll) throw new Error("Maaş kaydı bulunamadı");
  if (payroll.status === "PAID") return payroll;

  const updated = await prisma.teacherPayroll.update({
    where: { id: input.payrollId },
    data: { status: "PAID", paidAt: new Date() },
  });

  await prisma.accountingEntry.create({
    data: {
      type: "EXPENSE",
      category: "TEACHER_PAYROLL",
      amount: payroll.amount,
      occurredAt: new Date(),
      description: `${payroll.teacher.user?.name ?? "Öğretmen"} · ${payroll.periodStart.toLocaleDateString("tr-TR")} - ${payroll.periodEnd.toLocaleDateString("tr-TR")}`,
      refType: "TeacherPayroll",
      refId: payroll.id,
      teacherId: payroll.teacherId,
      createdById: input.createdById,
    },
  });

  return updated;
}

export function formatTL(kurus: number): string {
  return `${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
}
