/**
 * Production error capture — opsiyonel Sentry/Datadog için tek giriş noktası.
 *
 * Şu an structured log'a yazıyor. İleride Sentry eklenirse sadece bu dosya
 * değişir, call site'lar dokunulmaz.
 *
 * Kullanım:
 *   try { ... } catch (err) { captureError(err, { route: "/api/x", userId }); throw err; }
 *
 * Server actions için convenience: withCapture(fn) — try/catch sarmalar.
 */
import "server-only";
import { log } from "@/lib/logger";
import { buildOperationalAlertRequest, type OperationalAlert } from "@/lib/operational-alert-payload";

export type { OperationalAlert } from "@/lib/operational-alert-payload";

export type ErrorContext = Record<string, unknown>;

export function captureError(err: unknown, context?: ErrorContext): void {
  log.error("app.error", err, context);
}

/** Opsiyonel webhook ile merkezi alarm gönderir; alarm arızası isteği bozmaz. */
export async function reportError(err: unknown, context?: ErrorContext): Promise<void> {
  captureError(err, context);
  const error = err instanceof Error ? err : new Error(String(err));
  await reportOperationalAlert({
    event: "app.error",
    severity: "critical",
    summary: error.message,
    context: { ...context, errorName: error.name, digest: "digest" in error ? String(error.digest) : undefined },
  });
}

/** Discord'a mesaj, özel webhook'lara mevcut alarm gövdesini yollar. */
export async function reportOperationalAlert(alert: OperationalAlert): Promise<void> {
  const webhook = process.env.ERROR_ALERT_WEBHOOK_URL;
  if (!webhook || process.env.NODE_ENV !== "production") return;
  try {
    const request = buildOperationalAlertRequest(webhook, alert);
    const response = await fetch(request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      log.warn("app.error_alert_failed", { event: alert.event, status: response.status });
    }
  } catch (alertError) {
    log.warn("app.error_alert_failed", { event: alert.event, errorName: alertError instanceof Error ? alertError.name : "UNKNOWN" });
  }
}

/**
 * Server action sarmalayıcı — hata olursa capture + re-throw.
 * Next.js redirect() hatasını normal kontrol akışı olarak yeniden fırlatır.
 */
export async function withCapture<T>(
  name: string,
  fn: () => Promise<T>,
  context?: ErrorContext,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Next.js internal redirect/notFound exception'ları normal akış — capture etme
    if (err instanceof Error && (err.message === "NEXT_REDIRECT" || err.message === "NEXT_NOT_FOUND")) {
      throw err;
    }
    await reportError(err, { ...context, action: name });
    throw err;
  }
}
