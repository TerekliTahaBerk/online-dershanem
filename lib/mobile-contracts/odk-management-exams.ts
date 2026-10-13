import { check, v, type Infer } from "./validate";
const data = v.object({ contractVersion: v.literal(1), canCreate: v.boolean(), revision: v.nonEmpty(),
  view: v.string(), query: v.string(), familyCode: v.nullable(v.string()), status: v.nullable(v.string()), total: v.int(0), page: v.int(1), pageSize: v.int(1),
  views: v.array(v.object({ id: v.nonEmpty(), label: v.string(), count: v.int(0) })),
  families: v.array(v.object({ code: v.nonEmpty(), name: v.string(), legacy: v.boolean() })),
  series: v.array(v.object({ id: v.nonEmpty(), title: v.string(), familyCode: v.nonEmpty() })),
  templates: v.array(v.object({ code: v.nonEmpty(), familyCode: v.nonEmpty(), label: v.string(), mode: v.oneOf(["FULL_TEMPLATE", "MATH_ONLY"]), durationMinutes: v.int(1), questionCount: v.int(1), sections: v.array(v.object({ title: v.string(), questionCount: v.int(1) })) })),
  rows: v.array(v.object({ id: v.nonEmpty(), title: v.string(), familyCode: v.nonEmpty(), status: v.string(), view: v.string(), seriesTitle: v.nullable(v.string()), startsAt: v.nullable(v.iso()), endsAt: v.nullable(v.iso()), assigned: v.int(0), attempts: v.int(0), submitted: v.int(0), blockingIssues: v.nullable(v.int(0)) })),
});
export type OdkManagementExams = Infer<typeof data>;
export type OdkCreateExamInput = { examFamilyCode: string; title: string; slug: string; seriesId: string | null; structureMode: 'FULL_TEMPLATE' | 'MATH_ONLY'; templateCode: string | null; durationMinutes?: number; questionCount?: number; description?: string; internalCode?: string; academicYear?: number; publisher?: string };
export type OdkCreateSeriesInput = { examFamilyCode: string; title: string; slug: string; academicYear: number; classLevel?: string };
export type OdkExamCreateCommand = { operation: 'exam'; input: OdkCreateExamInput } | { operation: 'series'; input: OdkCreateSeriesInput };
export function parseOdkManagementExams(input: unknown) { return check(data, input); }
export function parseOdkExamCreated(input: unknown) { return check(v.object({ ok: v.literal(true), id: v.nonEmpty(), replayed: v.boolean() }), input); }
