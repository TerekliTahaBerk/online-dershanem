import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadStudentCoachingHub, loadUpcomingCoachingSessions } from "@/lib/kocum/student-coaching-server";
import { toMobileYonCoaching } from "@/lib/mobile/yon-views";

/**
 * Koçum — web `app/panel/ogrenci/kocluk` ve `CoachingSessions` ile AYNI
 * yükleyiciler. `privateNote` ve INTERNAL notlar sorgulanmaz.
 */
export async function GET() {
  const auth = await requireApiProductRole("OK", "STUDENT");
  if (!auth.ok) return auth.response;
  const adaptivePlanEnabled = getPanelFeatureFlags().adaptivePlan;
  const hub = await loadStudentCoachingHub({ userId: auth.session.userId, adaptivePlanEnabled });
  const upcoming = hub?.coaching
    ? await loadUpcomingCoachingSessions({ userId: auth.session.userId, role: "STUDENT" }, hub.profile.id)
    : null;
  return NextResponse.json(toMobileYonCoaching(hub, upcoming, { adaptivePlanEnabled }), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
