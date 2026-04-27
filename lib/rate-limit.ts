import { prisma } from "@/lib/prisma";

/**
 * DB-backed rate limiter using the RateLimitEntry table.
 *
 * Each call records one "token consumed" for the given key. If more than
 * `max` tokens exist within the sliding `windowMs` window, returns
 * `{ allowed: false }`. Otherwise records the token and returns `{ allowed: true }`.
 *
 * Note: Old entries accumulate over time. The table should be pruned
 * periodically (e.g. a scheduled job: DELETE FROM "RateLimitEntry" WHERE
 * "createdAt" < NOW() - INTERVAL '24 hours').
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean }> {
  const since = new Date(Date.now() - windowMs);

  // Count existing tokens in the window
  const count = await prisma.rateLimitEntry.count({
    where: { key, createdAt: { gte: since } },
  });

  if (count >= max) {
    return { allowed: false };
  }

  // Record this attempt
  await prisma.rateLimitEntry.create({ data: { key } });
  return { allowed: true };
}
