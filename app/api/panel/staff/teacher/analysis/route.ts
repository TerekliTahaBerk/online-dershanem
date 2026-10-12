import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadTeacherGidisatOverview, formatPeriodRangeLabel } from "@/lib/progress-insights/server";
import { requireStaffApi, staffFeatureDisabled, staffJson } from "@/lib/panel/staff-api";

export async function GET() {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().progressInsights) return staffFeatureDisabled("Akademik gelişim henüz açık değil.");
  const data = await loadTeacherGidisatOverview({ teacherUserId: auth.session.userId, includeExams: true });
  return staffJson({ contractVersion: 1, periodLabel: formatPeriodRangeLabel(data.period), studentCount: data.studentCount, narrative: data.narrative, averages: data.averages, rows: data.rows.map((row) => ({ studentId: row.studentId, studentName: row.studentName, classLevel: row.classLevel, attendancePercent: row.attendancePercent, assignmentPercent: row.assignmentPercent, planPercent: row.planPercent, netDelta: row.netDelta, declining: row.declining, riskHint: row.riskHint })) });
}
