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

function emit(level: Level, event: string, context?: Record<string, unknown>, err?: unknown) {
  if (!shouldEmit(level)) return;
  const ts = new Date().toISOString();
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
