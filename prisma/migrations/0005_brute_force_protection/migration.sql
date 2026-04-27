-- Add attempt counter to VerificationCode to prevent brute-force code guessing.
-- Nullable so existing rows get NULL (treated as 0 in code); avoids prisma db push data-loss warning.
ALTER TABLE "VerificationCode" ADD COLUMN "attempts" INTEGER DEFAULT 0;

-- Lightweight DB-backed rate limit token table
CREATE TABLE "RateLimitEntry" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RateLimitEntry_key_createdAt_idx" ON "RateLimitEntry"("key", "createdAt");
