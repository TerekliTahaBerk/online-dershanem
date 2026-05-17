/**
 * Round 7 — Background job runner.
 *
 * Tüm cron route'ları için ortak wrapper:
 *  - `Bearer ${CRON_SECRET}` auth (yoksa dev modda aç)
 *  - Structured start/done/error log
 *  - Duration tracking
 *  - Exception swallow → 500 yerine 200 + ok:false (cron monitor'ün yeniden tetiklemesini engellemek için
 *    handler kendi 5xx'i throw edebilir; default davranış: yutmak)
 *  - JSON response standardı: `{ ok, job, durationMs, ...result }`
 *
 * Schema-free — JobRun modeli eklenmedi (Round 8'de gerekirse). Logger Vercel
 * loglarında structured JSON line olarak yazar, monitoring (BetterStack/Sentry)
 * oradan tüketir.
 */
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export type JobResult = Record<string, unknown> & {
  /** Handler'ın "başarılı sayılıp sayılmayacağı". Default true. */
  ok?: boolean;
};

export type JobOpts = {
  /** Hata fırlatırsa 500 dönsün (default false — 200 + ok:false). Vercel cron için false önerilir. */
  errorAsHttp500?: boolean;
};

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev'de aç
  const header = req.headers.get("authorization") || "";
  if (header === `Bearer ${secret}`) return true;
  // Vercel Cron User-Agent fallback (Vercel-Cron 1.0)
  const ua = req.headers.get("user-agent") || "";
  return ua.startsWith("vercel-cron") && header === "";
}

export async function runJob(
  name: string,
  req: Request,
  handler: () => Promise<JobResult>,
  opts: JobOpts = {},
): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    log.warn("cron.unauthorized", { job: name, ua: req.headers.get("user-agent") });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const t0 = Date.now();
  log.info("cron.start", { job: name });
  try {
    const result = await handler();
    const durationMs = Date.now() - t0;
    const ok = result.ok !== false;
    log.info("cron.done", { job: name, durationMs, ok, ...result });
    return NextResponse.json({ ok, job: name, durationMs, ...result });
  } catch (err) {
    const durationMs = Date.now() - t0;
    log.error("cron.failed", err, { job: name, durationMs });
    if (opts.errorAsHttp500) {
      return NextResponse.json(
        { ok: false, job: name, durationMs, error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: false,
      job: name,
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
