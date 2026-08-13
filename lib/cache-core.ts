export const CACHE_NAMESPACES = {
  OD: "od",
  ODK: "odk",
  PANEL: "panel",
  CATALOG: "catalog",
  BUSINESS: "business",
  CONTENT: "content",
  SYSTEM: "system",
} as const;

export type CacheNamespace = (typeof CACHE_NAMESPACES)[keyof typeof CACHE_NAMESPACES];
export type CacheBackend = "upstash" | "memory" | "disabled" | "unavailable";
export type CacheState = "ready" | "degraded" | "disabled";

type Entry = { value: unknown; expiresAt: number };
type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

export type CacheStatus = {
  backend: CacheBackend;
  state: CacheState;
  configured: boolean;
  memSize: number;
  lastErrorAt: string | null;
  lastErrorOperation: string | null;
};

export type CacheLogger = {
  warn(event: string, context?: Record<string, unknown>, error?: unknown): void;
};

const MAX_MEM_ENTRIES = 500;
const namespaceValues = new Set<string>(Object.values(CACHE_NAMESPACES));

export function cacheKey(namespace: CacheNamespace, ...parts: Array<string | number>): string {
  if (!parts.length) throw new Error("Cache key requires at least one key part");
  return [namespace, ...parts.map((part) => encodeURIComponent(String(part)))].join(":");
}

function namespaceFromKey(key: string): CacheNamespace {
  const namespace = key.split(":", 1)[0];
  if (!namespaceValues.has(namespace)) {
    throw new Error(`Unknown cache namespace: ${namespace || "(empty)"}`);
  }
  return namespace as CacheNamespace;
}

