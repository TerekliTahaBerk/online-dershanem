import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { summarizeGroupAssignment } from "@/lib/panel/assignment-display";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadTeacherAssignmentRows } from "@/lib/panel/teacher-assignments-server";
import { requireStaffApi, staffJson } from "@/lib/panel/staff-api";

/**
 * Öğretmenin grup ödevleri — web `app/panel/ogretmen/odevler` ile aynı sorgu
 * ve özet (`summarizeGroupAssignment`). Salt okunur: ödev oluşturma /
 * düzenleme web devam yolu. Teslim metni ve geri bildirim bu listede yok.
 */
export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  const evidenceEnabled = getPanelFeatureFlags().assignmentEvidence;
  const rows = await loadTeacherAssignmentRows(auth.session.userId);
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    evidenceEnabled,
    assignments: rows.map((item) => {
      const latest = new Map(item.submissions.map((submission) => [submission.studentId, submission.status] as const));
      const summary = summarizeGroupAssignment({ rows: item.progress.map((row) => ({ progress: row.status, dueAt: item.dueAt, submissionStatus: latest.get(row.studentId) ?? null })) });
      return {
        id: item.id,
        title: item.title,
        groupName: item.group.name,
        dueAt: item.dueAt.toISOString(),
        isActive: item.isActive,
        total: summary.total,
        submitted: summary.submitted,
        waiting: summary.waiting,
        late: summary.late,
        evidenceRequired: item.evidenceRequired,
        pendingReview: evidenceEnabled ? item.submissions.filter((submission) => submission.status === "SUBMITTED").length : 0,
      };
    }),
  });
}
