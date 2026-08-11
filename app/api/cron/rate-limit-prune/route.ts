/**
 * Round 7 — Rate-limit entry prune cron.
 *
 * `RateLimitEntry` tablosu sliding window için kullanılıyor (login brute-force —
 * Round 2). Eski satırların biriktirmesini engellemek için her gün eski kayıtlar
 * temizlenir. 24 saatten eski tüm satırlar artık hiçbir kontrole etki etmiyor.
 *
 * Schedule: 0 4 * * * (her gün 04:00 UTC, vercel.json'a eklenmeli)
 */
import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETAIN_HOURS = 24;

export async function GET(req: Request) {
  return runJob("rate-limit-prune", req, async () => {
    const cutoff = new Date(Date.now() - RETAIN_HOURS * 3600 * 1000);
    const result = await prisma.rateLimitEntry.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return {
      cutoff: cutoff.toISOString(),
      deleted: result.count,
    };
  }, { metrics: (result) => ({ processedCount: result.deleted }) });
}
