import { toMobilePilot } from "@/lib/mobile/admin-rollout-views";
import { adminJson, requireAdminApi } from "@/lib/panel/admin-api";
import { loadPilotPage } from "@/lib/panel/pilot-server";

/** Kontrollü yayın (Y25) — web `yonetim/pilot` ile AYNI yükleyici. */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  return adminJson(toMobilePilot(await loadPilotPage()));
}
