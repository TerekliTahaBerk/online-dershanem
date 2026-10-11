import { z } from "zod";
import { toMobileSignups } from "@/lib/mobile/admin-people-extra-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadPendingChildren, loadSignupCounts, loadSignupList, SIGNUP_FILTERS } from "@/lib/panel/signups-server";

const querySchema = z.object({ sekme: z.string().trim().max(20).optional(), filtre: z.string().trim().max(20).optional(), sayfa: z.string().trim().max(6).optional() });

/**
 * Yeni kayıtlar (mobil, Faz 2.2) — web `app/panel/yonetim/basvurular` ile
 * AYNI yükleyiciler ve sekme / süzgeç kuralları (bilinmeyen değer varsayılana düşer).
 */
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(["sekme", "filtre", "sayfa"].flatMap((key) => (url.searchParams.has(key) ? [[key, url.searchParams.get(key)]] : []))));
  const params = parsed.success ? parsed.data : {};
  const tab = params.sekme === "cocuklar" ? "cocuklar" : "kayitlar";
  const filter = SIGNUP_FILTERS.find((item) => item.value === params.filtre)?.value ?? "tumu";
  const page = Math.max(1, Number.parseInt(params.sayfa ?? "1", 10) || 1);
  const [counts, list, children] = await Promise.all([
    loadSignupCounts(),
    tab === "kayitlar" ? loadSignupList(filter, page) : Promise.resolve(null),
    tab === "cocuklar" ? loadPendingChildren() : Promise.resolve(null),
  ]);
  return adminJson(toMobileSignups({ tab, filter, page, counts, list, children }));
}
