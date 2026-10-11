import { toMobileEducators } from "@/lib/mobile/admin-people-extra-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadEducators } from "@/lib/panel/educators-server";

/** Öğretmenler ve grup doluluğu (mobil, Faz 2.2) — web `app/panel/yonetim/egitmenler` ile AYNI `loadEducators`. */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  return adminJson(toMobileEducators(await loadEducators()));
}
