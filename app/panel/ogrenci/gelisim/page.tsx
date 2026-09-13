import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export const dynamic = "force-dynamic";

/**
 * Eski Gelişim rotası — Analiz yüzeyine yönlendirir.
 * Flag kapalıysa eski içerik için gelisim legacy yolu: ana panele dön.
 */
export default async function StudentGelisimRedirectPage() {
  await requireRole("STUDENT");
  const flags = getPanelFeatureFlags();
  if (flags.progressInsights) {
    redirect("/panel/ogrenci/analiz");
  }
  redirect("/panel/ogrenci");
}
