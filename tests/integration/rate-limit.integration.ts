import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

import { checkRateLimitWithStore } from "../../lib/rate-limit";
import { RATE_LIMIT_POLICIES } from "../../lib/security/rate-limit-policies";

const enabled = process.env.RATE_LIMIT_INTEGRATION_TEST === "true";
const integration = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !enabled }, fn);
const clients: PrismaClient[] = [];

function client(): PrismaClient {
  const configuredUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  let datasourceUrl = configuredUrl;
  if (configuredUrl?.startsWith("postgres")) {
    const parsed = new URL(configuredUrl);
    parsed.searchParams.set("connection_limit", "1");
    datasourceUrl = parsed.toString();
  }
  const instance = new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });
  clients.push(instance);
  return instance;
}

const admin = enabled ? client() : null;
const instances = enabled ? [client(), client()] : [];

for (const [path, policy] of Object.entries(RATE_LIMIT_POLICIES)) {
  integration(`${path}: paralel sunucular kalan kotadan fazla token alamaz`, async () => {
    const key = `integration:y-67:${path}:${crypto.randomUUID()}`;
    const seeded = policy.limit.max - 3;
    try {
      await admin!.rateLimitEntry.createMany({
        data: Array.from({ length: seeded }, () => ({ key })),
      });
      const decisions = await Promise.all(
        Array.from({ length: 16 }, (_, index) =>
          checkRateLimitWithStore(
            instances[index % instances.length],
            key,
            policy.limit.max,
            policy.limit.windowMs,
          ),
        ),
      );

      assert.equal(decisions.filter((decision) => decision.allowed).length, 3);
      assert.equal(decisions.filter((decision) => !decision.allowed).length, 13);
      assert.equal(
        await admin!.rateLimitEntry.count({ where: { key } }),
        policy.limit.max,
      );
      for (const rejected of decisions.filter((decision) => !decision.allowed)) {
        assert.ok(rejected.retryAfterMs > 0);
        assert.ok(rejected.retryAfterMs <= policy.limit.windowMs);
      }
    } finally {
      await admin!.rateLimitEntry.deleteMany({ where: { key } });
    }
  });
}

integration("exact sliding window süresi dolan tokenı dışlar ve reddi pencereyi uzatmaz", async () => {
  const key = `integration:y-67:window:${crypto.randomUUID()}`;
  const windowMs = 60_000;
  try {
    await admin!.rateLimitEntry.create({
      data: { key, createdAt: new Date(Date.now() - 2 * windowMs) },
    });
    const allowed = await checkRateLimitWithStore(admin!, key, 1, windowMs);
    assert.equal(allowed.allowed, true);

    const firstRejection = await checkRateLimitWithStore(admin!, key, 1, windowMs);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const secondRejection = await checkRateLimitWithStore(admin!, key, 1, windowMs);
    assert.equal(firstRejection.allowed, false);
    assert.equal(secondRejection.allowed, false);
    assert.ok(secondRejection.retryAfterMs < firstRejection.retryAfterMs);
    assert.equal(await admin!.rateLimitEntry.count({ where: { key } }), 2);
  } finally {
    await admin!.rateLimitEntry.deleteMany({ where: { key } });
  }
});

test.after(async () => {
  await Promise.all(clients.map((instance) => instance.$disconnect()));
});
