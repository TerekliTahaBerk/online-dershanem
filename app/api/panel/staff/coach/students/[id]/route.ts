import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadCoachStudentDetail } from "@/lib/kocum/coach-mobile-server";
import { requireStaffApi, staffJson, staffNotFound } from "@/lib/panel/staff-api";

/**
 * Koç · öğrenci bağlamı — `id = StudentProfile.id`. Aktif koç ataması yoksa
 * (başka koçun öğrencisi, atama bitti, OD grup öğrencisi) 404. INTERNAL notlar
 * yalnız `ok:note:read_private` ile; görüşme özel notu hiç dönmez.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("OK", "ok:coaching:write");
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  const detail = await loadCoachStudentDetail(auth.session.userId, id);
  if (!detail) return staffNotFound("Öğrenci bulunamadı.");
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    studentId: detail.studentId,
    name: detail.name,
    classLevel: detail.classLevel,
    targetGoal: detail.targetGoal,
    nextSession: detail.nextSession ? { id: detail.nextSession.id, scheduledAt: detail.nextSession.scheduledAt.toISOString() } : null,
    plan: detail.plan ? { ...detail.plan, weekStart: detail.plan.weekStart.toISOString() } : null,
    recentSessions: detail.recentSessions.map((item) => ({ id: item.id, status: item.status, scheduledAt: item.scheduledAt.toISOString(), focus: item.focus, sharedNote: item.sharedNote })),
    canReadInternal: detail.canReadInternal,
    notes: detail.notes.map((note) => ({ ...note, createdAt: note.createdAt.toISOString() })),
  });
}
