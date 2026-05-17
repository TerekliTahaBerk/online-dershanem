"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EntryType, EntryCategory, AccessService } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function normalizeService(raw: string): AccessService {
  return raw === "ODK" ? "ODK" : "OD";
}

export async function createEntryAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const amountTry = parseFloat(readStr(fd, "amount") || "0");
  if (!Number.isFinite(amountTry) || amountTry <= 0) {
    throw new Error("Tutar pozitif bir sayı olmalıdır.");
  }
  const amount = Math.round(amountTry * 100);
  const service = normalizeService(readStr(fd, "service"));

  const created = await prisma.accountingEntry.create({
    data: {
      service,
      type: (readStr(fd, "type") as EntryType) || "INCOME",
      category: (readStr(fd, "category") as EntryCategory) || "OTHER_INCOME",
      amount,
      description: readStr(fd, "description") || null,
      occurredAt: readStr(fd, "occurredAt") ? new Date(readStr(fd, "occurredAt")) : new Date(),
      studentId: readStr(fd, "studentId") || null,
      teacherId: readStr(fd, "teacherId") || null,
      packageId: readStr(fd, "packageId") || null,
      refType: readStr(fd, "refType") || null,
      refId: readStr(fd, "refId") || null,
      createdById: ctx.userId,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AccountingEntry",
    entityId: created.id,
    action: "ACCOUNTING_CREATE",
    summary: `${service} ${created.type} ${(amount / 100).toFixed(2)} TL`,
    payload: { service, type: created.type, category: created.category, amount },
  });
  revalidatePath("/panel/admin/muhasebe");
  redirect("/panel/admin/muhasebe?service=" + service);
}

export async function updateEntryAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const amountTry = parseFloat(readStr(fd, "amount") || "0");
  if (!Number.isFinite(amountTry) || amountTry <= 0) {
    throw new Error("Tutar pozitif bir sayı olmalıdır.");
  }
  const service = normalizeService(readStr(fd, "service"));
  await prisma.accountingEntry.update({
    where: { id },
    data: {
      service,
      type: (readStr(fd, "type") as EntryType) || "INCOME",
      category: (readStr(fd, "category") as EntryCategory) || "OTHER_INCOME",
      amount: Math.round(amountTry * 100),
      description: readStr(fd, "description") || null,
      occurredAt: readStr(fd, "occurredAt") ? new Date(readStr(fd, "occurredAt")) : new Date(),
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AccountingEntry",
    entityId: id,
    action: "ACCOUNTING_UPDATE",
    summary: `${service} kaydı güncellendi (${(amountTry).toFixed(2)} TL)`,
  });
  revalidatePath("/panel/admin/muhasebe");
}

export async function deleteEntryAction(id: string) {
  const ctx = await requirePanelRole("admin");
  await prisma.accountingEntry.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AccountingEntry",
    entityId: id,
    action: "ACCOUNTING_DELETE",
    summary: `Muhasebe kaydı silindi`,
  });
  revalidatePath("/panel/admin/muhasebe");
}
