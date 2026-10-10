import "server-only";

import { NextResponse } from "next/server";
import type { ProductCode } from "@prisma/client";
import { requireApiProductRole, type ApiAuth } from "@/lib/auth/api-guards";
import { hasStaffPermission } from "@/lib/products/staff-permissions";
import type { StaffPermission } from "@/lib/products/staff-permission-matrix";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";

/**
 * MOBİL PERSONEL OKUMA UÇLARININ ORTAK KAPISI (M7).
 *
 * Sıra:
 *  1. Oturum + parola / MFA kapıları + platform rolü TEACHER + ürün erişimi ve
 *     pilot (`requireApiProductRole(product, "TEACHER")`). ADMIN mobil
 *     personel uçlarına GİRMEZ (yönetim web-only; önizleme overlay'leri
 *     mobilde yazma yetkisi doğurmaz).
 *  2. Personel izni (`hasStaffPermission`): `STAFF_PRODUCT_ASSIGNMENTS`
 *     moduna uyar — shadow / legacy'de eski kural (her TEACHER, ilişki
 *     kontrolleri ayrıca), enforce'ta `ProductStaffAssignment`. Mod burada
 *     DEĞİŞTİRİLMEZ.
 *  3. Kaynak ilişkisi her yükleyicide ayrıca uygulanır (ders `teacherId`,
 *     grup öğretmeni + aktif kayıt, aktif `CoachAssignment`).
 *
 * M9: OD ders kapanışı / teslim değerlendirmesi / yardım yanıtı da bu kapıyı
 * kullanır; kaynak ilişkileri ve mutation guard kontrolleri ayrıca korunur.
 */
export { PRIVATE_NO_STORE };

export async function requireStaffApi(product: ProductCode, permission: StaffPermission): Promise<ApiAuth> {
  const auth = await requireApiProductRole(product, "TEACHER");
  if (!auth.ok) return auth;
  if (!(await hasStaffPermission(auth.session.userId, permission))) {
    return { ok: false, response: NextResponse.json({ error: "Bu işlem için yetkiniz yok.", code: "FORBIDDEN" }, { status: 403, headers: PRIVATE_NO_STORE }) };
  }
  return auth;
}

export function staffJson(body: unknown): Response {
  return NextResponse.json(body, { headers: PRIVATE_NO_STORE });
}

export function staffNotFound(message = "Kayıt bulunamadı."): Response {
  return NextResponse.json({ error: message }, { status: 404, headers: PRIVATE_NO_STORE });
}

export function staffFeatureDisabled(message: string): Response {
  return NextResponse.json({ error: message, code: "FEATURE_DISABLED" }, { status: 404, headers: PRIVATE_NO_STORE });
}

/** Rota kimliği biçimi (yalnız biçim; yetki değil). */
export function validRouteId(value: string): boolean {
  return /^[\w-]{1,191}$/.test(value);
}

/** Yalnız HTTPS bağlantı; aksi halde null (keyfi şema / http açılmaz). */
export function httpsOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}
