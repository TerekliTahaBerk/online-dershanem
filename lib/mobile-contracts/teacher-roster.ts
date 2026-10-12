import { check, v, type Infer } from './validate';

const filter = v.oneOf(['all', 'risky', 'help', 'overdue', 'plan_behind', 'upcoming_meeting'] as const);
const roster = v.object({
  filter, filters: v.array(v.object({ id: filter, label: v.nonEmpty() })), totalCount: v.int(0),
  rows: v.array(v.object({
    studentId: v.nonEmpty(), name: v.nonEmpty(), groupName: v.nonEmpty(),
    riskLevel: v.oneOf(['none', 'low', 'medium', 'high'] as const), riskReason: v.nullable(v.string()),
    lastLessonAt: v.nullable(v.iso()), lastLessonTitle: v.nullable(v.string()),
    planLabel: v.nullable(v.string()), examDeltaLabel: v.nullable(v.string()),
  })),
});
export type MobileTeacherRoster = Infer<typeof roster>;
export type TeacherRosterFilter = MobileTeacherRoster['filter'];
export const parseTeacherRoster = (input: unknown) => check(roster, input);
