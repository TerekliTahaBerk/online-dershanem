import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { addIstanbulCalendarDays } from "@/lib/istanbul-time";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadCoachPlanDetail } from "@/lib/kocum/coach-mobile-server";
import { PLAN_STATUS_LABEL, TASK_STATUS_LABEL, displayName } from "@/lib/mobile/staff-views";
import { requireStaffApi, staffFeatureDisabled, staffJson, staffNotFound } from "@/lib/panel/staff-api";

/**
 * Plan ayrıntısı — aktif koç ataması + onay akışındaki ürün. Görev erteleme
 * (`/api/panel/kocum/tasks/[id]/reschedule`) ve onay
 * (`/api/panel/adaptive-plan/[id]/approve`) MEVCUT uçlarla; `canApprove`
 * yalnız ipucudur.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("OK", "ok:coaching:write");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return staffFeatureDisabled("Haftalık plan henüz açık değil.");
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  const plan = await loadCoachPlanDetail(auth.session.userId, id);
  if (!plan) return staffNotFound("Plan bulunamadı.");
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    id: plan.id,
    studentId: plan.studentId,
    studentName: displayName(plan.student.user),
    status: plan.status,
    statusLabel: PLAN_STATUS_LABEL[plan.status] ?? plan.status,
    version: plan.version,
    weekStart: plan.weekStart.toISOString(),
    weekEnd: addIstanbulCalendarDays(plan.weekStart, 6).toISOString(),
    canApprove: plan.status === "DRAFT" && plan.tasks.some((task) => task.status === "PLANNED"),
    tasks: plan.tasks.map((task) => ({ id: task.id, title: task.title, subject: task.subject, scheduledFor: task.scheduledFor.toISOString(), durationMinutes: task.durationMinutes, status: task.status, statusLabel: TASK_STATUS_LABEL[task.status] ?? task.status })),
  });
}
