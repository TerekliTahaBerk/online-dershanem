import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

/**
 * Ürün (OD / ODK) erişim katmanı.
 *
 * - OD  → mevcut OnlineDershanem panel içerikleri (canlı ders, paket, vb.)
 * - ODK → OnlineDenemeKulübü dijital sınav modülü
 *
 * Erişim kaynakları:
 *   1. ADMIN her şeyi görür (her iki bayrak da true).
 *   2. `OdkAccessTag.service` üzerinden user'a bağlı aktif (revokedAt=null,
 *      expiresAt null veya gelecekte) `OdkUserAccessTag` row'u varsa true.
 *
 * NOT: Frontend gizleme yetmez — `requireOdkAccess` server-side guard.
 *      Page/route bazlı kullanım için tasarlandı.
 */

export type AccessFlags = {
  hasOD: boolean;
  hasODK: boolean;
};

/**
 * Bir kullanıcının OD/ODK bayraklarını çıkarır. ADMIN ise her ikisi de true.
 * Tek bir DB sorgusu yapar.
 */
export async function getUserAccessFlags(
  userId: string,
  role?: UserRole | null,
): Promise<AccessFlags> {
  if (role === "ADMIN") return { hasOD: true, hasODK: true };

  const now = new Date();
  const rows = await prisma.odkUserAccessTag.findMany({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      accessTag: { isActive: true },
    },
    select: { accessTag: { select: { service: true } } },
  });

  let hasOD = false;
  let hasODK = false;
  for (const r of rows) {
    if (r.accessTag.service === "OD") hasOD = true;
    else if (r.accessTag.service === "ODK") hasODK = true;
    if (hasOD && hasODK) break;
  }
  return { hasOD, hasODK };
}

/**
 * Sayfa-seviyesi guard. ODK erişimi yoksa kullanıcıyı ODK paket satın alma
 * sayfasına yönlendirir. Admin her zaman geçer.
 *
 * Kullanım:
 *   const ctx = await requirePanelSession();
 *   await requireOdkAccess(ctx.userId, ctx.actualRole);
 */
export async function requireOdkAccess(
  userId: string,
  role: UserRole,
  fallbackHref?: string,
): Promise<AccessFlags> {
  const flags = await getUserAccessFlags(userId, role);
  if (!flags.hasODK) {
    redirect(fallbackHref ?? "/odk-paketleri?from=panel");
  }
  return flags;
}

/**
 * OD (klasik OnlineDershanem panel) erişim guard'ı. Şu an mevcut tüm
 * öğrenci/öğretmen kullanıcılarının `od-default` tagı var (backfill
 * sayesinde) — yine de yeni kullanıcılar için defansif.
 *
 * Erişim yoksa OD paket sayfasına yönlendirir.
 */
export async function requireOdAccess(
  userId: string,
  role: UserRole,
  fallbackHref?: string,
): Promise<AccessFlags> {
  const flags = await getUserAccessFlags(userId, role);
  if (!flags.hasOD) {
    redirect(fallbackHref ?? "/paketler?from=panel");
  }
  return flags;
}

/**
 * API route'lar için: session + ODK gate. Throw eden hata yerine
 * { ok, response } döner; çağıran NextResponse.json kullanır.
 */
export async function ensureOdkApiAccess(): Promise<
  | { ok: true; userId: string; role: UserRole; flags: AccessFlags }
  | { ok: false; status: number; message: string }
> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Oturum gerekli." };
  }
  const role = (session.user.role ?? "STUDENT") as UserRole;
  const flags = await getUserAccessFlags(session.user.id, role);
  if (!flags.hasODK && role !== "ADMIN") {
    return { ok: false, status: 403, message: "ODK erişiminiz yok." };
  }
  return { ok: true, userId: session.user.id, role, flags };
}

/**
 * Belirli bir denemeye öğrenci bazında erişim. Tag eşleşmesi yoksa false.
 * Admin her zaman true. Öğretmen/Veli şimdilik bu helper'la kontrol
 * edilmiyor (kendi scope helper'ları gelecek fazlarda).
 *
 * Kural:
 *   - Exam'ın bağlı tagları yoksa → "herkese açık" sayılmaz; en az bir
 *     access tag bağlı olmalı (admin yayın gate'i).
 *   - User aktif tagları ile exam tagları arasında en az bir kesişim varsa
 *     erişim verilir.
 */
export async function canStudentAccessExam(
  userId: string,
  role: UserRole,
  examId: string,
): Promise<boolean> {
  if (role === "ADMIN") return true;

  const [examTags, userTags] = await Promise.all([
    prisma.odkExamAccessTag.findMany({
      where: { examId },
      select: { accessTagId: true },
    }),
    prisma.odkUserAccessTag.findMany({
      where: {
        userId,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        accessTag: { isActive: true, service: "ODK" },
      },
      select: { accessTagId: true },
    }),
  ]);

  if (examTags.length === 0) return false;
  const userIds = new Set(userTags.map((t) => t.accessTagId));
  return examTags.some((t) => userIds.has(t.accessTagId));
}
