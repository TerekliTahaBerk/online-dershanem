import { check, v, type Infer } from "./validate";

const recovery = v.object({ contractVersion: v.literal(1), rows: v.array(v.object({
  attendanceId: v.nonEmpty(), revision: v.nonEmpty(), studentName: v.string(), lessonTitle: v.string(), lessonDate: v.iso(), status: v.oneOf(["ABSENT", "EXCUSED"]),
  package: v.nullable(v.object({ id: v.nonEmpty(), status: v.oneOf(["DRAFT", "PUBLISHED", "COMPLETED"]), version: v.int(1), summaryTopic: v.string(), summaryNextStep: v.string(), checkpointPrompt: v.string(), dueAt: v.iso(), items: v.array(v.object({ id: v.nonEmpty(), kind: v.oneOf(["MATERIAL", "ASSIGNMENT"]), title: v.string() })) })),
})) });
export type TeacherRecovery = Infer<typeof recovery>;
export function parseTeacherRecovery(input: unknown) { return check(recovery, input); }
