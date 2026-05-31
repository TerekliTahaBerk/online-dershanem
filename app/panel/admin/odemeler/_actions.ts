"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { PurchaseStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import {
  getParentUserIdsForStudent,
  notifyUser,
  notifyUsers,
} from "@/lib/notifications";
import { enforceMutation } from "@/lib/security/mutation-guard";

/**
 * Phase 2 / Session 16 — Helper that resolves a PaymentScheduleItem to the
 * parent recipient User.id list. Tries the explicit `parentId` first; falls
 * back to all parents linked to the student. Best-effort: returns [] on any
 * failure so the parent action never rolls back.
 */
async function resolvePaymentRecipients(item: {
  parentId: string | null;
  studentId: string | null;
}): Promise<string[]> {
  try {
    if (item.parentId) {
      const p = await prisma.parent.findUnique({
        where: { id: item.parentId },
        select: { userId: true },
      });
      if (p?.userId) return [p.userId];
    }
    if (item.studentId) {
      return await getParentUserIdsForStudent(item.studentId);
    }
  } catch (err) {
    console.warn("[resolvePaymentRecipients] failed", err);
  }
  return [];
}

function formatTRY(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(kurus / 100);
}

export async function setPurchaseStatusAction(id: string, status: PurchaseStatus) {
  await requirePanelRole("admin");
  await prisma.purchaseIntent.update({ where: { id }, data: { status } });
  revalidatePath("/panel/admin/odemeler");
}

// ─── Phase 2 / Session 10 — Payment Schedule Item (Vade) actions ───────────
// Admin-only mutations against `PaymentScheduleItem`. Parents NEVER
// invoke these — there is no parent self-service "mark paid" surface
// because there is no real provider callback yet.
//
// Status freshness: the column stores base statuses only
// (PENDING/PAID/CANCELLED/PARTIAL); OVERDUE is derived in
// `lib/panel/parent-finance.ts` at read time. These actions never
// write OVERDUE.

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** "₺123,45" or "123.45" or plain integer → kuruş. Returns null on invalid. */
function parseAmountToKurus(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export async function createPaymentScheduleItemAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const title = readStr(fd, "title");
  const amountStr = readStr(fd, "amount");
  const dueStr = readStr(fd, "dueDate");
  const studentId = readStr(fd, "studentId") || null;
  const parentId = readStr(fd, "parentId") || null;
  const packageId = readStr(fd, "packageId") || null;
  const purchaseIntentId = readStr(fd, "purchaseIntentId") || null;
  const paymentLink = readStr(fd, "paymentLink") || null;
  const note = readStr(fd, "note") || null;

  if (!title) throw new Error("Başlık zorunlu");
  const amount = parseAmountToKurus(amountStr);
  if (amount === null) throw new Error("Tutar geçersiz");
  const dueDate = dueStr ? new Date(dueStr) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime())) throw new Error("Vade tarihi geçersiz");

  // If both parentId and studentId are provided, validate the link.
  if (parentId && studentId) {
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
      select: { parentId: true },
    });
    if (!link) throw new Error("Veli ile öğrenci bağlantılı değil");
  }

  const created = await prisma.paymentScheduleItem.create({
    data: {
      title,
      amount,
      dueDate,
      studentId,
      parentId,
      packageId,
      purchaseIntentId,
      paymentLink,
      note,
      createdById: ctx.userId,
    },
    select: { id: true },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "PaymentScheduleItem",
    entityId: created.id,
    action: "PAYMENT_SCHEDULE_CREATE",
    payload: { title, amount, dueDate: dueDate.toISOString(), studentId, parentId },
  });

  revalidatePath("/panel/admin/odemeler/vadeler");
  revalidatePath("/panel/veli/odemeler");
}

export async function markPaymentScheduleItemPaidAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  // Phase 2 / Session 17 — abuse hardening (idempotent short-circuit already
  // covers double-submit; rate-limit guards against scripted floods).
  await enforceMutation({
    action: "payment.mark-paid",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 120, windowMs: 60 * 60_000 },
  });
  const writeAccounting = fd.get("writeAccounting") === "1";

  const item = await prisma.paymentScheduleItem.findUnique({
    where: { id },
    select: {
      id: true, amount: true, paidAmount: true, status: true,
      title: true, studentId: true, parentId: true, packageId: true, accountingEntryId: true,
    },
  });
  if (!item) throw new Error("Vade bulunamadı");
  if (item.status === "PAID") return; // idempotent
  if (item.status === "CANCELLED") throw new Error("İptal edilmiş kayıt ödenmiş olarak işaretlenemez");

  // Optionally write a fresh INCOME accounting entry. Historical entries
  // are never modified — we only ever create new ones.
  let accountingEntryId: string | null = item.accountingEntryId ?? null;
  if (writeAccounting && !accountingEntryId) {
    const entry = await prisma.accountingEntry.create({
      data: {
        type: "INCOME",
        category: "PACKAGE_SALE",
        amount: item.amount, // full ticket — admin chose to record the whole row
        description: `Vade: ${item.title}`,
        refType: "PaymentScheduleItem",
        refId: item.id,
        studentId: item.studentId,
        packageId: item.packageId,
        createdById: ctx.userId,
      },
      select: { id: true },
    });
    accountingEntryId = entry.id;
  }

  await prisma.paymentScheduleItem.update({
    where: { id },
    data: {
      status: "PAID",
      paidAmount: item.amount,
      paidAt: new Date(),
      accountingEntryId,
    },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "PaymentScheduleItem",
    entityId: id,
    action: "PAYMENT_SCHEDULE_MARK_PAID",
    payload: { amount: item.amount, accountingEntryId, writeAccounting },
  });

  // Phase 2 / Session 16 — best-effort parent notification.
  try {
    const recipients = await resolvePaymentRecipients(item);
    if (recipients.length > 0) {
      await notifyUsers(recipients, {
        title: "Ödemeniz alındı",
        body: `${item.title} (${formatTRY(item.amount)}) ödenmiş olarak işaretlendi.`,
        href: "/panel/veli/odemeler",
        type: "PAYMENT",
        priority: "NORMAL",
        category: "FINANCE",
        inboxPriority: "NORMAL",
        createdById: ctx.userId,
        relatedEntityType: "PaymentScheduleItem",
        relatedEntityId: id,
      });
    }
  } catch (err) {
    console.warn("[markPaymentScheduleItemPaidAction] notify failed", err);
  }

  revalidatePath("/panel/admin/odemeler/vadeler");
  revalidatePath("/panel/veli/odemeler");
}

export async function markPaymentScheduleItemPartialAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "payment.mark-partial",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 120, windowMs: 60 * 60_000 },
  });
  const partialStr = readStr(fd, "paidAmount");
  const partial = parseAmountToKurus(partialStr);
  if (partial === null) throw new Error("Kısmi tutar geçersiz");

  const item = await prisma.paymentScheduleItem.findUnique({
    where: { id },
    select: { amount: true, status: true, paidAmount: true, title: true, studentId: true, parentId: true },
  });
  if (!item) throw new Error("Vade bulunamadı");
  if (item.status === "CANCELLED") throw new Error("İptal kayıt güncellenemez");
  if (partial > item.amount) throw new Error("Kısmi tutar toplam tutardan fazla olamaz");

  // If partial >= amount, treat as fully PAID. Otherwise PARTIAL.
  const isFull = partial >= item.amount;
  await prisma.paymentScheduleItem.update({
    where: { id },
    data: {
      status: isFull ? "PAID" : "PARTIAL",
      paidAmount: partial,
      paidAt: isFull ? new Date() : null,
    },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "PaymentScheduleItem",
    entityId: id,
    action: isFull ? "PAYMENT_SCHEDULE_MARK_PAID" : "PAYMENT_SCHEDULE_MARK_PARTIAL",
    payload: { paidAmount: partial, totalAmount: item.amount, previous: item.paidAmount },
  });

  // Phase 2 / Session 16 — best-effort parent notification on partial payment.
  try {
    const recipients = await resolvePaymentRecipients(item);
    if (recipients.length > 0) {
      const remaining = Math.max(0, item.amount - partial);
      await notifyUsers(recipients, {
        title: isFull ? "Ödemeniz alındı" : "Kısmi ödeme alındı",
        body: isFull
          ? `${item.title} (${formatTRY(item.amount)}) ödenmiş olarak işaretlendi.`
          : `${item.title}: ${formatTRY(partial)} alındı, kalan ${formatTRY(remaining)}.`,
        href: "/panel/veli/odemeler",
        type: "PAYMENT",
        priority: "NORMAL",
        category: "FINANCE",
        inboxPriority: "NORMAL",
        createdById: ctx.userId,
        relatedEntityType: "PaymentScheduleItem",
        relatedEntityId: id,
      });
    }
  } catch (err) {
    console.warn("[markPaymentScheduleItemPartialAction] notify failed", err);
  }

  revalidatePath("/panel/admin/odemeler/vadeler");
  revalidatePath("/panel/veli/odemeler");
}

export async function cancelPaymentScheduleItemAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  await enforceMutation({
    action: "payment.cancel",
    userId: ctx.userId,
    requireSameOrigin: true,
    rateLimit: { max: 120, windowMs: 60 * 60_000 },
  });
  const reason = readStr(fd, "reason") || null;

  const item = await prisma.paymentScheduleItem.findUnique({
    where: { id },
    select: { status: true, title: true, amount: true, studentId: true, parentId: true },
  });
  if (!item) throw new Error("Vade bulunamadı");
  if (item.status === "PAID") throw new Error("Ödenmiş kayıt iptal edilemez");

  await prisma.paymentScheduleItem.update({
    where: { id },
    data: { status: "CANCELLED", note: reason ?? undefined },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "PaymentScheduleItem",
    entityId: id,
    action: "PAYMENT_SCHEDULE_CANCEL",
    payload: { reason },
  });

  // Phase 2 / Session 16 — best-effort parent notification on cancellation.
  try {
    const recipients = await resolvePaymentRecipients(item);
    if (recipients.length > 0) {
      await notifyUsers(recipients, {
        title: "Ödeme talebi iptal edildi",
        body: `${item.title} (${formatTRY(item.amount)}) talebi iptal edildi${reason ? `: ${reason}` : "."}`,
        href: "/panel/veli/odemeler",
        type: "PAYMENT",
        priority: "NORMAL",
        category: "FINANCE",
        inboxPriority: "NORMAL",
        createdById: ctx.userId,
        relatedEntityType: "PaymentScheduleItem",
        relatedEntityId: id,
      });
    }
  } catch (err) {
    console.warn("[cancelPaymentScheduleItemAction] notify failed", err);
  }

  revalidatePath("/panel/admin/odemeler/vadeler");
  revalidatePath("/panel/veli/odemeler");
}
