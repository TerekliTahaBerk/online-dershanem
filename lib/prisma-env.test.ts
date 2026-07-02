import assert from "node:assert/strict";
import test from "node:test";
import { normalizePrismaEnv } from "./prisma-env";

test("keeps an explicit direct database URL", () => {
  const env = {
    DATABASE_URL: "postgresql://pooler/app",
    DIRECT_URL: "postgresql://direct/app",
  };

  assert.deepEqual(normalizePrismaEnv(env), {
    databaseUrl: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
  });
});

test("falls back to DATABASE_URL when DIRECT_URL is unavailable", () => {
  const env: Record<string, string | undefined> = {
    DATABASE_URL: "postgresql://database/app",
  };

  assert.deepEqual(normalizePrismaEnv(env), {
    databaseUrl: env.DATABASE_URL,
    directUrl: env.DATABASE_URL,
  });
  assert.equal(env.DIRECT_URL, env.DATABASE_URL);
});

test("prefers provider direct URLs over the runtime URL", () => {
  const env = {
    DATABASE_URL: "postgresql://pooler/app",
    STORAGE_PRISMA_DATABASE_URL: "postgresql://direct/app",
  };

  assert.equal(normalizePrismaEnv(env).directUrl, env.STORAGE_PRISMA_DATABASE_URL);
});
