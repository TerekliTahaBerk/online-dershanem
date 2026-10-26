import { blogPublishedAt } from "./blog-meta";

// Verified in the business Google account on 27 October 2026. Public tag ID.
export const GOOGLE_ANALYTICS_ID = "G-M8XHNBR1E6";
export const GA_CONSENT_KEY = "od_ga_consent_v1";
export const GA_CONSENT_DAYS = 180;

const publicPaths = new Set([
  "/", "/urunler", "/urunler/online-dershanem", "/urunler/online-kocum",
  "/urunler/online-deneme-kulubum", "/paketler", "/online-ozel-ders",
  "/blog", "/hakkimizda", "/sss", "/iletisim", "/kvkk", "/gizlilik", "/iade",
  "/uygulamalar/mobil", "/uygulamalar/bilgin", "/dino-ai",
  ...Object.keys(blogPublishedAt).map(slug => `/blog/${slug}`),
]);

/** Unknown paths, student panels, checkout and authentication never enter GA. */
export function googleAnalyticsPath(pathname: string): string | null {
  return publicPaths.has(pathname) ? pathname : null;
}

export function googleAnalyticsUrl(origin: string, pathname: string): string | null {
  const path = googleAnalyticsPath(pathname);
  return path ? `${origin}${path}` : null;
}

export function googleAnalyticsReferrer(value: string): string {
  try { return new URL(value).origin; } catch { return ""; }
}

export function applicationClick(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && url.hostname === "tally.so" && url.pathname === "/r/QK6MYp";
  } catch { return false; }
}

export function readGoogleAnalyticsConsent(value: string | null, now = Date.now()): "granted" | "denied" | "unset" {
  try {
    const consent = JSON.parse(value ?? "null");
    if ((consent?.choice === "granted" || consent?.choice === "denied") &&
      typeof consent.expiresAt === "number" && consent.expiresAt > now &&
      consent.expiresAt <= now + GA_CONSENT_DAYS * 86_400_000) return consent.choice;
  } catch { /* Invalid or unavailable storage means no consent. */ }
  return "unset";
}
