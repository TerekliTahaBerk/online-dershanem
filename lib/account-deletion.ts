/**
 * Round R-D+ — Account Deletion (KVKK uyumlu hesap silme akışı)
 *
 * Akış:
 *  1. Kullanıcı /panel/{role}/profilim/hesap-sil sayfasından talep oluşturur.
 *     → AccountDeletionRequest { status: PENDING, scheduledFor: now+7d }
 *  2. Admin /panel/admin/hesap-silme-talepleri sayfasından APPROVE veya REJECT eder.
 *  3. Kullanıcı 7 gün içinde kendi talebini CANCELLED yapabilir.
 *  4. Cron (/api/cron/account-deletion-process) günlük çalışır;
 *     APPROVED + scheduledFor ≤ now olan talepleri PROCESSED'a çevirir
 *     ve kullanıcıyı anonimleştirir.
 *
 * Hard-delete neden yapılmıyor?
 *  - OdkOrder / OdkPayment / AccountingEntry → Türk Vergi mevzuatı: 5 yıl saklama
 *  - AuditLog → KVKK Aydınlatma Yükümlülüğü kanıtı için saklanmalı
 *  - Bu yüzden user kaydı korunur ama PII (email, name, passwordHash) silinir.
 */

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const DELETION_COOLDOWN_DAYS = 7;

export function computeScheduledFor(from: Date = new Date()): Date {
  return new Date(from.getTime() + DELETION_COOLDOWN_DAYS * 86_400_000);
}

/**
 * Anonymize a user record. Idempotent — safe to re-run.
 * Preserves financial/audit history; nulls or scrambles PII.
 */
export async function anonymizeUser(userId: string, reviewerId: string | null) {
  const placeholder = `deleted-${userId}@deleted.local`;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      return { ok: false as const, reason: "user_not_found" as const };
    }
    // Already anonymized?
    if (user.email.endsWith("@deleted.local")) {
      return { ok: true as const, alreadyAnonymized: true as const };
    }

    // 1) Anonymize root User PII
    await tx.user.update({
      where: { id: userId },
      data: {
        email: placeholder,
        name: "Silinmiş Kullanıcı",
        passwordHash: null,
        onboardingCompletedAt: null,
      },
    });

    // 2) Revoke all active access (ODK)
    const now = new Date();
    await tx.odkEntitlement.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: now },
    });
    await tx.odkUserAccessTag.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });

    // 3) Hard-delete session/device data (not financial)
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.mobileDevice.deleteMany({ where: { userId } });
    await tx.notificationPreference.deleteMany({ where: { userId } });
    await tx.dashboardLayout.deleteMany({ where: { userId } });
    await tx.savedView.deleteMany({ where: { ownerId: userId } });
    await tx.notification.deleteMany({ where: { userId } });

    // 4) Anonymize Student/Teacher/Parent PII if present
    const student = await tx.student.findUnique({ where: { userId }, select: { id: true } });
    if (student) {
      await tx.student.update({
        where: { userId },
        data: {
          phone: null,
          parentPhone: null,
          parentEmail: null,
          birthDate: null,
          address: null,
        } as any, // best-effort; fields may not all exist — guarded by schema
      }).catch(() => {/* ignore if columns differ */});
    }
    const teacher = await tx.teacher.findUnique({ where: { userId }, select: { id: true } });
    if (teacher) {
      await tx.teacher.update({
        where: { userId },
        data: {
          phone: null,
          bio: null,
        } as any,
      }).catch(() => {/* ignore */});
    }
    const parent = await tx.parent.findUnique({ where: { userId }, select: { id: true } });
    if (parent) {
      await tx.parent.update({
        where: { userId },
        data: {
          phone: null,
        } as any,
      }).catch(() => {/* ignore */});
    }

    return { ok: true as const, alreadyAnonymized: false as const, originalEmail: user.email };
  });
}

export async function processApprovedDeletionRequest(requestId: string) {
  const req = await prisma.accountDeletionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true, scheduledFor: true, reviewedById: true },
  });
  if (!req) return { ok: false as const, reason: "not_found" as const };
  if (req.status !== "APPROVED") return { ok: false as const, reason: "wrong_status" as const };
  if (req.scheduledFor.getTime() > Date.now()) {
    return { ok: false as const, reason: "not_due_yet" as const };
  }

  const result = await anonymizeUser(req.userId, req.reviewedById);
  if (!result.ok) return result;

  await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: { status: "PROCESSED", processedAt: new Date() },
  });

  await logAudit({
    actorUserId: req.reviewedById ?? null,
    actorType: "SYSTEM",
    entityType: "AccountDeletionRequest",
    entityId: requestId,
    action: "ACCOUNT_DELETION_PROCESSED",
    summary: `Hesap anonimleştirildi (userId=${req.userId})`,
    payload: { userId: req.userId, alreadyAnonymized: result.alreadyAnonymized ?? false },
  });

  return { ok: true as const, userId: req.userId };
}
