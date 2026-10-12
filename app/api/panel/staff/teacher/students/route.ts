import { z } from 'zod';
import { invalidApiInput } from '@/lib/api/input-validation';
import { requireStaffApi, staffJson } from '@/lib/panel/staff-api';
import { getTeacherRoster } from '@/lib/panel/teacher-roster-server';
import { TEACHER_ROSTER_FILTER_LABELS } from '@/lib/panel/teacher-roster';

const querySchema = z.object({ filtre: z.enum(['all', 'risky', 'help', 'overdue', 'plan_behind', 'upcoming_meeting']).optional() });

/** Web roster yükleyicisi aktif öğretmen grubu ve öğrenci kaydıyla sınırlar. */
export async function GET(request: Request) {
  const auth = await requireStaffApi('OD', 'od:student:read');
  if (!auth.ok) return auth.response;
  const query = querySchema.safeParse({ filtre: new URL(request.url).searchParams.get('filtre') ?? undefined });
  if (!query.success) return invalidApiInput();
  const roster = await getTeacherRoster({ teacherId: auth.session.userId, filterRaw: query.data.filtre });
  return staffJson({
    filter: roster.filter, totalCount: roster.totalCount,
    filters: roster.filters.map((id) => ({ id, label: TEACHER_ROSTER_FILTER_LABELS[id] })),
    rows: roster.rows.map(({ studentId, name, groupName, riskLevel, riskReason, lastLessonAt, lastLessonTitle, planLabel, examDeltaLabel }) =>
      ({ studentId, name, groupName, riskLevel, riskReason, lastLessonAt, lastLessonTitle, planLabel, examDeltaLabel })),
  });
}
