/**
 * Smoke test endpoint — production'a deploy sonrası 1 çağrıyla
 * en kritik sistemlerin canlı olduğunu doğrular.
 *
 * GET /api/smoke?secret=<CRON_SECRET>
 *
 * Auth: CRON_SECRET bearer veya ?secret query param.
 * 200 = her şey yeşil. 500 = en az 1 check failed.
 *
 * Test edilen sistemler:
 *  - DB read (public order table)
 *  - DB write (RateLimitEntry — geçici kayıt, hemen siler)
 *  - Cache (read/write/delete)
 *  - Audit log (yazma)
 *  - Env validation
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, cacheInvalidate, cacheStatus } from "@/lib/cache";
import { logAudit } from "@/lib/audit";
import { validateEnvOnce } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckResult = { name: string; ok: boolean; ms: number; error?: string };

async function timed(name: string, fn: () => Promise<void>): Promise<CheckResult> {
  const t = Date.now();
  try {
    await fn();
    return { name, ok: true, ms: Date.now() - t };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // dev'de auth bypass
  const headerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const queryToken = req.nextUrl.searchParams.get("secret");
  return headerToken === secret || queryToken === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const checks: CheckResult[] = [];

  // 1. DB read
  checks.push(await timed("db_read", async () => {
    await prisma.odOrder.findFirst({ select: { id: true } });
  }));

  // 2. DB write (smoke marker — anında temizle)
  const smokeKey = `smoke:test:${Date.now()}`;
  checks.push(await timed("db_write", async () => {
    await prisma.rateLimitEntry.create({ data: { key: smokeKey } });
    await prisma.rateLimitEntry.deleteMany({ where: { key: smokeKey } });
  }));

  // 3. Cache cycle
  checks.push(await timed("cache_cycle", async () => {
    const k = `smoke:cache:${Date.now()}`;
    await cacheSet(k, { ok: true }, 10);
    const v = await cacheGet<{ ok: boolean }>(k);
    if (!v?.ok) throw new Error("cache miss after set");
    await cacheInvalidate(k);
  }));

  // 4. Audit log
  checks.push(await timed("audit_write", async () => {
    await logAudit({
      actorUserId: null,
      actorType: "SYSTEM",
      entityType: "System",
      entityId: "smoke",
      action: "SMOKE_TEST",
      summary: "Smoke test çağrısı",
    });
  }));

  // 5. Env validation
  const envStatus = validateEnvOnce();
  checks.push({
    name: "env_validation",
    ok: envStatus.ok,
    ms: 0,
    error: envStatus.missing.length ? `missing: ${envStatus.missing.join(", ")}` : undefined,
  });

  const allOk = checks.every((c) => c.ok);

  return NextResponse.json(
    {
      ok: allOk,
      at: new Date().toISOString(),
      checks,
      cache: cacheStatus(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { status: allOk ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
