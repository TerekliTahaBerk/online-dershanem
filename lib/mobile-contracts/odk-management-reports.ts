import { check, v, type Infer } from "./validate";
const queue = v.object({ contractVersion: v.literal(1), tab: v.string(), tabs: v.array(v.object({ id: v.nonEmpty(), label: v.string(), count: v.int(0) })),
  rows: v.array(v.object({ id: v.nonEmpty(), title: v.string(), family: v.string(), endsAt: v.nullable(v.iso()), submitted: v.int(0), assigned: v.int(0), scored: v.int(0), unscored: v.int(0), published: v.int(0), review: v.int(0), stage: v.string(), stageLabel: v.string(), actionLabel: v.string(), href: v.string() })) });
const report = v.object({ studentId: v.nonEmpty(), studentName: v.string(), available: v.boolean(), latestExamId: v.nullable(v.string()), latestNet: v.nullable(v.number()), delta: v.nullable(v.number()), weakThreshold: v.number(), weakCount: v.int(0), summary: v.array(v.string()),
  exams: v.array(v.object({ id: v.nonEmpty(), title: v.string(), family: v.string(), takenAt: v.iso(), correctCount: v.int(0), wrongCount: v.int(0), blankCount: v.int(0), totalNet: v.number() })),
  outcomes: v.array(v.object({ id: v.nonEmpty(), code: v.string(), title: v.string(), unitName: v.string(), latestAccuracy: v.number(), previousAccuracy: v.nullable(v.number()), delta: v.nullable(v.number()), evidenceCount: v.int(0), questionCount: v.int(0) })) });
const reports = v.object({ contractVersion: v.literal(1), query: v.string(), group: v.string(), groups: v.array(v.string()), total: v.int(0), rowLimit: v.int(1),
  rows: v.array(v.object({ studentId: v.nonEmpty(), name: v.string(), context: v.string(), latestTitle: v.nullable(v.string()), latestNet: v.nullable(v.number()), delta: v.nullable(v.number()), weakOutcomes: v.int(0), examCount: v.int(0) })), report: v.nullable(report) });
export type OdkManagementQueue = Infer<typeof queue>;
export type OdkManagementReports = Infer<typeof reports>;
export function parseOdkManagementQueue(input: unknown) { return check(queue, input); }
export function parseOdkManagementReports(input: unknown) { return check(reports, input); }
