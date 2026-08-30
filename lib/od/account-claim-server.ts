import "server-only";

import type { AccountClaimAudience, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { queueAccountClaimEmail } from "@/lib/email";
import {
  ACCOUNT_CLAIM_TTL_MS,
  accountClaimRejection,
  accountClaimReminderDue,
  accountClaimTokenId,
  createAccountClaimToken,
  type AccountClaimRejection,
} from "@/lib/od/account-claim";
import { autoAdvanceOdOnboarding } from "@/lib/od/onboarding";

type DbClient = Prisma.TransactionClient;

/**
 * HESAP DEVRALMA — sunucu tarafı.
 *
 * Bu modül OD-013'ün çekirdeğidir: ödeme sonrası hesap açma, veli bağı ve
 * temel tercihler artık bir operasyon görevine değil, müşterinin kendi
 * tamamladığı tek bir akışa bağlıdır.
 */

/**
 * Kullanıcıya davet üretir ve e-postayı outbox'a yazar.
 *
 * ZATEN DEVRALINMIŞ hesaba davet gönderilmez: `mustChangePassword === false`
 * ise kullanıcı parolasını çoktan belirlemiştir ve "hesabınızı kurun" e-postası
 * hem gereksiz hem de kafa karıştırıcı olurdu (ikinci bir ürün alındığında bu
 * yol gerçekten işliyor).
 *
 * Aynı kullanıcının bekleyen eski davetleri SUPERSEDED yapılır: her an tek bir
 * geçerli bağlantı olur, eski e-postadaki bağlantı sessizce çalışmaz değil,
 * açık bir mesajla reddedilir.
 */
export async function issueAccountClaim(
  tx: DbClient,
  input: {
    userId: string;
    audience: AccountClaimAudience;
    odOrderId?: string | null;
    now?: Date;
    /**
     * Önceden üretilmiş token. Provisioning bunu transaction'dan ÖNCE üretir:
     * token üretimi scrypt çalıştırır ve Serializable bir transaction'ı yüz
     * milisaniyelerce açık tutmak kilit süresini gereksiz uzatır.
     */
    generated?: Awaited<ReturnType<typeof createAccountClaimToken>>;
  },
): Promise<{ issued: false; reason: "ALREADY_CLAIMED" | "ACCOUNT_UNAVAILABLE" | "NO_EMAIL" } | { issued: true; claimId: string }> {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, fullName: true, status: true, mustChangePassword: true },
  });
  if (!user || user.status !== "ACTIVE") return { issued: false, reason: "ACCOUNT_UNAVAILABLE" };
  if (!user.mustChangePassword) return { issued: false, reason: "ALREADY_CLAIMED" };
  if (!user.email) return { issued: false, reason: "NO_EMAIL" };

  const now = input.now ?? new Date();
  await tx.accountClaim.updateMany({
    where: { userId: user.id, status: "PENDING" },
    data: { status: "SUPERSEDED" },
  });

  const generated = input.generated ?? (await createAccountClaimToken());
  const claim = await tx.accountClaim.create({
    data: {
      id: generated.id,
      userId: user.id,
      tokenHash: generated.tokenHash,
      audience: input.audience,
      odOrderId: input.odOrderId ?? null,
      expiresAt: new Date(now.getTime() + ACCOUNT_CLAIM_TTL_MS),
    },
    select: { id: true },
  });

  await queueAccountClaimEmail(
    { to: user.email, name: user.fullName, tokenId: generated.id, audience: input.audience },
    tx,
  );
  await tx.auditLog.create({
    data: {
      actorType: "SYSTEM",
      entityType: "AccountClaim",
      entityId: claim.id,
      action: "account_claim.issued",
      summary: "Hesap devralma daveti üretildi",
      payload: { userId: user.id, audience: input.audience, odOrderId: input.odOrderId ?? null },
    },
  });
  return { issued: true, claimId: claim.id };
}

