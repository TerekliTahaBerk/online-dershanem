import "server-only";

import { NextResponse } from "next/server";
import { requireApiAccountRole, requireApiRecentAdminStepUp, type ApiAuth } from "@/lib/auth/api-guards";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";

/**
 * MOBİL YÖNETİM UÇLARININ ORTAK KAPISI (Faz 1).
 *
 * Sıra:
 *  1. Oturum + parola / MFA kapıları + platform rolü ADMIN
 *     (`requireApiAccountRole("ADMIN")`). Dönen oturum GERÇEK yöneticidir:
 *     ADMIN rolü listede olduğu için önizleme / öğretmen modu overlay'i
 *     uygulanmaz, yani overlay yönetim yetkisi doğurmaz ve yönetim verisi
 *     önizlenen kullanıcı adına okunmaz.
 *  2. `stepUp: true` → son 10 dakikada ikinci faktör (`requireApiRecentAdminStepUp`,
 *     428 `STEP_UP_REQUIRED`). Rol / erişim / MFA / parola / arşiv gibi hassas
 *     yazmalar bunu kullanır.
 *  3. Kaynak kapsamı ve iş kuralları her uçta mevcut `lib/**` servisinde kalır.
 *
 * Web sayfaları `requireRole("ADMIN")` ile aynı kararı verir; bu kapı yalnız
 * JSON + `private, no-store` taşıma farkını ekler.
 */
export { PRIVATE_NO_STORE };

export async function requireAdminApi(options: { stepUp?: boolean } = {}): Promise<ApiAuth> {
  const auth = options.stepUp ? await requireApiRecentAdminStepUp() : await requireApiAccountRole("ADMIN");
  if (!auth.ok) auth.response.headers.set("Cache-Control", PRIVATE_NO_STORE["Cache-Control"]);
  return auth;
}

export function adminJson(body: unknown, init: { status?: number } = {}): Response {
  return NextResponse.json(body, { status: init.status ?? 200, headers: PRIVATE_NO_STORE });
}
