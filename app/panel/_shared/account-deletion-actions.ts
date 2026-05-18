"use server";

import { prisma } from "@/lib/prisma";
import { requirePanelSession, requirePanelRole } from "@/lib/panel-access";
import { logAudit } from "@/lib/audit";
import {
  computeScheduledFor,
  processApprovedDeletionRequest,
} from "@/lib/account-deletion";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Kullanıcı kendi hesabını silmek için talep oluşturur.
 * Halihazırda PENDING/APPROVED talep varsa yeni talep yaratmaz.
 */
export async function createMyDeletionRequestAction(fd: FormData) {
  const ctx = await requirePanelSession();
  const confirm = readStr(fd, "confirm");
  if (confirm !== "HESABIMI SİL") {
    throw new Error("Onay metni doğru girilmedi. 'HESABIMI SİL' yazmalısın.");
  }
  const reason = readStr(fd, "reason") || null;

  const existing = await prisma.accountDeletionRequest.findFirst({
    where: { userId: ctx.userId, status: { in: ["PENDING", "APPROVED"] } },
    select: { id: true, status: true },
  });
  if (existing) {
    // Idempotent: zaten bir talep var, yenisini açma
    revalidatePath(`/panel/${ctx.segment}/profilim/hesap-sil`);
    return;
  }

  const scheduledFor = computeScheduledFor();
  const req = await prisma.accountDeletionRequest.create({
    data: {
      userId: ctx.userId,
      reason,
      status: "PENDING",
      scheduledFor,
    },
    select: { id: true },
  });

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AccountDeletionRequest",
    entityId: req.id,
    action: "ACCOUNT_DELETION_REQUESTED",
    summary: "Kullanıcı hesap silme talebi oluşturdu",
    payload: { scheduledFor: scheduledFor.toISOString(), hasReason: !!reason },
  });

  revalidatePath(`/panel/${ctx.segment}/profilim/hesap-sil`);
}

/**
 * Kullanıcı kendi talebini iptal eder (sadece PENDING veya APPROVED iken).
 */
export async function cancelMyDeletionRequestAction(requestId: string) {
  const ctx = await requirePanelSession();
  const req = await prisma.accountDeletionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true },
  });
  if (!req || req.userId !== ctx.userId) throw new Error("Talep bulunamadı");
  if (!(req.status === "PENDING" || req.status === "APPROVED")) {
    throw new Error("Bu talep iptal edilemez");
  }
  await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AccountDeletionRequest",
    entityId: requestId,
    action: "ACCOUNT_DELETION_CANCELLED",
    summary: "Kullanıcı hesap silme talebini iptal etti",
  });
  revalidatePath(`/panel/${ctx.segment}/profilim/hesap-sil`);
}

// ─── Admin actions ──────────────────────────────────────────────────────────

export async function approveDeletionRequestAction(requestId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  if (ctx.actualRole !== "ADMIN") throw new Error("Yetkisiz");
  const notes = readStr(fd, "notes") || null;
  const req = await prisma.accountDeletionRequest.findUnique({
    where: { id: requestId },
    select: { status: true, userId: true },
  });
  if (!req) throw new Error("Talep bulunamadı");
  if (req.status !== "PENDING") throw new Error("Sadece bekleyen talep onaylanabilir");

  await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
      reviewerNotes: notes,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AccountDeletionRequest",
    entityId: requestId,
    action: "ACCOUNT_DELETION_APPROVED",
    summary: `Admin hesap silme talebini onayladı (userId=${req.userId})`,
    payload: { hasNotes: !!notes },
  });
  revalidatePath("/panel/admin/hesap-silme-talepleri");
}

export async function rejectDeletionRequestAction(requestId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  if (ctx.actualRole !== "ADMIN") throw new Error("Yetkisiz");
  const notes = readStr(fd, "notes") || null;
  const req = await prisma.accountDeletionRequest.findUnique({
    where: { id: requestId },
    select: { status: true, userId: true },
  });
  if (!req) throw new Error("Talep bulunamadı");
  if (req.status !== "PENDING") throw new Error("Sadece bekleyen talep reddedilebilir");

  await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
      reviewerNotes: notes,
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AccountDeletionRequest",
    entityId: requestId,
    action: "ACCOUNT_DELETION_REJECTED",
    summary: `Admin hesap silme talebini reddetti (userId=${req.userId})`,
    payload: { hasNotes: !!notes },
  });
  revalidatePath("/panel/admin/hesap-silme-talepleri");
}

/**
 * Admin acil silme: cooldown'u baypass et, hemen anonimleştir.
 * Yine de onaylanmış olmalı; sadece scheduledFor kontrolünü atlar.
 */
export async function processDeletionNowAction(requestId: string) {
  const ctx = await requirePanelRole("admin");
  if (ctx.actualRole !== "ADMIN") throw new Error("Yetkisiz");

  const req = await prisma.accountDeletionRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });
  if (!req) throw new Error("Talep bulunamadı");
  if (req.status !== "APPROVED") throw new Error("Önce onaylanmalı");

  // scheduledFor'u "şimdi" yaparak cron mantığını yeniden kullan
  await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: { scheduledFor: new Date(Date.now() - 1000) },
  });
  const result = await processApprovedDeletionRequest(requestId);
  if (!result.ok) {
    throw new Error(`İşlem başarısız: ${result.reason}`);
  }
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "AccountDeletionRequest",
    entityId: requestId,
    action: "ACCOUNT_DELETION_FORCE_PROCESSED",
    summary: "Admin cooldown'u baypas ederek hesabı anonimleştirdi",
  });
  revalidatePath("/panel/admin/hesap-silme-talepleri");
  redirect("/panel/admin/hesap-silme-talepleri");
}
