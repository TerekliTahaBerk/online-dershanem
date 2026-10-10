import { hasProductAccess } from "@/lib/auth/products";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { loadParentDigest } from "@/lib/panel/parent-digest-server";
import { toMobileParentDigest } from "@/lib/mobile/parent-views";
import { featureDisabled, parentJson, requireParentChild } from "@/lib/panel/parent-api";

/**
 * Veli · Haftalık özet — web `app/panel/veli/haftalik` ile aynı yükleyici.
 * Yalnız YAYINLANMIŞ öğretmen özeti; otomatik "yaklaşanlar" ayrı alanda.
 * `feedbackAvailable`: MEVCUT geri bildirim ucu (`requireApiOdRole`) velinin
 * kendi OD erişimini ister — yetki genişletilmedi, yalnız bildirildi.
 */
export async function GET(request: Request) {
  const scope = await requireParentChild(request);
  if (!scope.ok) return scope.response;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return featureDisabled("Haftalık özet henüz açık değil.");
  const session = scope.auth.session;
  const [{ digest, upcoming }, feedbackAvailable] = await Promise.all([
    loadParentDigest(session.userId, scope.child),
    hasProductAccess(session.userId, session.role, "OD"),
  ]);
  if (digest) {
    const ageDays = digest.publishedAt ? (Date.now() - digest.publishedAt.getTime()) / 86_400_000 : 0;
    await recordPanelProductEvent(
      { name: "weekly_digest_viewed", properties: { actorRole: "PARENT", trendBand: digest.trendBand as "IMPROVING" | "STEADY" | "BUILDING" | "LIMITED_DATA", ageBand: ageDays <= 2 ? "0-2D" : ageDays <= 7 ? "3-7D" : "8D+" } },
      session.role,
    );
  }
  return parentJson(toMobileParentDigest({ studentId: scope.child.id, feedbackAvailable, digest, upcoming }));
}