export type ResolvedAccountClaim = {
  claimId: string;
  audience: AccountClaimAudience;
  email: string;
  fullName: string | null;
  expiresAt: Date;
  /** Onay bekleyen veli–öğrenci bağı; yoksa `null`. */
  pendingRelationship: { studentProfileId: string; studentName: string } | null;
};

/**
 * Token'ı çözer ve kullanılabilirliğini doğrular.
 *
 * Kimlik doğrulama gerektirmeyen bir yüzeyden çağrılır; bu yüzden dönüşte
 * yalnız akışı çizmek için gereken en az bilgi vardır. Rol, ürün listesi,
 * sipariş tutarı gibi hiçbir ek veri sızdırılmaz.
 */
export async function resolveAccountClaim(
  token: string,
  now = new Date(),
): Promise<{ ok: true; claim: ResolvedAccountClaim } | { ok: false; reason: AccountClaimRejection }> {
  const tokenId = accountClaimTokenId(token);
  if (!tokenId) return { ok: false, reason: "TOKEN_INVALID" };

  const claim = await prisma.accountClaim.findUnique({
    where: { id: tokenId },
    include: { user: { select: { id: true, email: true, fullName: true, status: true } } },
  });
  if (!claim) return { ok: false, reason: "NOT_FOUND" };
  if (!(await verifyPassword(token, claim.tokenHash))) return { ok: false, reason: "TOKEN_INVALID" };

  const rejection = accountClaimRejection(claim, claim.user, now);
  if (rejection) return { ok: false, reason: rejection };

  return {
    ok: true,
    claim: {
      claimId: claim.id,
      audience: claim.audience,
      email: claim.user.email,
      fullName: claim.user.fullName,
      expiresAt: claim.expiresAt,
      pendingRelationship: await pendingRelationshipFor(prisma, claim.userId, claim.audience, claim.odOrderId),
    },
  };
}

/**
 * Bu davetin onaylatacağı TEK bağ.
 *
 * Kaynak sipariş biliniyorsa bağ oradaki öğrenciye sabitlenir — çok çocuklu bir
 * velide "hepsini onayla" davranışı, onaylanmamış bir bağı sessizce onaylı
 * saymak olurdu. Sipariş yoksa yalnız TEK bir onaysız bağ varsa çözülür;
 * birden fazlaysa karar paneldeki kontrol listesine bırakılır.
 */
async function pendingRelationshipFor(
  db: DbClient | typeof prisma,
  parentUserId: string,
  audience: AccountClaimAudience,
  odOrderId: string | null,
): Promise<{ studentProfileId: string; studentName: string } | null> {
  if (audience !== "PARENT") return null;

  const orderStudentProfileId = odOrderId
    ? (await db.odOrder.findUnique({ where: { id: odOrderId }, select: { user: { select: { studentProfile: { select: { id: true } } } } } }))?.user?.studentProfile?.id ?? null
    : null;

  const links = await db.parentStudent.findMany({
    where: { parentId: parentUserId, confirmedAt: null, ...(orderStudentProfileId ? { studentId: orderStudentProfileId } : {}) },
    select: { studentId: true, student: { select: { user: { select: { fullName: true, email: true } } } } },
    take: 2,
  });
  if (links.length !== 1) return null;
  return { studentProfileId: links[0].studentId, studentName: links[0].student.user.fullName || links[0].student.user.email };
}

export type AccountClaimCompletion = {
  token: string;
  password: string;
  /** Veli akışında zorunlu; öğrenci akışında yok sayılır. */
  relationshipDecision?: "CONFIRM" | "REJECT";
  preferences: {
    /** Her iki rolde de: e-posta bilgilendirmesi istiyor mu? */
    emailEnabled: boolean;
    /** Öğrenci akışı: haftalık planın dayandığı temel. */
    availableDays?: number[];
    minutesPerDay?: number;
  };
};

export type AccountClaimCompletionResult =
  | { ok: true; userId: string; audience: AccountClaimAudience; relationship: "CONFIRMED" | "REJECTED" | null }
  | { ok: false; reason: AccountClaimRejection | "WEAK_PASSWORD" | "RELATIONSHIP_DECISION_REQUIRED" | "CONFLICT"; message?: string };

