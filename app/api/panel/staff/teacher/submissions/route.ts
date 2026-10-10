import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadTeacherSubmissionQueue } from "@/lib/panel/teacher-assignments-server";
import { displayName } from "@/lib/mobile/staff-views";
import { requireStaffApi, staffFeatureDisabled, staffJson } from "@/lib/panel/staff-api";

/** Değerlendirme kuyruğu — `assignmentEvidence`; mevcut değerlendirme ucunun kapsamıyla birebir. */
export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().assignmentEvidence) return staffFeatureDisabled("Kanıtlı teslim henüz açık değil.");
  const rows = await loadTeacherSubmissionQueue(auth.session.userId);
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    items: rows.map((row) => ({ id: row.id, assignmentTitle: row.assignment.title, groupName: row.assignment.group.name, studentName: displayName(row.student.user), attemptNumber: row.attemptNumber, submittedAt: row.submittedAt.toISOString() })),
  });
}
