export type ReferralAttribution = { campaignExternalId: string | null; adExternalId: string | null; confidence: number };
function findString(value: unknown, keys: Set<string>): string | null {
  if (!value || typeof value !== "object") return null;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) if (keys.has(key) && (typeof nested === "string" || typeof nested === "number")) return String(nested);
  for (const nested of Object.values(value as Record<string, unknown>)) { const match = findString(nested, keys); if (match) return match; }
  return null;
}
export function extractReferralAttribution(referral: unknown): ReferralAttribution {
  const adExternalId = findString(referral, new Set(["ad_id", "adId", "advertisement_id"]));
  const campaignExternalId = findString(referral, new Set(["campaign_id", "campaignId"]));
  return { adExternalId, campaignExternalId, confidence: adExternalId ? 0.98 : campaignExternalId ? 0.9 : 0 };
}
export function selectAttributionModel<T extends { createdAt: Date }>(touches: T[], model: "FIRST_TOUCH" | "LAST_TOUCH"): T | null {
  if (!touches.length) return null;
  return touches.reduce((selected, touch) => model === "FIRST_TOUCH" ? (touch.createdAt < selected.createdAt ? touch : selected) : (touch.createdAt > selected.createdAt ? touch : selected));
}
