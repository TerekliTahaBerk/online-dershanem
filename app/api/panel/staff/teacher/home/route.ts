import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getTeacherWorkspace } from "@/lib/panel/teacher-workspace-server";
import { toMobileTeacherHome } from "@/lib/mobile/staff-views";
import { requireStaffApi, staffJson } from "@/lib/panel/staff-api";

/**
 * Öğretmen Bugün — web `app/panel/ogretmen` ile AYNI `getTeacherWorkspace`
 * (öncelik / dikkat hesapları sunucuda). Kapı: OD öğretmen ürün rolü +
 * `od:lesson:teach`. Tüm kaynak sorguları `teacherId` kapsamlıdır.
 */
export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  const flags = getPanelFeatureFlags();
  const workspace = await getTeacherWorkspace(auth.session.userId);
  return staffJson(
    toMobileTeacherHome(workspace, {
      quickLessonClose: flags.quickLessonClose,
      assignmentEvidence: flags.assignmentEvidence,
      studentCheckIn: flags.studentCheckIn,
      reviewQueue: flags.reviewQueue,
      interventionInbox: flags.interventionInbox,
      adaptivePlan: flags.adaptivePlan,
      learningOutcomes: flags.learningOutcomes,
    }),
  );
}
