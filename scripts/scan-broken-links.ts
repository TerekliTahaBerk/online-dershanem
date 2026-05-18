/**
 * Round 12 — Broken link / 404 scanner
 *
 * Sitemap'i fetch eder, her URL için HEAD/GET atar, status code rapor eder.
 * Local prod build (next start) veya staging URL'i ile çalışır.
 *
 * Kullanım:
 *   npm run build && npm start                  (ayrı terminal)
 *   npx tsx scripts/scan-broken-links.ts        (varsayılan http://localhost:3000)
 *   BASE_URL=https://onlinedershanem.com npx tsx scripts/scan-broken-links.ts
 *
 * Çıkış kodu:
 *   0 → tüm linkler 2xx
 *   1 → en az bir 4xx/5xx veya timeout
 */

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 6;

type Result = {
  url: string;
  status: number | "timeout" | "error";
  ms: number;
  message?: string;
};

async function fetchSitemapUrls(): Promise<string[]> {
  const sitemapUrl = `${BASE_URL}/sitemap.xml`;
  process.stdout.write(`📥 Sitemap: ${sitemapUrl}\n`);
  const res = await fetch(sitemapUrl);
  if (!res.ok) {
    throw new Error(`Sitemap ${res.status}: ${sitemapUrl}`);
  }
  const xml = await res.text();
  // Basit regex parse — production sitemap formatı sade
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]!);
  // BASE_URL'a göre normalize
  return urls.map((u) => (u.startsWith("http") ? u : `${BASE_URL}${u}`));
}

async function checkUrl(url: string): Promise<Result> {
  const start = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: { "User-Agent": "od-link-scanner/1.0" },
    });
    return { url, status: res.status, ms: Date.now() - start };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      url,
      status: isAbort ? "timeout" : "error",
      ms: Date.now() - start,
      message: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function processInBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const results = await Promise.all(batch.map(fn));
    out.push(...results);
  }
  return out;
}

function colorStatus(s: Result["status"]): string {
  if (typeof s === "number") {
    if (s >= 500) return `\x1b[41m\x1b[37m ${s} \x1b[0m`;
    if (s >= 400) return `\x1b[31m${s}\x1b[0m`;
    if (s >= 300) return `\x1b[33m${s}\x1b[0m`;
    return `\x1b[32m${s}\x1b[0m`;
  }
  return `\x1b[41m\x1b[37m ${s.toUpperCase()} \x1b[0m`;
}

async function main() {
  process.stdout.write(`🔗 Broken link scanner — ${BASE_URL}\n\n`);

  let urls: string[];
  try {
    urls = await fetchSitemapUrls();
  } catch (err) {
    process.stderr.write(`❌ Sitemap çekilemedi: ${err instanceof Error ? err.message : err}\n`);
    process.stderr.write(`   Hint: "npm run build && npm start" çalıştırdın mı?\n`);
    process.exit(1);
  }

  process.stdout.write(`   ${urls.length} URL bulundu, ${CONCURRENCY} paralel ile taranıyor...\n\n`);

  const t0 = Date.now();
  const results = await processInBatches(urls, CONCURRENCY, checkUrl);
  const totalMs = Date.now() - t0;

  // Print per-url
  for (const r of results) {
    const ms = `${r.ms.toString().padStart(5)}ms`;
    process.stdout.write(`  ${colorStatus(r.status)}  ${ms}  ${r.url}\n`);
    if (r.message && r.status !== 200) {
      process.stdout.write(`         └─ ${r.message}\n`);
    }
  }

  // Summary
  const ok = results.filter((r) => typeof r.status === "number" && r.status >= 200 && r.status < 400).length;
  const redirected = results.filter((r) => typeof r.status === "number" && r.status >= 300 && r.status < 400).length;
  const broken = results.filter((r) => typeof r.status !== "number" || r.status >= 400);
  const avgMs = Math.round(results.reduce((a, r) => a + r.ms, 0) / Math.max(1, results.length));

  process.stdout.write(`\n📊 Özet (${(totalMs / 1000).toFixed(1)}s, ortalama ${avgMs}ms/url):\n`);
  process.stdout.write(`   ✅ OK         : ${ok}\n`);
  process.stdout.write(`   ↪️ Redirected : ${redirected}\n`);
  process.stdout.write(`   ❌ Broken     : ${broken.length}\n`);

  if (broken.length > 0) {
    process.stdout.write(`\n🚨 Broken URLs:\n`);
    for (const r of broken) {
      process.stdout.write(`   ${colorStatus(r.status)}  ${r.url}\n`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`💥 Scanner crashed: ${err instanceof Error ? err.stack : err}\n`);
  process.exit(2);
});
