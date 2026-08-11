/**
 * GET /api/health
 *
 * Production health check endpoint:
 *  - DB ping (1ms SELECT)
 *  - Boot timestamp + commit SHA (Vercel env)
 *  - 200 if operational (ready/degraded), 503 if DB or critical configuration is down
 *
 * Uptime monitor (BetterStack / UptimeRobot / Vercel Status) tarafından çağrılır.
 * Auth GEREKMEZ — özellikle public.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheStatus } from "@/lib/cache";
import { validateEnvOnce } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOOT_AT = new Date().toISOString();

export async function GET() {
  const t0 = Date.now();
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;
  let lastBusinessJobAt: string | null = null;

  try {
    const tDb = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const lastJob = await prisma.backgroundJob.findFirst({ where: { status: "SUCCEEDED" }, orderBy: { completedAt: "desc" }, select: { completedAt: true } });
    lastBusinessJobAt = lastJob?.completedAt?.toISOString() ?? null;
    dbLatencyMs = Date.now() - tDb;
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  // Env validation status (idempotent — gerçek validation boot'ta yapıldı)
  const configuration = validateEnvOnce();

  // Memory snapshot (heap)
  const mem = process.memoryUsage();
  const memMb = {
    rss: Math.round(mem.rss / 1024 / 1024),
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
  };

  const body = {
    status: !dbOk || configuration.status === "blocked"
      ? "down"
      : configuration.status === "degraded" ? "degraded" : "ok",
    bootAt: BOOT_AT,
    now: new Date().toISOString(),
    uptimeMs: Date.now() - new Date(BOOT_AT).getTime(),
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    vercel: {
      env: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    },
    db: { ok: dbOk, latencyMs: dbLatencyMs, errorCode: dbError ? "DATABASE_UNAVAILABLE" : null },
    business: {
      instagramConfigured: Boolean(process.env.META_INSTAGRAM_ACCESS_TOKEN && process.env.META_GRAPH_API_VERSION),
      openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
      jobProcessorConfigured: Boolean(process.env.JOB_PROCESSOR_SECRET || process.env.CRON_SECRET),
      lastSuccessfulJobAt: lastBusinessJobAt,
      paymentConfigured: Boolean(process.env.PAYTR_MERCHANT_ID && process.env.PAYTR_MERCHANT_KEY && process.env.PAYTR_MERCHANT_SALT),
    },
    cache: cacheStatus(),
    configuration: {
      status: configuration.status,
      environment: configuration.environment,
      fingerprint: configuration.fingerprint,
      blockerCount: configuration.blockers.length,
      warningCount: configuration.warnings.length,
      blockers: configuration.blockers.map(({ key, code }) => ({ key, code })),
      warnings: configuration.warnings.map(({ key, code }) => ({ key, code })),
    },
    memory: memMb,
    totalLatencyMs: Date.now() - t0,
  };

  return NextResponse.json(body, {
    status: dbOk && configuration.status !== "blocked" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json",
    },
  });
}
