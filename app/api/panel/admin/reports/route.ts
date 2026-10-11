import { MOBILE_ADMIN_CONTRACT_VERSION } from "@/lib/mobile-contracts/admin";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadAdminReports } from "@/lib/panel/admin-reports-server";

/**
 * Yönetim raporları (mobil, Faz 2.1) — web `app/panel/yonetim/raporlar` ile
 * AYNI `loadAdminReports` (son 30 gün). Salt okuma; CSV dışa aktarımı
 * mobil kapsamı dışındadır (E5).
 */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  return adminJson({ contractVersion: MOBILE_ADMIN_CONTRACT_VERSION, ...(await loadAdminReports()) });
}
