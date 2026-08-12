import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterMs: number;
  resetAt: Date;
};

type RateLimitStore = Pick<PrismaClient, "$queryRaw" | "$transaction">;

type DecisionRow = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  resetAt: Date;
};

/**
 * Exact sliding-window limiter backed by PostgreSQL.
 *
 * The advisory transaction lock serializes one key across every process that
 * shares the database. The decision query runs only after the lock is held, so
 * its READ COMMITTED snapshot includes tokens committed by earlier waiters.
 * Allowed requests insert one token; rejected requests do not extend the
 * window. `resetAt` is when the oldest active token expires.
 */
export async function checkRateLimitWithStore(
  store: RateLimitStore,
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitDecision> {
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new RangeError("Rate-limit max must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new RangeError("Rate-limit windowMs must be a positive safe integer.");
  }

  const normalizedKey = key.normalize("NFKC").trim();
  if (!normalizedKey) throw new RangeError("Rate-limit key cannot be empty.");
  if (normalizedKey.length > 500) {
    throw new RangeError("Rate-limit key cannot exceed 500 characters.");
  }

  const entryId = crypto.randomUUID();
  const [, rows] = await store.$transaction([
    store.$queryRaw<Array<{ locked: string }>>`
      SELECT pg_advisory_xact_lock(hashtextextended(${normalizedKey}, 0))::text AS locked
    `,
    store.$queryRaw<DecisionRow[]>`
      WITH active AS MATERIALIZED (
        SELECT
          COUNT(*)::integer AS used,
          MIN("createdAt") AS oldest
        FROM "RateLimitEntry"
        WHERE "key" = ${normalizedKey}
          AND "createdAt" >= statement_timestamp() - (${windowMs} * INTERVAL '1 millisecond')
      ), inserted AS (
        INSERT INTO "RateLimitEntry" ("id", "key", "createdAt")
        SELECT ${entryId}, ${normalizedKey}, statement_timestamp()
        FROM active
        WHERE active.used < ${max}
        RETURNING 1
      )
      SELECT
        EXISTS(SELECT 1 FROM inserted) AS allowed,
        GREATEST(${max} - active.used - (SELECT COUNT(*)::integer FROM inserted), 0)::integer AS remaining,
        CASE
          WHEN EXISTS(SELECT 1 FROM inserted) THEN 0
          ELSE GREATEST(
            CEIL(EXTRACT(EPOCH FROM (
              active.oldest + (${windowMs} * INTERVAL '1 millisecond') - statement_timestamp()
            )) * 1000),
            1
          )::integer
        END AS "retryAfterMs",
        COALESCE(
          active.oldest + (${windowMs} * INTERVAL '1 millisecond'),
          statement_timestamp() + (${windowMs} * INTERVAL '1 millisecond')
        ) AS "resetAt"
      FROM active
    `,
  ]);

  const decision = rows[0];
  if (!decision) throw new Error("Rate limiter returned no decision.");
  return { ...decision, limit: max };
}

export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitDecision> {
  return checkRateLimitWithStore(prisma, key, max, windowMs);
}
