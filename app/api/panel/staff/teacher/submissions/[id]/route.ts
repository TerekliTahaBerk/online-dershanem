import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadTeacherSubmission } from "@/lib/panel/teacher-assignments-server";
import { displayName } from "@/lib/mobile/staff-views";
import { requireStaffApi, staffFeatureDisabled, staffJson, staffNotFound } from "@/lib/panel/staff-api";

/**
 * Teslim ayrıntısı — öğretmenin AKTİF grubu + öğrencinin AKTİF kaydı.
 * Rubric ölçütleri sunucudan; değerlendirme MEVCUT
 * `POST /api/panel/assignment-submissions/[id]/review` ile.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().assignmentEvidence) return staffFeatureDisabled("Kanıtlı teslim henüz açık değil.");
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  const row = await loadTeacherSubmission(auth.session.userId, id);
  if (!row) return staffNotFound("Teslim bulunamadı.");
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    id: row.id,
    version: row.version,
    status: row.status,
    attemptNumber: row.attemptNumber,
    submittedAt: row.submittedAt.toISOString(),
    studentName: displayName(row.student.user),
    textEvidence: row.textEvidence,
    assignment: { id: row.assignment.id, title: row.assignment.title, description: row.assignment.description?.trim() || null, dueAt: row.assignment.dueAt.toISOString(), groupName: row.assignment.group.name },
    criteria: row.assignment.rubricCriteria,
    previous: row.previous.map((item) => ({ attemptNumber: item.attemptNumber, status: item.status, feedback: item.feedback, reviewedAt: item.reviewedAt?.toISOString() ?? null, scores: item.scores })),
  });
}