/**
 * Daveti tüketip hesabı kurar: parola, ilişki teyidi, temel tercihler ve
 * onboarding ilerlemesi TEK transaction'da.
 *
 * Hepsi birlikte başarılı olmalı: parolası değişmiş ama tercihi kaydedilmemiş
 * bir kullanıcı, akışı yarıda kalmış olarak paneli açar ve kontrol listesi
 * gerçeği yanlış gösterirdi.
 */
export async function completeAccountClaim(
  input: AccountClaimCompletion,
  now = new Date(),
): Promise<AccountClaimCompletionResult> {
  const resolved = await resolveAccountClaim(input.token, now);
  if (!resolved.ok) return { ok: false, reason: resolved.reason };

  const claimRow = await prisma.accountClaim.findUniqueOrThrow({
    where: { id: resolved.claim.claimId },
    select: { id: true, userId: true, audience: true, odOrderId: true, tokenHash: true },
  });

  const strength = validatePasswordStrength(input.password, { email: resolved.claim.email, fullName: resolved.claim.fullName });
  if (!strength.ok) return { ok: false, reason: "WEAK_PASSWORD", message: strength.error };

  if (resolved.claim.pendingRelationship && !input.relationshipDecision) {
    return { ok: false, reason: "RELATIONSHIP_DECISION_REQUIRED" };
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    // Daveti önce TÜKET: iki sekmeden aynı anda gelen istek ikinci kez hesap
    // kurmasın. `tokenHash` koşulu, arada üretilmiş yeni bir daveti de eler.
    const consumed = await tx.accountClaim.updateMany({
      where: { id: claimRow.id, tokenHash: claimRow.tokenHash, status: "PENDING", expiresAt: { gt: now } },
      data: { status: "CLAIMED", claimedAt: now },
    });
    if (consumed.count !== 1) return null;

    await tx.user.update({
      where: { id: claimRow.userId },
      data: { passwordHash, mustChangePassword: false, failedAttempts: 0, lockedUntil: null },
    });
    // Devralmadan önce açılmış her oturum düşer: hesap provisioning sırasında
    // rastgele bir parolayla açıldığı için o oturumlar sahibine ait değildir.
    await tx.session.updateMany({ where: { userId: claimRow.userId, revokedAt: null }, data: { revokedAt: now } });

    let relationship: "CONFIRMED" | "REJECTED" | null = null;
    const pending = resolved.claim.pendingRelationship;
    if (pending && input.relationshipDecision === "CONFIRM") {
      await tx.parentStudent.updateMany({
        where: { parentId: claimRow.userId, studentId: pending.studentProfileId, confirmedAt: null },
        data: { confirmedAt: now, confirmedById: claimRow.userId },
      });
      relationship = "CONFIRMED";
      await tx.auditLog.create({
        data: { actorUserId: claimRow.userId, actorType: "USER", entityType: "ParentStudent", entityId: `${claimRow.userId}:${pending.studentProfileId}`, action: "parent_student.confirmed", summary: "Veli öğrenci bağlantısını onayladı", payload: { odOrderId: claimRow.odOrderId } },
      });
    } else if (pending && input.relationshipDecision === "REJECT") {
      // Yanlış çocuğa bağlanmış bir veli hesabı bir VERİ SIZINTISIDIR: bağ
      // hemen kaldırılır, karar operasyona istisna olarak taşınır.
      await tx.parentStudent.deleteMany({ where: { parentId: claimRow.userId, studentId: pending.studentProfileId } });
      relationship = "REJECTED";
      await tx.auditLog.create({
        data: { actorUserId: claimRow.userId, actorType: "USER", entityType: "ParentStudent", entityId: `${claimRow.userId}:${pending.studentProfileId}`, action: "parent_student.rejected", summary: "Veli bağlantıyı reddetti; bağlantı kaldırıldı", payload: { odOrderId: claimRow.odOrderId } },
      });
      if (claimRow.odOrderId) {
        const onboarding = await tx.odOnboarding.findUnique({ where: { orderId: claimRow.odOrderId }, select: { id: true, state: true } });
        if (onboarding && !["MANUAL_REVIEW", "CANCELED"].includes(onboarding.state)) {
          await tx.odOnboardingTransition.create({ data: { onboardingId: onboarding.id, fromState: onboarding.state, toState: "MANUAL_REVIEW", actorType: "SYSTEM", note: "Veli, kendisine bağlanan öğrenciyi reddetti.", metadata: { code: "RELATIONSHIP_REJECTED" }, occurredAt: now } });
          await tx.odOnboarding.update({
            where: { id: onboarding.id },
            data: { state: "MANUAL_REVIEW", blockerReason: "Veli, kendisine bağlanan öğrenciyi reddetti.", blockedFromState: onboarding.state, stateEnteredAt: now, version: { increment: 1 } },
          });
        }
      }
    }

    await tx.notificationPreference.upsert({
      where: { userId: claimRow.userId },
      create: { userId: claimRow.userId, emailEnabled: input.preferences.emailEnabled },
      update: { emailEnabled: input.preferences.emailEnabled },
    });

    if (claimRow.audience === "STUDENT") {
      const profile = await tx.studentProfile.findUnique({ where: { userId: claimRow.userId }, select: { id: true } });
      if (profile) {
        const availableDays = [...new Set(input.preferences.availableDays ?? [])].filter((day) => day >= 1 && day <= 7).sort();
        const minutesPerDay = Math.min(180, Math.max(15, input.preferences.minutesPerDay ?? 45));
        await tx.studentPlanPreference.upsert({
          where: { studentId: profile.id },
          create: { studentId: profile.id, availableDays, minutesPerDay },
          update: { availableDays, minutesPerDay },
        });
      }
    }

    if (claimRow.odOrderId && relationship !== "REJECTED") {
      await autoAdvanceOdOnboarding(tx, claimRow.odOrderId, "Hesap devralındı ve temel tercihler alındı.");
    }

    await tx.auditLog.create({
      data: {
        actorUserId: claimRow.userId,
        actorType: "USER",
        entityType: "AccountClaim",
        entityId: claimRow.id,
        action: "account_claim.completed",
        summary: "Hesap sahibi tarafından devralındı",
        payload: { audience: claimRow.audience, relationship, odOrderId: claimRow.odOrderId },
      },
    });

    return { userId: claimRow.userId, audience: claimRow.audience, relationship };
  });

  if (!result) return { ok: false, reason: "CONFLICT" };
  return { ok: true, ...result };
}

