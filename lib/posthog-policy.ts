export const POSTHOG_VISITOR_COOKIE = "od_analytics_visitor";

export function posthogHost(value: string | undefined): string {
  // Marketplace'in dashboard adresini EU ingestion adresine eşleştir.
  if (!value || value === "https://eu.posthog.com") return "https://eu.i.posthog.com";
  return value;
}

export function validVisitorId(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

/** Panel ve kimlik doğrulama URL'leri analitik olaylarına gönderilmez. */
export function trackablePath(pathname: string): boolean {
  return !/^\/(panel|api|giris|kayit|sifre[^/]*)(\/|$)/.test(pathname);
}

export function cleanAnalyticsUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

/**
 * PostHog `/flags?v=2` yanıtından kill-switch değeri. Bayrak tanımlı değilse
 * ya da yanıt beklenmedik biçimdeyse `undefined` (çağıran varsayılanı kullanır).
 */
export function readFlagEnabled(body: unknown, key: string): boolean | undefined {
  const flag = (body as { flags?: Record<string, { enabled?: unknown }> } | null)?.flags?.[key];
  return typeof flag?.enabled === "boolean" ? flag.enabled : undefined;
}
