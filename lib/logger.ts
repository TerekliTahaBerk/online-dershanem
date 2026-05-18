/**
 * Structured logger wrapper.
 *
 * - dev: pretty multi-line with emoji tone
 * - prod: tek satır JSON (Vercel logs, Datadog, Better Stack vs. parse edebilsin)
 *
 * Kullanım:
 *   import { log } from "@/lib/logger";
 *   log.info("order.paid", { orderId, amount });
 *   log.warn("push.invalid_token", { token });
 *   log.error("payment.webhook_failed", err, { providerId });
 */
import "server-only";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level =
  (process.env.LOG_LEVEL as Level | undefined) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldEmit(level: Level): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[MIN_LEVEL];
}

/**
 * PII masking — telefon ve e-mail değerlerini kısmen maskeler.
 *
 * - "ali@example.com" → "a**@example.com"
 * - "+905551234567"   → "+9055****4567"
 *
 * Sadece string değerler işlenir; nesne/dizi içindeki PII alanları için
 * (`email`, `phone`, `phoneKey`, `password`, `token`, `secret`) anahtar bazlı
 * maskeleme uygulanır. KVKK / log aggregator hijyeni için kritik.
 *
 * Maskeleme `LOG_PII_MASK=0` ile devre dışı bırakılabilir (debug için).
 */
const MASK_PII = process.env.LOG_PII_MASK !== "0";
const PII_KEYS = new Set([
  "email", "phone", "phoneKey", "phoneE164",
  "password", "passwordHash", "token", "accessToken", "refreshToken",
  "secret", "apiKey", "authorization", "cookie",
]);

function maskEmail(s: string): string {
  const at = s.indexOf("@");
  if (at < 1) return s;
  const local = s.slice(0, at);
  const domain = s.slice(at);
  const visible = local.slice(0, Math.min(1, local.length));
  return `${visible}${"*".repeat(Math.max(2, local.length - 1))}${domain}`;
}

function maskPhone(s: string): string {
  const digits = s.replace(/\D/g, "");
  if (digits.length < 6) return s;
  const head = s.slice(0, 4);
  const tail = s.slice(-4);
  return `${head}${"*".repeat(Math.max(2, s.length - 8))}${tail}`;
}

function maskValue(key: string, value: unknown): unknown {
  if (!MASK_PII) return value;
  if (typeof value === "string") {
    const k = key.toLowerCase();
    if (k === "email" || /email/i.test(key)) return maskEmail(value);
    if (k === "phone" || k === "phonekey" || /phone/i.test(key)) return maskPhone(value);
    if (PII_KEYS.has(k)) return "***redacted***";
  }
  return value;
}

function sanitizeContext(ctx: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!ctx || !MASK_PII) return ctx;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitizeContext(v as Record<string, unknown>);
    } else {
      out[k] = maskValue(k, v);
    }
  }
  return out;
}

function emit(level: Level, event: string, contextRaw?: Record<string, unknown>, err?: unknown) {
  if (!shouldEmit(level)) return;
  const ts = new Date().toISOString();
  const context = sanitizeContext(contextRaw);
  const errInfo = err
    ? err instanceof Error
      ? { errorName: err.name, errorMessage: err.message, stack: err.stack?.split("\n").slice(0, 8).join("\n") }
      : { errorMessage: String(err) }
    : undefined;

  if (process.env.NODE_ENV === "production") {
    // JSON line for log aggregators
    const line = JSON.stringify({
      ts,
      level,
      event,
      ...(context ?? {}),
      ...(errInfo ?? {}),
      runtime: process.env.NEXT_RUNTIME ?? "nodejs",
      vercelEnv: process.env.VERCEL_ENV ?? undefined,
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }

  // dev pretty
  const emoji = { debug: "🔍", info: "ℹ️ ", warn: "⚠️ ", error: "🔥" }[level];
  const head = `${emoji} [${ts.slice(11, 19)}] ${event}`;
  if (context && Object.keys(context).length > 0) console.log(head, context);
  else console.log(head);
  if (errInfo) console.log("       ", errInfo);
}

export const log = {
  debug: (event: string, context?: Record<string, unknown>) => emit("debug", event, context),
  info: (event: string, context?: Record<string, unknown>) => emit("info", event, context),
  warn: (event: string, context?: Record<string, unknown>, err?: unknown) => emit("warn", event, context, err),
  error: (event: string, err?: unknown, context?: Record<string, unknown>) => emit("error", event, context, err),
};
