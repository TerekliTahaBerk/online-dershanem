import { toMobileActivationDesk } from "@/lib/mobile/admin-desk-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadActivationDesk } from "@/lib/panel/activation-desk-server";

/**
 * Aktivasyon masası (mobil, Faz 2.1) — web `app/panel/yonetim/isler` ile
 * AYNI `loadActivationDesk`. Salt okuma; yazmalar mevcut sipariş / talep /
 * e-posta uçlarındadır (geçiş ve sipariş bağlama taze step-up ister).
 */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  return adminJson(toMobileActivationDesk(await loadActivationDesk()));
}
