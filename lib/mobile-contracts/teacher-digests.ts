import { check, v, type Infer } from "./validate";
const digests = v.object({ contractVersion: v.literal(1), rows: v.array(v.object({
  studentId: v.nonEmpty(), name: v.string(), revision: v.nonEmpty(), digest: v.nullable(v.object({
    id: v.nonEmpty(), status: v.oneOf(["DRAFT", "PUBLISHED"]), version: v.int(1), goodThingOne: v.string(), goodThingTwo: v.string(), supportArea: v.string(), homeQuestion: v.string(), dataThrough: v.iso(),
  })),
})) });
export type TeacherDigests = Infer<typeof digests>;
export function parseTeacherDigests(input: unknown) { return check(digests, input); }
export function parseTeacherDigestWrite(input: unknown, action: "generate" | "publish") {
  return action === "generate"
    ? check(v.object({ id: v.nonEmpty(), generated: v.literal(true), replayed: v.boolean() }), input)
    : check(v.object({ published: v.literal(true), replayed: v.boolean() }), input);
}
