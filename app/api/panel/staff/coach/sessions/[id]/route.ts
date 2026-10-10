import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { COACHING_RESCHEDULE_REASONS } from "@/lib/coaching-experience";
import { istanbulWeekStart } from "@/lib/istanbul-time";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadCoachSessionDetail } from "@/lib/kocum/coach-mobile-server";
import { displayName } from "@/lib/mobile/staff-views";
import { httpsOrNull, requireStaffApi, staffJson, staffNotFound } from "@/lib/panel/staff-api";

/**
 * Görüşme ayrıntısı — koçun AKTİF atamasının görüşmesi; değilse 404.
 * `privateNote` yalnız `ok:note:read_private` ile. Mutasyonlar MEVCUT
 * `POST /api/panel/coaching-sessions/[id]` (SAVE / COMPLETE) ile.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("OK", "ok:coaching:write");
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  const session = await loadCoachSessionDetail(auth.session.userId, id);
  if (!session) return staffNotFound("Görüşme bulunamadı.");
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    id: session.id,
    version: session.version,
    status: session.status,
    studentId: session.assignment.student.id,
    studentName: displayName(session.assignment.student.user),
    scheduledAt: session.scheduledAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    meetingUrl: httpsOrNull(session.meetingUrl),
    focus: session.focus,
    sharedNote: session.sharedNote,
    privateNote: session.privateNote,
    canReadPrivate: session.canReadPrivate,
    rescheduleRequestedAt: session.rescheduleRequestedAt?.toISOString() ?? null,
    rescheduleReasonLabel: session.rescheduleReason ? COACHING_RESCHEDULE_REASONS[session.rescheduleReason] : null,
    proposedAt: session.proposedAt?.toISOString() ?? null,
    decisionWeekStart: istanbulWeekStart(new Date()).toISOString(),
    decisionsEnabled: getPanelFeatureFlags().adaptivePlan,
  });
}
