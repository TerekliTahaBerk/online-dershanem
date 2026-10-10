import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadCoachWorkspace } from "@/lib/kocum/coach-workspace-server";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { requireStaffApi, staffJson } from "@/lib/panel/staff-api";

/**
 * Koç Bugün — web `app/panel/ogretmen/yon` ile AYNI `loadCoachWorkspace`
 * (dikkat nedenleri ve sıra sunucuda). Kapı: Yön ürün rolü + `ok:coaching:write`;
 * kapsam koçun AKTİF atamaları. Görüşme notları ve bağlantıları gönderilmez.
 */
export async function GET() {
  const auth = await requireStaffApi("OK", "ok:coaching:write");
  if (!auth.ok) return auth.response;
  const flags = getPanelFeatureFlags();
  const { now, assignmentCount, signals, todaySessions, workspace } = await loadCoachWorkspace(auth.session.userId, flags);
  const next = signals.filter((item) => item.nextScheduledAt && item.nextScheduledAt >= now).sort((a, b) => a.nextScheduledAt!.getTime() - b.nextScheduledAt!.getTime())[0] ?? null;
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    generatedAt: now.toISOString(),
    flags: { adaptivePlan: flags.adaptivePlan, studentCheckIn: flags.studentCheckIn },
    studentCount: assignmentCount,
    attentionCount: workspace.attentionCount,
    todaySessions: todaySessions.map((item) => ({ id: item.id, at: item.at.toISOString(), studentId: item.studentId, studentName: item.name, focus: item.focus })),
    nextSession: next ? { studentId: next.studentId, studentName: next.name, at: next.nextScheduledAt!.toISOString() } : null,
    groups: workspace.groups.map((group) => ({ reason: group.reason, label: group.label, students: group.students.map((student) => ({ studentId: student.studentId, name: student.name })) })),
  });
}
