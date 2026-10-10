import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadCoachSessions } from "@/lib/kocum/coach-mobile-server";
import { displayName } from "@/lib/mobile/staff-views";
import { requireStaffApi, staffJson } from "@/lib/panel/staff-api";

/** Koç görüşmeleri — web `app/panel/ogretmen/yon/gorusmeler` ile aynı kapsam; not ve bağlantı yok. */
export async function GET() {
  const auth = await requireStaffApi("OK", "ok:coaching:write");
  if (!auth.ok) return auth.response;
  const { upcoming, past } = await loadCoachSessions(auth.session.userId);
  const row = (item: (typeof upcoming)[number]) => ({
    id: item.id,
    studentId: item.assignment.student.id,
    studentName: displayName(item.assignment.student.user),
    scheduledAt: item.scheduledAt.toISOString(),
    status: item.status,
    focus: item.focus,
    rescheduleRequested: Boolean(item.rescheduleRequestedAt),
    proposedAt: item.proposedAt?.toISOString() ?? null,
  });
  return staffJson({ contractVersion: MOBILE_STAFF_CONTRACT_VERSION, upcoming: upcoming.map(row), past: past.map(row) });
}
