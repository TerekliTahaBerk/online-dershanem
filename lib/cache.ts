/**
 * Round 3 — Cache wrapper.
 *
 * İki katmanlı:
 *  1. Upstash Redis (REST API) — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set ise.
 *  2. In-memory `Map` fallback — env yoksa veya Upstash fetch hatası verirse.
 *
 * `CACHE_DISABLED=1` → bypass (her zaman compute).
 *
 * Cross-region / multi-instance ortamlarda in-memory tutarsız olabilir;
 * gerçek prod için Upstash önerilir. Fallback yine de tek-instance dev
 * ve düşük trafik için OK.
 *
 * Anahtar düzeni: `<namespace>:<scope>:<args>` — örn. `analytics:odk:30`.
 * Invalidation: `cacheInvalidate(key)` veya `cacheInvalidatePrefix(prefix)`
 * (prefix sadece in-memory fallback'ta destekleniyor; Upstash'te tek-tek silinmeli).
 */
import "server-only";
import { log } from "@/lib/logger";

type Entry = { value: unknown; expiresAt: number };

const mem = new Map<string, Entry>();
const MAX_MEM_ENTRIES = 500;

function isDisabled(): boolean {
  return process.env.CACHE_DISABLED === "1";
}

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function upstashGet(key: string): Promise<unknown | null> {
  const cfg = upstashConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result: string | null };
    if (!json.result) return null;
    return JSON.parse(json.result);
  } catch (err) {
    log.warn("cache.upstash.get_failed", { key }, err);
    return null;
  }
}

async function upstashSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  const cfg = upstashConfig();
  if (!cfg) return;
  try {
    const body = JSON.stringify(value);
    await fetch(`${cfg.url}/setex/${encodeURIComponent(key)}/${ttlSec}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "text/plain" },
      body,
      cache: "no-store",
    });
  } catch (err) {
    log.warn("cache.upstash.set_failed", { key }, err);
  }
}

async function upstashDel(key: string): Promise<void> {
  const cfg = upstashConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.url}/del/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
  } catch {
    /* swallow */
  }
}

function memGet(key: string): unknown | null {
  const e = mem.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    mem.delete(key);
    return null;
  }
  return e.value;
}

function memSet(key: string, value: unknown, ttlSec: number): void {
  if (mem.size >= MAX_MEM_ENTRIES) {
    // basit FIFO eviction
    const firstKey = mem.keys().next().value;
    if (firstKey) mem.delete(firstKey);
  }
  mem.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isDisabled()) return null;
  const fromMem = memGet(key);
  if (fromMem !== null) return fromMem as T;
  const fromUpstash = await upstashGet(key);
  if (fromUpstash !== null) {
    // populate L1
    memSet(key, fromUpstash, 30);
    return fromUpstash as T;
  }
  return null;
}

export async function cacheSet<T>(key: string, value: T, ttlSec: number): Promise<void> {
  if (isDisabled()) return;
  memSet(key, value, Math.min(ttlSec, 60)); // L1 max 60s
  await upstashSet(key, value, ttlSec);
}

export async function cacheInvalidate(key: string): Promise<void> {
  mem.delete(key);
  await upstashDel(key);
}

/** Sadece in-memory fallback'ta etkili; Upstash'te SCAN gerekir, yapmıyoruz. */
export function cacheInvalidatePrefix(prefix: string): number {
  let n = 0;
  for (const k of mem.keys()) {
    if (k.startsWith(prefix)) {
      mem.delete(k);
      n++;
    }
  }
  return n;
}

/**
 * Helper: cache-aside pattern. Compute fonksiyonu sadece miss'te çağrılır.
 * Hata atarsa cache'lenmez (compute'tan throw propagate olur).
 */
export async function cacheWrap<T>(key: string, ttlSec: number, compute: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const fresh = await compute();
  // null/undefined cache'lemiyoruz — "empty result" durumunda her seferinde recompute (rare path)
  if (fresh !== null && fresh !== undefined) {
    await cacheSet(key, fresh, ttlSec);
  }
  return fresh;
}

export function cacheStatus(): { backend: "upstash" | "memory" | "disabled"; memSize: number } {
  if (isDisabled()) return { backend: "disabled", memSize: mem.size };
  if (upstashConfig()) return { backend: "upstash", memSize: mem.size };
  return { backend: "memory", memSize: mem.size };
}
