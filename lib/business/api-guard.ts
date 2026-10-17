import "server-only";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasFreshStepUp } from "@/lib/auth/mfa-policy";
import { readAdminOverlayTransport } from "@/lib/auth/admin-overlay";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";
import { businessFlags } from "@/lib/business/flags";
import { getBusinessAccess, type BusinessAccess, type BusinessPermission } from "@/lib/business/access";

/**
 * İŞLETME (P2.7) JSON UÇLARININ KAPISI — web sayfası guard'ının
 * (`requireBusinessPage`) çerez + Bearer karşılığı.
 *
 *  - Yetki TEK kaynaktan: `BusinessRoleAssignment` (`getBusinessAccess`);
 *    platform `ADMIN` rolü tek başına işletme izni vermez (ADR-0011).
 *  - Yetkisizde 404 `NOT_FOUND` (web ile aynı: alanın varlığı sızdırılmaz).
 *  - Mobil yönetici önizlemesi / öğretmen modu açıkken işletme kapalıdır
 *    (403); geçersiz mod belirteci de 403.
 *  - `stepUp: true` → web'in `requireRecentBusinessPage` kuralı (428).
 *  - Yanıtlar `private, no-store`.
 */
export type BusinessApiAuth = { ok: true; access: BusinessAccess } | { ok: false; response: NextResponse };

const fail = (status: number, code: string, error: string): BusinessApiAuth => ({ ok: false, response: NextResponse.json({ error, code }, { status, headers: PRIVATE_NO_STORE }) });

export async function requireBusinessApi(permission: BusinessPermission, options: { stepUp?: boolean; finance?: boolean } = {}): Promise<BusinessApiAuth> {
  if (!businessFlags.panel || (options.finance && !businessFlags.finance)) return fail(404, "NOT_FOUND", "Bölüm bulunamadı; kaldırılmış ya da değişmiş olabilir.");
  const session = await getSession();
  if (!session) return fail(401, "UNAUTHENTICATED", "Oturumunuz sona ermiş. Tekrar giriş yapın.");
  const overlay = await readAdminOverlayTransport(session);
  if (overlay.kind === "invalid") return fail(403, "ADMIN_OVERLAY_INVALID", "Panel modu sona erdi veya geçersiz. Yönetim paneline dönün.");
  if (overlay.kind === "preview" || overlay.kind === "teacher") return fail(403, "FORBIDDEN", "İşletme paneli önizleme veya öğretmen modunda açılmaz.");
  if (session.mustChangePassword) return fail(403, "PASSWORD_CHANGE_REQUIRED", "Devam etmeden önce parolanızı değiştirmeniz gerekiyor.");
  // MFA ve hesap durumu kapıları `getBusinessAccess` içinde (web ile aynı).
  const units = await getBusinessAccess(session, permission);
  if (units.length === 0) return fail(404, "NOT_FOUND", "Bölüm bulunamadı; kaldırılmış ya da değişmiş olabilir.");
  if (options.stepUp && !hasFreshStepUp(session.stepUpAt)) return fail(428, "STEP_UP_REQUIRED", "Bu hassas işlem için kimliğinizi yeniden doğrulayın.");
  return { ok: true, access: { session, units } };
}

export function businessJson(body: unknown, init: { status?: number } = {}): Response {
  return NextResponse.json(body, { status: init.status ?? 200, headers: PRIVATE_NO_STORE });
}
