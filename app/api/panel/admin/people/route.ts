import { z } from "zod";
import { toMobilePeopleDirectory } from "@/lib/mobile/admin-people-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { listPendingMfaResets } from "@/lib/panel/mfa-reset-queue-server";
import { countStudentsAwaitingAccess, loadPeopleDirectory } from "@/lib/panel/people-directory-server";

const querySchema = z.object({
  sekme: z.string().trim().max(20).optional(),
  q: z.string().trim().max(120).optional(),
  rol: z.string().trim().max(20).optional(),
  urun: z.string().trim().max(10).optional(),
  durum: z.string().trim().max(20).optional(),
  sayfa: z.string().trim().max(6).optional(),
});

/**
 * Kişiler dizini (mobil, Faz 2.2) — web `app/panel/yonetim/kisiler` ile AYNI
 * görünüm / süzgeç / sayfalama (`loadPeopleDirectory`, bilinmeyen değerler
 * web'deki gibi varsayılana düşer) ve AYNI MFA sıfırlama onay kuyruğu.
 */
export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(["sekme", "q", "rol", "urun", "durum", "sayfa"].flatMap((key) => (url.searchParams.has(key) ? [[key, url.searchParams.get(key)]] : []))));
  const [directory, pending, awaiting] = await Promise.all([loadPeopleDirectory(parsed.success ? parsed.data : {}), listPendingMfaResets(), countStudentsAwaitingAccess()]);
  return adminJson(toMobilePeopleDirectory(directory, pending, auth.session.userId, awaiting));
}
