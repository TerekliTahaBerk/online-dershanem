import { z } from "zod";
import { toMobileParentsPage } from "@/lib/mobile/admin-people-extra-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadParentsPage } from "@/lib/panel/parents-server";

const querySchema = z.object({ q: z.string().trim().max(120).optional(), durum: z.string().trim().max(20).optional(), sayfa: z.string().trim().max(6).optional() });

/** Veliler + veli–öğrenci bağlantıları (mobil, Faz 2.2) — web `app/panel/yonetim/veliler` ile AYNI `loadParentsPage`. */
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(["q", "durum", "sayfa"].flatMap((key) => (url.searchParams.has(key) ? [[key, url.searchParams.get(key)]] : []))));
  return adminJson(toMobileParentsPage(await loadParentsPage(parsed.success ? parsed.data : {})));
}
