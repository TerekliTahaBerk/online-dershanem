import { redirect } from "next/navigation";
import { requirePanelRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export const dynamic = "force-dynamic";

/**
 * Eski veli Gelişim (`/takip`) — Analiz'e yönlendirir.
 * Query `studentId` korunur.
 */
export default async function ParentTakipRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  await requirePanelRole("PARENT");
  const flags = getPanelFeatureFlags();
  const { studentId } = await searchParams;
  const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";

  if (flags.progressInsights) {
    redirect(`/panel/veli/analiz${qs}`);
  }
  redirect(`/panel/veli${qs}`);
}
