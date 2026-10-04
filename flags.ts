import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { createPostHogAdapter, type PostHogEntities } from "@flags-sdk/posthog";
import type { Identify } from "flags";
import { dedupe, flag } from "flags/next";
import { getSession } from "@/lib/auth/session";
import { POSTHOG_VISITOR_COOKIE, validVisitorId } from "@/lib/posthog-policy";

export const identify = dedupe(async () => {
  const session = await getSession();
  if (session) {
    return { distinctId: createHash("sha256").update(`od-user:${session.userId}`).digest("hex") };
  }
  const visitor = (await cookies()).get(POSTHOG_VISITOR_COOKIE)?.value;
  return { distinctId: validVisitorId(visitor) ? visitor : randomUUID() };
}) satisfies Identify<PostHogEntities>;

const key = process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const adapter = key ? createPostHogAdapter({
  postHogKey: key,
  postHogOptions: {
    host: process.env.POSTHOG_HOST || "https://eu.i.posthog.com",
    disableGeoip: true,
    featureFlagsRequestTimeoutMs: 1500,
    fetchRetryCount: 0,
  },
}) : undefined;

/** PostHog'da aynı anahtarla boolean flag oluşturularak analitik kapatılabilir. */
export const websiteAnalytics = flag<boolean, PostHogEntities>({
  key: "website-analytics",
  description: "PostHog ziyaret ve CTA analitiğini etkinleştirir.",
  defaultValue: true,
  identify,
  ...(adapter ? { adapter } : { decide: () => false }),
});
