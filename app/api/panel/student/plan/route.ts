import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadStudentPlan } from "@/lib/kocum/student-plan-server";
import { toMobileYonPlan } from "@/lib/mobile/yon-views";

/**
 * Planım — web `app/panel/ogrenci/plan` ile AYNI yükleyici
 * (`loadStudentPlan`). Web sayfası gibi `adaptivePlan` kapalıyken açılmaz
 * (404 `FEATURE_DISABLED`). Taslak planın görevleri yanıta girmez; Deneme
 * Ligi sınavları okunmaz.
 */
export async function GET() {
  const auth = await requireApiProductRole("OK", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan şu anda açık değil.", code: "FEATURE_DISABLED" }, { status: 404 });
  }
  const data = await loadStudentPlan({ userId: auth.session.userId, productCode: "OK" });
  return NextResponse.json(toMobileYonPlan(data), { headers: { "Cache-Control": "private, no-store" } });
}
