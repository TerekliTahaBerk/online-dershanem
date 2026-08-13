import "server-only";
import { log } from "@/lib/logger";
import { createCache } from "@/lib/cache-core";

export { CACHE_NAMESPACES, cacheKey, type CacheNamespace } from "@/lib/cache-core";

const cache = createCache({ logger: log });

export const cacheGet = cache.get;
export const cacheSet = cache.set;
export const cacheInvalidate = cache.invalidate;
export const cacheInvalidateNamespace = cache.invalidateNamespace;
export const cacheInvalidatePrefix = cache.invalidatePrefix;
export const cacheWrap = cache.wrap;
export const cacheStatus = cache.status;
export const cacheHealth = cache.health;
