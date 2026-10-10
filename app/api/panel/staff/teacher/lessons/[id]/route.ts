import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { academicSupportLabels } from "@/lib/accessibility-preferences";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { loadTeacherLessonWorkspaceData } from "@/lib/panel/teacher-lesson-server";
import { displayName } from "@/lib/mobile/staff-views";
import { httpsOrNull, requireStaffApi, staffJson, staffNotFound } from "@/lib/panel/staff-api";

/**
 * Ders ayrıntısı + kapanış formu verisi — web ders kapanış sayfasıyla AYNI
 * yükleyici. Başka öğretmenin dersi / tahmin edilen kimlik → 404. Kapanış
 * yazması MEVCUT `PUT /api/panel/lessons/[id]/notes` ucuyla yapılır.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("OD", "od:lesson:teach");
  if (!auth.ok) return auth.response;
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  const { id } = params.data;
  const flags = getPanelFeatureFlags();
  const data = await loadTeacherLessonWorkspaceData(auth.session.userId, id, flags.learningOutcomes);
  if (!data) return staffNotFound("Ders bulunamadı.");
  const { lesson, previous, outcomes } = data;
  const common = lesson.notes.find((note) => note.studentId === null);
  const previousNote = previous?.notes[0] ?? null;
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    id: lesson.id,
    title: lesson.title,
    groupName: lesson.group.name,
    subject: lesson.group.subject,
    status: lesson.status,
    startsAt: lesson.startsAt.toISOString(),
    endsAt: lesson.endsAt.toISOString(),
    meetingUrl: httpsOrNull(lesson.meetingUrl),
    closeVersion: lesson.closeVersion,
    flags: { quickLessonClose: flags.quickLessonClose, learningOutcomes: flags.learningOutcomes },
    common: { topic: common?.topic ?? "", note: common?.note ?? "", nextGoal: common?.nextGoal ?? "", homework: common?.homework ?? "" },
    previous: previousNote ? { topic: previousNote.topic, nextGoal: previousNote.nextGoal, homework: previousNote.homework } : null,
    students: lesson.group.enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      name: displayName(enrollment.student.user),
      attendance: lesson.attendances.find((item) => item.studentId === enrollment.student.id)?.status ?? null,
      note: lesson.notes.find((note) => note.studentId === enrollment.student.id)?.note ?? "",
      supportLabels: flags.accessibilityProfile && enrollment.student.user.accessibilityPreference ? academicSupportLabels(enrollment.student.user.accessibilityPreference) : [],
    })),
    outcomes: {
      linked: lesson.outcomeLinks.map((link) => ({ outcomeId: link.outcomeId, evidenceType: link.evidenceType })),
      skipReason: lesson.outcomeSkipReason,
      catalog: (outcomes as Array<{ id: string; code: string; title: string; unit: { name: string; subject: { name: string } } }>).map((outcome) => ({ id: outcome.id, code: outcome.code, title: outcome.title, subject: outcome.unit.subject.name, unit: outcome.unit.name })),
    },
  });
}
