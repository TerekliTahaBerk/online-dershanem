import "server-only";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { notifyActiveAdmins } from "@/lib/leads/create-lead";
import { CommandError, runWithReceipt } from "@/lib/panel/command-receipt";

/**
 * UYGULAMA İÇİ HESAP SİLME TALEBİ (P5.3).
 *
 * Talep, hesabı SİLMEZ: veri sahibi talebi (DSR) süreci kimlik/ilişki
 * doğrulaması ve hukuki saklama değerlendirmesi için insan onayı ister
 * (`lib/data-governance/dsr.ts`, `scripts/dsr-request.mjs`). Bu servis:
 *  - kimliği mevcut parolayla yeniden doğrular (çalınan açık cihaz koruması),
 *  - kullanıcı başına tek açık talep tutar (son 30 gün; tekrar ilkini döndürür),
 *  - talebi audit makbuzu olarak tek transaction'da yazar,
 *  - commit sonrası yöneticilere kişi sayfasına giden bildirim gönderir.
 * Açık veya uygulanmış DSR tombstone'u varsa yeni talep açılmaz.
 */
export const DELETION_REQUEST_ACTION = "account.deletion.requested";
const OPEN_WINDOW_MS = 30 * 86_400_000;

/** Talep tarihi makbuzdaki sonuçtan okunur (yanıttaki tarihle birebir). */
function requestedAtOf(row: { createdAt: Date; payload: unknown }): string {
  const saved = (row.payload as { result?: { requestedAt?: unknown } } | null)?.result?.requestedAt;
  return typeof saved === "string" ? saved : row.createdAt.toISOString();
}

export type DeletionRequestStatus = {
  requestedAt: string | null;
  processing: "PENDING_GRACE" | "APPLIED" | null;
};

export async function loadDeletionRequestStatus(userId: string, now = new Date()): Promise<DeletionRequestStatus> {
  const [request, tombstone] = await Promise.all([
    prisma.auditLog.findFirst({ where: { actorUserId: userId, entityId: userId, action: DELETION_REQUEST_ACTION, createdAt: { gte: new Date(now.getTime() - OPEN_WINDOW_MS) } }, orderBy: { createdAt: "desc" }, select: { createdAt: true, payload: true } }),
    prisma.dataSubjectTombstone.findFirst({ where: { subjectUserId: userId, status: { in: ["PENDING_GRACE", "APPLIED"] } }, orderBy: { createdAt: "desc" }, select: { status: true } }),
  ]);
  return { requestedAt: request ? requestedAtOf(request) : null, processing: (tombstone?.status as DeletionRequestStatus["processing"]) ?? null };
}

export async function requestAccountDeletion(actor: { userId: string; email: string; fullName: string | null; role: string }, input: { password: string; idempotencyKey?: string }, now = new Date()) {
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new CommandError(400, "INVALID_PASSWORD", "Parola doğrulanamadı.");
  }
  return runWithReceipt<{ ok: true; requestedAt: string; alreadyRequested: boolean }>({
    actorUserId: actor.userId,
    namespace: "account-deletion",
    idempotencyKey: input.idempotencyKey,
    digestOf: { userId: actor.userId },
    transactional: async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`account-deletion:${actor.userId}`}, 0))::text`;
      const tombstone = await tx.dataSubjectTombstone.findFirst({ where: { subjectUserId: actor.userId, status: { in: ["PENDING_GRACE", "APPLIED"] } }, select: { id: true } });
      if (tombstone) throw new CommandError(409, "ALREADY_PROCESSING", "Hesap silme talebiniz zaten işleniyor.");
      const open = await tx.auditLog.findFirst({ where: { actorUserId: actor.userId, entityId: actor.userId, action: DELETION_REQUEST_ACTION, createdAt: { gte: new Date(now.getTime() - OPEN_WINDOW_MS) } }, orderBy: { createdAt: "desc" }, select: { createdAt: true, payload: true } });
      if (open) {
        // Aynı açık talep: yeni kayıt / bildirim yok; makbuz tekrarı ilk tarihi döndürür.
        return { entityType: "User", entityId: actor.userId, action: "account.deletion.request_repeated", summary: "Açık hesap silme talebi yinelendi", result: { ok: true, requestedAt: requestedAtOf(open), alreadyRequested: true } };
      }
      return {
        entityType: "User",
        entityId: actor.userId,
        action: DELETION_REQUEST_ACTION,
        summary: "Kullanıcı uygulama içinden hesap silme talebi oluşturdu",
        payload: { role: actor.role },
        result: { ok: true, requestedAt: now.toISOString(), alreadyRequested: false },
        after: async () => {
          await notifyActiveAdmins({ title: "Hesap silme talebi", body: `${actor.fullName || actor.email} hesabının silinmesini talep etti. Kimlik ve saklama değerlendirmesi sonrası DSR sürecini başlatın.`, href: `/panel/yonetim/kullanicilar/${actor.userId}` }).catch(() => undefined);
        },
      };
    },
  });
}
