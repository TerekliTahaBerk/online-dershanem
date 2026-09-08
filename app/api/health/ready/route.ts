import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReadinessReport } from "@/lib/health/readiness";
import { notifyCronIncident } from "@/lib/jobs/heartbeat";
import { cacheHealth } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let schemaOk = false;
  let dbLatencyMs: number | null = null;
  let heartbeats: Awaited<ReturnType<typeof prisma.cronHeartbeat.findMany>> = [];
  try {
    const dbStartedAt = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const [, heartbeatRows] = await Promise.all([
      // Bu sorgu kimlik doğrulamanın kullandığı güncel User kolonlarını seçer.
      // Veritabanı erişilebilir olsa bile migration gerideyse readiness kapanır.
      prisma.user.findFirst({ select: { id: true, inviteTokenHash: true } }),
      prisma.cronHeartbeat.findMany(),
    ]);
    heartbeats = heartbeatRows;
    dbLatencyMs = Date.now() - dbStartedAt;
    dbOk = true;
    schemaOk = true;
  } catch {
    // SELECT 1 başarılı, model sorgusu başarısızsa bağlantı var fakat uygulama
    // şeması uyumsuzdur. Ayrı sinyal, operasyon ekibine doğru aksiyonu söyler.
    if (dbLatencyMs === null) {
      try {
        const dbStartedAt = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbLatencyMs = Date.now() - dbStartedAt;
        dbOk = true;
      } catch {
        dbOk = false;
      }
    }
  }

  const cache = await cacheHealth();
  const report = buildReadinessReport({
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    schema: { ok: schemaOk },
    heartbeats,
    cache,
  });
  if (dbOk) {
    const alerts: Array<Promise<void>> = [];
    for (const job of report.checks.cron.jobs) {
      if (job.status !== "healthy") alerts.push(notifyCronIncident(job.name, job.status, job.errorCode));
    }
    await Promise.all(alerts);
  }
  const { unhealthyCronNames, ...publicReport } = report;
  void unhealthyCronNames;
  return NextResponse.json({ ...publicReport, totalLatencyMs: Date.now() - startedAt }, {
    status: report.ready ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
