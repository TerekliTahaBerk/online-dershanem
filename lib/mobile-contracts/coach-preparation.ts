import { check, v, type Infer } from "./validate";
const preparation = v.object({ contractVersion: v.literal(1), studentId: v.nonEmpty(), weekStart: v.iso(), revision: v.nonEmpty(),
  plans: v.array(v.object({ id: v.nonEmpty(), version: v.int(1), status: v.string(), weekStart: v.iso(), taskCount: v.int(0) })),
  templates: v.array(v.object({ id: v.nonEmpty(), title: v.string() })), subjects: v.array(v.string()),
  nextSession: v.nullable(v.object({ id: v.nonEmpty(), version: v.int(1), scheduledAt: v.iso() })),
  goals: v.array(v.object({ id: v.nonEmpty(), kind: v.string(), subjectName: v.nullable(v.string()), targetValue: v.number(), nearTermNote: v.nullable(v.string()) })),
  summary: v.nullable(v.object({ strengths: v.nullable(v.string()), focusAreas: v.nullable(v.string()), nextWeekFocus: v.nullable(v.string()), studentVisibleText: v.nullable(v.string()), parentVisibleText: v.nullable(v.string()), status: v.string() })),
});
export type CoachPreparation = Infer<typeof preparation>;
export function parseCoachPreparation(input: unknown) { return check(preparation, input); }
export function parseCoachPreparationWrite(input: unknown) { return check(v.object({ ok: v.literal(true), id: v.nonEmpty(), replayed: v.boolean() }), input); }
