import { check, v, type Infer } from "./validate";

const row = v.object({ studentId: v.nonEmpty(), studentName: v.string(), classLevel: v.nullable(v.string()), attendancePercent: v.nullable(v.number()), assignmentPercent: v.nullable(v.number()), planPercent: v.nullable(v.number()), netDelta: v.nullable(v.number()), declining: v.boolean(), riskHint: v.nullable(v.string()) });
const analysis = v.object({ contractVersion: v.literal(1), periodLabel: v.string(), studentCount: v.int(0), narrative: v.array(v.string()), averages: v.object({ attendancePercent: v.nullable(v.number()), assignmentPercent: v.nullable(v.number()), planPercent: v.nullable(v.number()), medianNetDelta: v.nullable(v.number()) }), rows: v.array(row) });
export type TeacherAnalysis = Infer<typeof analysis>;
export function parseTeacherAnalysis(input: unknown) { return check(analysis, input); }
