# Distributed cache policy

Production uses Upstash Redis through `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN`. Both variables are production deploy blockers. The
development fallback is a bounded, process-local map; production never reads or
writes that map.

## Keys and invalidation

Callers build keys with `cacheKey(namespace, ...parts)`. The supported namespaces
are `od`, `odk`, `panel`, `catalog`, `business`, `content`, and `system`.

Each namespace has a Redis generation counter. A physical entry includes the
current generation, for example:

`online-dershanem:production:data:panel:v3:panel:students:summary`

`cacheInvalidateNamespace()` increments the counter in O(1). The compatibility
helper `cacheInvalidatePrefix()` invalidates the prefix's complete top-level
namespace. This is intentionally coarser than a prefix scan: all instances and
regions observe it on their next read, and production never issues `KEYS` or an
unbounded `SCAN`. Entries from older generations expire through their normal TTL.

Use exact-key invalidation when one key is known. After any mutation that can
affect several cached views, invalidate its namespace after the database commit.

| Namespace | Owner/data class |
| --- | --- |
| `od` | Online Dershanem checkout, onboarding, and learning views |
| `odk` | ODK catalog, exams, attempts, scoring, and reports |
| `panel` | Role-based panel views, cohorts, schedules, and notifications |
| `catalog` | Shared product, price, and plan catalogs |
| `business` | CRM, finance, sales, and operational aggregates |
| `content` | Public/site/blog content |
| `system` | Short-lived smoke and internal operational values |

## TTL and stale-window budget

The TTL is also the maximum stale window if an invalidation cannot reach Redis.
Choose the shortest class that fits; values above these limits require a written
reason beside the call site.

| Data class | Maximum TTL | Acceptable stale window |
| --- | ---: | ---: |
| Authentication, authorization, payment state, secrets | Do not cache | 0 |
| Active exam/attempt state and mutable panel records | 30 seconds | 30 seconds |
| Business/learning aggregates | 60 seconds | 60 seconds |
| Product and price catalogs | 5 minutes | 5 minutes |
| Editorial/public content | 15 minutes | 15 minutes |
| Smoke/internal probes | 10 seconds | 10 seconds |

## Outage behavior and observability

Redis failures are fail-open for availability and fail-closed for caching:
`cacheGet` misses, `cacheSet` is skipped, and the application recomputes from its
authoritative database or service. Production does not fall back to memory, so a
serverless instance cannot serve an entry another instance already invalidated.

`/api/health/ready` probes Redis and reports the effective backend, state,
configuration state, last failed operation, and failure timestamp. Production is
not ready when Redis is absent, disabled, or unreachable. `/api/smoke` retains a
read/write/delete cycle for post-deploy verification.

## Vercel setup

1. Provision an Upstash Redis integration for the `online-dershanem` Vercel
   project in a region appropriate for the production workload.
2. Scope `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Production
   (and Preview only if previews have a separate database or prefix).
3. Redeploy: environment-variable changes do not alter an existing deployment.
4. Verify `/api/health/ready` reports `checks.cache.backend: "upstash"` and
   `checks.cache.status: "ok"`, then run the authenticated `/api/smoke` check.

`CACHE_KEY_PREFIX` is optional. Its default includes `VERCEL_ENV`/`NODE_ENV` so
production, preview, and development keys cannot collide. Never place Redis
credentials in a committed `.env` file.
