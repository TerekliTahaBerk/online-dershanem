import { identify, websiteAnalytics } from "@/flags";
import { PostHogAnalytics } from "@/components/analytics/posthog";

export async function PostHogTracking() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return null;
  let distinctId: string;
  try {
    if (!(await websiteAnalytics())) return null;
    const visitor = await identify();
    distinctId = visitor.distinctId;
  } catch {
    // Analitik veya oturum servisi arızası sayfanın çalışmasını engellemez.
    return null;
  }
  return <PostHogAnalytics distinctId={distinctId} />;
}
