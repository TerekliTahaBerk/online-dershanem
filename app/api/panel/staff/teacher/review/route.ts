import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadTeacherReview } from "@/lib/panel/teacher-review-server";
import { requireStaffApi, staffFeatureDisabled, staffJson } from "@/lib/panel/staff-api";

export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().reviewQueue) return staffFeatureDisabled("Tekrar kuyruğu şu an kullanıma kapalı, çok yakında açılacak.");
  return staffJson({ contractVersion: 1, students: await loadTeacherReview(auth.session.userId) });
}
