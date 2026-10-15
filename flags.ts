import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { Identify } from "flags";
import { dedupe, flag } from "flags/next";
import { getSession } from "@/lib/auth/session";
import { POSTHOG_VISITOR_COOKIE, posthogHost, readFlagEnabled, validVisitorId } from "@/lib/posthog-policy";

type VisitorEntities = { distinctId: string };

export const identify = dedupe(async () => {
  const session = await getSession();
  if (session) {
    return { distinctId: createHash("sha256").update(`od-user:${session.userId}`).digest("hex") };
  }
  const visitor = (await cookies()).get(POSTHOG_VISITOR_COOKIE)?.value;
  return { distinctId: validVisitorId(visitor) ? visitor : randomUUID() };
}) satisfies Identify<VisitorEntities>;

const key = process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const FLAG_KEY = "website-analytics";
const CACHE_MS = 60_000;
let cached: { value: boolean; at: number } | null = null;
let inflight: Promise<boolean> | null = null;

/**
 * Analitik kill-switch'i: PostHog'da `website-analytics` boolean bayrağı
 * kapatılırsa analitik durur. Önceden `@flags-sdk/posthog` adaptörü her sayfa
 * görüntülemesinde ziyaretçi başına `/flags` isteği yapıyor ve
 * `$feature_flag_called` olayını 10 sn zaman aşımlı arka plan gönderimiyle
 * kuyruklıyordu; PostHog yavaşken bu yüzlerce "Error while flushing PostHog"
 * hatası ve uzayan fonksiyon süresi üretiyordu. Bayrak küresel bir anahtar
 * olduğundan sunucu örneği başına 60 sn önbelleklenir, olay gönderilmez;
 * PostHog'a ulaşılamazsa son bilinen değer (yoksa açık) kullanılır.
 */
async function readKillSwitch(): Promise<boolean> {
  if (!key) return false;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  inflight ??= (async () => {
    try {
      const response = await fetch(`${posthogHost(process.env.POSTHOG_HOST)}/flags/?v=2`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ api_key: key, distinct_id: "server:website-analytics", geoip_disable: true, flag_keys_to_evaluate: [FLAG_KEY] }),
        signal: AbortSignal.timeout(1500),
        cache: "no-store",
      });
      const value = response.ok ? readFlagEnabled(await response.json(), FLAG_KEY) : undefined;
      cached = { value: value ?? cached?.value ?? true, at: Date.now() };
    } catch {
      // Analitik arızası sayfayı etkilemez; kısa süre sonra yeniden denenir.
      cached = { value: cached?.value ?? true, at: Date.now() - CACHE_MS + 10_000 };
    } finally {
      inflight = null;
    }
    return cached.value;
  })();
  return inflight;
}

/** PostHog'da aynı anahtarla boolean flag oluşturularak analitik kapatılabilir. */
export const websiteAnalytics = flag<boolean, VisitorEntities>({
  key: FLAG_KEY,
  description: "PostHog ziyaret ve CTA analitiğini etkinleştirir.",
  defaultValue: true,
  identify,
  decide: () => readKillSwitch(),
});
