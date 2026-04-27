-- Add attempt counter to VerificationCode to prevent brute-force code guessing
ALTER TABLE "VerificationCode" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Lightweight DB-backed rate limit token table
CREATE TABLE "RateLimitEntry" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RateLimitEntry_key_createdAt_idx" ON "RateLimitEntry"("key", "createdAt");