export function createCache(input: {
  env?: Env;
  fetch?: Fetch;
  now?: () => number;
  logger?: CacheLogger;
} = {}) {
  const env = input.env ?? process.env;
  const fetcher = input.fetch ?? fetch;
  const now = input.now ?? Date.now;
  const logger = input.logger;
  const mem = new Map<string, Entry>();
  let lastErrorAt: string | null = null;
  let lastErrorOperation: string | null = null;

  function isDisabled() {
    return env.CACHE_DISABLED === "1";
  }

  function isProduction() {
    return env.VERCEL_ENV === "production" || (!env.VERCEL_ENV && env.NODE_ENV === "production");
  }

  function upstashConfig(): { url: string; token: string } | null {
    const url = env.UPSTASH_REDIS_REST_URL?.trim();
    const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) return null;
    return { url: url.replace(/\/$/, ""), token };
  }

  function keyPrefix() {
    const environment = env.VERCEL_ENV || env.NODE_ENV || "development";
    return env.CACHE_KEY_PREFIX?.trim() || `online-dershanem:${environment}`;
  }

  function versionKey(namespace: CacheNamespace) {
    return `${keyPrefix()}:namespace:${namespace}:version`;
  }

  function dataKey(namespace: CacheNamespace, version: number, key: string) {
    return `${keyPrefix()}:data:${namespace}:v${version}:${key}`;
  }

  function recordFailure(operation: string, error?: unknown) {
    lastErrorAt = new Date(now()).toISOString();
    lastErrorOperation = operation;
    logger?.warn(`cache.upstash.${operation}_failed`, {}, error);
  }

  function recordSuccess() {
    lastErrorAt = null;
    lastErrorOperation = null;
  }

  async function command<T>(operation: string, path: string, init?: RequestInit): Promise<T | null> {
    const config = upstashConfig();
    if (!config) return null;
    try {
      const response = await fetcher(`${config.url}/${path}`, {
        method: init?.method ?? "POST",
        ...init,
        headers: { Authorization: `Bearer ${config.token}`, ...init?.headers },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Upstash returned HTTP ${response.status}`);
      const body = await response.json() as { result?: T; error?: string };
      if (body.error) throw new Error(body.error);
      recordSuccess();
      return body.result ?? null;
    } catch (error) {
      recordFailure(operation, error);
      return null;
    }
  }

  async function namespaceVersion(namespace: CacheNamespace): Promise<number | null> {
    const raw = await command<string | number>("version_get", `get/${encodeURIComponent(versionKey(namespace))}`);
    if (raw === null) return lastErrorAt ? null : 0;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  function memGet(key: string): unknown | null {
    const entry = mem.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      mem.delete(key);
      return null;
    }
    return entry.value;
  }

  function memSet(key: string, value: unknown, ttlSec: number) {
    if (mem.size >= MAX_MEM_ENTRIES) {
      const firstKey = mem.keys().next().value;
      if (firstKey) mem.delete(firstKey);
    }
    mem.set(key, { value, expiresAt: now() + ttlSec * 1000 });
  }

  async function get<T>(key: string): Promise<T | null> {
    if (isDisabled()) return null;
    const namespace = namespaceFromKey(key);
    const config = upstashConfig();
    if (!config) return isProduction() ? null : memGet(key) as T | null;
    const version = await namespaceVersion(namespace);
    if (version === null) return null;
    const raw = await command<string>("get", `get/${encodeURIComponent(dataKey(namespace, version, key))}`);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      recordFailure("deserialize", error);
      return null;
    }
  }

  async function set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    if (isDisabled()) return;
    if (!Number.isSafeInteger(ttlSec) || ttlSec <= 0) throw new Error("Cache TTL must be a positive integer");
    const namespace = namespaceFromKey(key);
    const config = upstashConfig();
    if (!config) {
      if (!isProduction()) memSet(key, value, ttlSec);
      return;
    }
    const version = await namespaceVersion(namespace);
    if (version === null) return;
    await command("set", `setex/${encodeURIComponent(dataKey(namespace, version, key))}/${ttlSec}`, {
      body: JSON.stringify(value),
      headers: { "Content-Type": "text/plain" },
    });
  }

  async function invalidate(key: string): Promise<void> {
    mem.delete(key);
    const namespace = namespaceFromKey(key);
    if (!upstashConfig()) return;
    const version = await namespaceVersion(namespace);
    if (version === null) return;
    await command("delete", `del/${encodeURIComponent(dataKey(namespace, version, key))}`);
  }

  async function invalidateNamespace(namespace: CacheNamespace): Promise<boolean> {
    for (const key of mem.keys()) {
      if (key.startsWith(`${namespace}:`)) mem.delete(key);
    }
    if (!upstashConfig()) return !isProduction();
    const version = await command<number>("namespace_invalidate", `incr/${encodeURIComponent(versionKey(namespace))}`);
    return version !== null;
  }

  async function invalidatePrefix(prefix: string): Promise<boolean> {
    // Deliberately invalidate the bounded top-level namespace. This is coarser than
    // a wildcard scan, but deterministic across regions and O(1) in Redis.
    return invalidateNamespace(namespaceFromKey(prefix));
  }

  async function wrap<T>(key: string, ttlSec: number, compute: () => Promise<T>): Promise<T> {
    const hit = await get<T>(key);
    if (hit !== null) return hit;
    const fresh = await compute();
    if (fresh !== null && fresh !== undefined) await set(key, fresh, ttlSec);
    return fresh;
  }

  function status(): CacheStatus {
    if (isDisabled()) return { backend: "disabled", state: "disabled", configured: false, memSize: mem.size, lastErrorAt, lastErrorOperation };
    const configured = Boolean(upstashConfig());
    if (configured) return { backend: "upstash", state: lastErrorAt ? "degraded" : "ready", configured, memSize: mem.size, lastErrorAt, lastErrorOperation };
    if (isProduction()) return { backend: "unavailable", state: "degraded", configured: false, memSize: mem.size, lastErrorAt, lastErrorOperation: "configuration" };
    return { backend: "memory", state: "ready", configured: false, memSize: mem.size, lastErrorAt, lastErrorOperation };
  }

  async function health(): Promise<CacheStatus> {
    if (isDisabled() || !upstashConfig()) return status();
    await command("ping", "ping");
    return status();
  }

  return { get, set, invalidate, invalidateNamespace, invalidatePrefix, wrap, status, health };
}
