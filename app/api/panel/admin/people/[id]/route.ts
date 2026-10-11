import { NextResponse } from "next/server";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { toMobilePersonDetail } from "@/lib/mobile/admin-people-views";
import { adminJson, PRIVATE_NO_STORE, requireAdminApi } from "@/lib/panel/admin-api";
import { loadPersonDetail } from "@/lib/panel/person-detail-server";

/**
 * Kişi detayı (mobil, Faz 2.2) — web `app/panel/yonetim/kullanicilar/[id]`
 * ile AYNI `loadPersonDetail` (güvenlik ve geçmiş bölümleri dahil). Salt
 * okuma; yazmalar mevcut `/api/panel/users/[id]/*` uçlarındadır.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const detail = await loadPersonDetail(params.data.id, { security: true, history: true });
  if (!detail) return NextResponse.json({ error: "Kişi bulunamadı.", code: "NOT_FOUND" }, { status: 404, headers: PRIVATE_NO_STORE });
  return adminJson(toMobilePersonDetail(detail, auth.session.userId));
}
