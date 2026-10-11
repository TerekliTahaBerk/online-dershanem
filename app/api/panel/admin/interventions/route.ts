import { NextResponse } from "next/server";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getInterventionInbox, listInterventionStudentOptions } from "@/lib/intervention-inbox-server";
import { toMobileInterventionInbox } from "@/lib/mobile/admin-views";
import { adminJson, PRIVATE_NO_STORE, requireAdminApi } from "@/lib/panel/admin-api";

/**
 * Yönetim müdahale kutusu (mobil, Faz 2.1) — web `app/panel/yonetim/mudahale`
 * ile AYNI `getInterventionInbox({ role: "ADMIN" })` ve öğrenci seçenekleri.
 * Salt okuma; yazmalar mevcut `/api/panel/interventions/*` uçlarındadır.
 */
export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().interventionInbox) {
    return NextResponse.json({ error: "Müdahale kutusu henüz açık değil.", code: "FEATURE_DISABLED" }, { status: 404, headers: PRIVATE_NO_STORE });
  }
  const [rows, students] = await Promise.all([getInterventionInbox({ role: "ADMIN", userId: auth.session.userId }), listInterventionStudentOptions()]);
  return adminJson(toMobileInterventionInbox(rows, students));
}
