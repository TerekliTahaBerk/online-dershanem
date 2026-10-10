import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { formatPeriodRangeLabel, loadStudentProgressInsight } from "@/lib/progress-insights/server";
import { toMobileParentInsights } from "@/lib/mobile/parent-views";
import { featureDisabled, parentJson, requireParentChild } from "@/lib/panel/parent-api";

/**
 * Veli · Akademik gelişim — web `app/panel/veli/analiz` ile aynı
 * `loadStudentProgressInsight({ audience: "parent_calm" })`. `parent_calm`
 * GÜVENLİK sınırıdır: risk ipucu ve personel anlatısı çıkarılır. Deneme
 * eğilimi yalnız çocuğun OD / ODK erişimi varsa. `progressInsights` kapalı →
 * 404 FEATURE_DISABLED (web 404).
 */
export async function GET(request: Request) {
  const scope = await requireParentChild(request);
  if (!scope.ok) return scope.response;
  if (!getPanelFeatureFlags().progressInsights) return featureDisabled("Gelişim özeti şu anda açık değil.");
  const hasExamAccess = scope.child.products.includes("OD") || scope.child.products.includes("ODK");
  const bundle = await loadStudentProgressInsight({ studentProfileId: scope.child.id, audience: "parent_calm", includeExams: hasExamAccess });
  return parentJson(toMobileParentInsights({ studentId: scope.child.id, bundle, periodRange: bundle ? formatPeriodRangeLabel(bundle.period) : "", hasExamAccess }));
}
