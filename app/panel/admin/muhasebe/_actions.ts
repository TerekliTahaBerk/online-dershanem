"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { EntryType, EntryCategory } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createEntryAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const amountTry = parseFloat(readStr(fd, "amount") || "0");
  const amount = Math.round(amountTry * 100);
  await prisma.accountingEntry.create({
    data: {
      type: (readStr(fd, "type") as EntryType) || "INCOME",
      category: (readStr(fd, "category") as EntryCategory) || "OTHER_INCOME",
      amount,
      description: readStr(fd, "description") || null,
      occurredAt: readStr(fd, "occurredAt") ? new Date(readStr(fd, "occurredAt")) : new Date(),
      studentId: readStr(fd, "studentId") || null,
      teacherId: readStr(fd, "teacherId") || null,
      packageId: readStr(fd, "packageId") || null,
      createdById: ctx.userId,
    },
  });
  revalidatePath("/panel/admin/muhasebe");
}

export async function deleteEntryAction(id: string) {
  await requirePanelRole("admin");
  await prisma.accountingEntry.delete({ where: { id } });
  revalidatePath("/panel/admin/muhasebe");
}
