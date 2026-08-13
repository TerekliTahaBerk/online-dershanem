import assert from "node:assert/strict";
import test from "node:test";

import { CACHE_NAMESPACES, cacheKey, createCache } from "./cache-core";

class FakeUpstash {
  readonly values = new Map<string, string>();
  available = true;

  fetch: typeof fetch = async (input, init) => {
    if (!this.available) throw new Error("redis unavailable");
    const parts = new URL(String(input)).pathname.slice(1).split("/");
    const command = parts[0];
    const key = parts[1] ? decodeURIComponent(parts[1]) : "";
    let result: string | number | null = null;

    if (command === "ping") result = "PONG";
    if (command === "get") result = this.values.get(key) ?? null;
    if (command === "setex") {
      this.values.set(key, String(init?.body));
      result = "OK";
    }
    if (command === "del") {
      result = this.values.delete(key) ? 1 : 0;
    }
    if (command === "incr") {
      const next = Number(this.values.get(key) ?? "0") + 1;
      this.values.set(key, String(next));
      result = next;
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

const productionEnv = {
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  UPSTASH_REDIS_REST_URL: "https://redis.test.invalid",
  UPSTASH_REDIS_REST_TOKEN: "secret-token",
};

test("writes and namespace invalidations are visible across cache instances", async () => {
  const redis = new FakeUpstash();
  const workerA = createCache({ env: productionEnv, fetch: redis.fetch });
  const workerB = createCache({ env: productionEnv, fetch: redis.fetch });
  const key = cacheKey(CACHE_NAMESPACES.PANEL, "students", "summary");

  await workerA.set(key, { count: 4 }, 60);
  assert.deepEqual(await workerB.get(key), { count: 4 });

  assert.equal(await workerA.invalidatePrefix("panel:students:"), true);
  assert.equal(await workerB.get(key), null);

  await workerB.set(key, { count: 5 }, 60);
  assert.deepEqual(await workerA.get(key), { count: 5 });
});

test("an Upstash outage bypasses cache without falling back to process memory", async () => {
  const redis = new FakeUpstash();
  const worker = createCache({ env: productionEnv, fetch: redis.fetch });
  const key = cacheKey(CACHE_NAMESPACES.ODK, "exam", 42);
  await worker.set(key, { title: "cached" }, 60);

  redis.available = false;
  assert.equal(await worker.get(key), null);
  assert.equal(worker.status().backend, "upstash");
  assert.equal(worker.status().state, "degraded");
  assert.equal(worker.status().memSize, 0);

  redis.available = true;
  assert.equal((await worker.health()).state, "ready");
});

test("production without Redis stays uncached and reports unavailable", async () => {
  const worker = createCache({ env: { NODE_ENV: "production", VERCEL_ENV: "production" } });
  const key = cacheKey(CACHE_NAMESPACES.CATALOG, "plans");

  await worker.set(key, ["plan"], 300);
  assert.equal(await worker.get(key), null);
  assert.deepEqual(worker.status(), {
    backend: "unavailable",
    state: "degraded",
    configured: false,
    memSize: 0,
    lastErrorAt: null,
    lastErrorOperation: "configuration",
  });
});

test("development keeps the bounded memory backend for local use", async () => {
  const workerA = createCache({ env: { NODE_ENV: "development" } });
  const workerB = createCache({ env: { NODE_ENV: "development" } });
  const key = cacheKey(CACHE_NAMESPACES.CONTENT, "home");
  await workerA.set(key, "local", 10);

  assert.equal(await workerA.get(key), "local");
  assert.equal(await workerB.get(key), null);
  assert.equal(workerA.status().backend, "memory");
});

test("unknown namespaces are rejected before any remote request", async () => {
  const redis = new FakeUpstash();
  const worker = createCache({ env: productionEnv, fetch: redis.fetch });
  await assert.rejects(worker.get("unknown:key"), /Unknown cache namespace/);
});