/**
 * Cron işi: süresi dolan davetleri kapatır, zamanı gelenlere hatırlatma yollar.
 *
 * Süre dolumu ayrı bir işlem olarak yazılır ÇÜNKÜ istisna kuyruğu `status`
 * sütununu okur. `accountClaimRejection` zaten saate bakıp süresi geçmiş bir
 * daveti reddeder; bu iş yalnız kalıcı durumu gerçeğe eşitler.
 */
export async function runAccountClaimMaintenance(now = new Date()) {
  const expired = await prisma.accountClaim.updateMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });

  const candidates = await prisma.accountClaim.findMany({
    where: { status: "PENDING", expiresAt: { gt: now }, reminderCount: { lt: 2 } },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { user: { select: { email: true, fullName: true, status: true, mustChangePassword: true } } },
  });

  let reminded = 0;
  for (const claim of candidates) {
    if (claim.user.status !== "ACTIVE" || !claim.user.mustChangePassword) continue;
    if (!accountClaimReminderDue(claim, now)) continue;
    await queueAccountClaimEmail({ to: claim.user.email, name: claim.user.fullName, tokenId: claim.id, audience: claim.audience, reminder: true });
    await prisma.accountClaim.update({
      where: { id: claim.id },
      data: { reminderCount: { increment: 1 }, lastRemindedAt: now },
    });
    reminded += 1;
  }

  return { expired: expired.count, reminded, scanned: candidates.length };
}
