import "server-only";

import { Prisma, type PushPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Cihaz kaydı. Kullanıcı ve oturum DAİMA sunucu oturumundan gelir.
 *
 * Kurallar:
 *  - Bir Expo push token'ı aynı anda tek kullanıcıya bağlıdır (benzersiz).
 *    Token başka kullanıcıya kayıtlıysa o kayıt (ve teslim geçmişi) SİLİNİR,
 *    yeni kullanıcı için temiz kayıt açılır: A'nın bildirimi B'nin cihazına gitmez.
 *  - Aynı oturum yeni bir token kaydederse (token rotasyonu / yeniden kurulum)
 *    oturumun diğer etkin kayıtları iptal edilir: çift etkin kayıt yok.
 *  - İptal edilmiş kaydın yeniden etkinleşmesinde `activatedAt` yenilenir:
 *    aradaki bildirim birikimi gönderilmez.
 */
export type RegisterDeviceInput = {
  userId: string;
  sessionId: string;
  token: string;
  platform: PushPlatform;
  appVersion: string;
  projectId: string | null;
  appEnvironment: string | null;
  permissionStatus: string | null;
};

export async function registerPushDevice(input: RegisterDeviceInput, now = new Date()) {
  const run = () =>
    prisma.$transaction(
      async (tx) => {
        const existing = await tx.pushDevice.findUnique({ where: { expoPushToken: input.token } });
        if (existing && existing.userId !== input.userId) {
          await tx.pushDevice.delete({ where: { id: existing.id } });
        }
        await tx.pushDevice.updateMany({
          where: { sessionId: input.sessionId, revokedAt: null, NOT: { expoPushToken: input.token } },
          data: { revokedAt: now, revokedReason: "TOKEN_ROTATED" },
        });
        const fields = {
          sessionId: input.sessionId,
          platform: input.platform,
          appVersion: input.appVersion,
          projectId: input.projectId,
          appEnvironment: input.appEnvironment,
          permissionStatus: input.permissionStatus,
          lastSeenAt: now,
        };
        if (existing && existing.userId === input.userId) {
          return tx.pushDevice.update({
            where: { id: existing.id },
            data: { ...fields, ...(existing.revokedAt ? { revokedAt: null, revokedReason: null, activatedAt: now } : {}) },
            select: { id: true, activatedAt: true },
          });
        }
        return tx.pushDevice.create({ data: { ...fields, userId: input.userId, expoPushToken: input.token, activatedAt: now }, select: { id: true, activatedAt: true } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  try {
    return await run();
  } catch (error) {
    // Eşzamanlı kayıt (aynı token iki istekte): bir kez yeniden dene.
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) return run();
    throw error;
  }
}

/**
 * Bu oturumun cihaz kayıtlarını iptal eder (çıkış / kullanıcı kapattı).
 * İdempotent; başka kullanıcının kaydına dokunamaz (`userId` filtresi).
 */
export async function revokePushDevices(input: { userId: string; sessionId: string; token: string | null; reason: string }, now = new Date()) {
  const result = await prisma.pushDevice.updateMany({
    where: {
      userId: input.userId,
      revokedAt: null,
      OR: [{ sessionId: input.sessionId }, ...(input.token ? [{ expoPushToken: input.token }] : [])],
    },
    data: { revokedAt: now, revokedReason: input.reason },
  });
  await prisma.pushDelivery.updateMany({
    where: { state: { in: ["PENDING", "RETRY"] }, device: { userId: input.userId, revokedAt: { not: null } } },
    data: { state: "CANCELED", lastErrorCode: "DEVICE_REVOKED" },
  });
  return result.count;
}

export async function listPushDevices(userId: string, sessionId: string) {
  const rows = await prisma.pushDevice.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, platform: true, appVersion: true, lastSeenAt: true, createdAt: true, sessionId: true },
  });
  // Token ve oturum kimliği DÖNMEZ; yalnız "bu cihaz mı" bilgisi.
  return rows.map(({ sessionId: deviceSession, ...row }) => ({ ...row, current: deviceSession === sessionId }));
}
