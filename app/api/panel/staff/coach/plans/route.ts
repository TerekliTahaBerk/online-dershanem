import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { WEEKLY_PLAN_SUGGESTION_KIND_LABELS } from "@/lib/panel/status-vocabulary";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadCoachPlans } from "@/lib/kocum/coach-mobile-server";
import { PLAN_STATUS_LABEL, displayName } from "@/lib/mobile/staff-views";
import { requireStaffApi, staffFeatureDisabled, staffJson } from "@/lib/panel/staff-api";

/** Plan masası — web `app/panel/ogretmen/plan` ile aynı süzgeçler (`adaptivePlan`). */
export async function GET() {
  const auth = await requireStaffApi("OK", "ok:coaching:write");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return staffFeatureDisabled("Haftalık plan henüz açık değil.");
  const { weekStart, plans, suggestions } = await loadCoachPlans(auth.session.userId);
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    weekStart: weekStart.toISOString(),
    plans: plans.map((plan) => ({
      id: plan.id,
      studentId: plan.studentId,
      studentName: displayName(plan.student.user),
      status: plan.status,
      statusLabel: PLAN_STATUS_LABEL[plan.status] ?? plan.status,
      version: plan.version,
      weekStart: plan.weekStart.toISOString(),
      taskCount: plan.tasks.length,
      doneCount: plan.tasks.filter((task) => task.status === "DONE").length,
    })),
    suggestions: suggestions.map((item) => ({ id: item.id, studentId: item.studentId, studentName: displayName(item.student.user), kindLabel: WEEKLY_PLAN_SUGGESTION_KIND_LABELS[item.kind], title: item.title, rationale: item.rationale })),
  });
}
