import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { loadCoachWorkspace } from "@/lib/kocum/coach-workspace-server";
import { COACH_ATTENTION_LABEL } from "@/lib/kocum/coach-workspace";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { requireStaffApi, staffJson } from "@/lib/panel/staff-api";

/** Koçun öğrencileri — web `app/panel/ogretmen/yon/ogrenciler` ile aynı yükleyici; yalnız aktif atamalar. */
export async function GET() {
  const auth = await requireStaffApi("OK", "ok:coaching:write");
  if (!auth.ok) return auth.response;
  const { signals, workspace, lastExam } = await loadCoachWorkspace(auth.session.userId, getPanelFeatureFlags());
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    students: [...signals].sort((a, b) => a.name.localeCompare(b.name, "tr")).map((student) => {
      const reason = workspace.primaryReason.get(student.studentId) ?? null;
      const exam = lastExam.get(student.studentId) ?? null;
      return {
        studentId: student.studentId,
        name: student.name,
        targetGoal: student.targetGoal,
        primaryReason: reason,
        primaryLabel: reason ? COACH_ATTENTION_LABEL[reason] : null,
        nextScheduledAt: student.nextScheduledAt?.toISOString() ?? null,
        planStatus: student.planStatus,
        planCompletionPct: student.planCompletionPct,
        lastExam: exam ? { net: exam.net, delta: exam.delta, takenAt: exam.takenAt.toISOString() } : null,
      };
    }),
  });
}
