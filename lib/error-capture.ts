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

export type ErrorContext = Record<string, unknown>;

export function captureError(err: unknown, context?: ErrorContext): void {
  log.error("app.error", err, context);

  // İleride Sentry/Datadog entegrasyonu:
  // if (process.env.SENTRY_DSN) { Sentry.captureException(err, { extra: context }); }
}

/**
 * Server action sarmalayıcı — hata olursa capture + re-throw.
 * NextAuth/Next.js redirect()'i bypass etmek için NEXT_REDIRECT erroru'nu re-throw eder.
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
    captureError(err, { ...context, action: name });
    throw err;
  }
}
