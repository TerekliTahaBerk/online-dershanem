import { check, v, type Infer } from "./validate";
const content = v.object({ title: v.string(), body: v.string(), checkPrompt: v.string(), successCriteria: v.array(v.string()), citations: v.array(v.string()) });
const drafts = v.object({ contractVersion: v.literal(1), lessons: v.array(v.object({ id: v.nonEmpty(), title: v.string(), groupName: v.string(), startsAt: v.iso(), revision: v.nonEmpty() })), drafts: v.array(v.object({ id: v.nonEmpty(), taskType: v.oneOf(["ASSIGNMENT", "MINI_CHECK"]), status: v.oneOf(["DRAFT", "APPROVED", "REJECTED", "FLAGGED"]), provider: v.oneOf(["OPENAI", "GEMINI", "FALLBACK", "STUB"]), promptVersion: v.string(), modelName: v.nullable(v.string()), fallbackReason: v.nullable(v.string()), version: v.int(1), createdAt: v.iso(), lessonTitle: v.string(), revision: v.nonEmpty(), sourceRefs: v.array(v.object({ id: v.nonEmpty(), label: v.string() })), originalContent: content, reviewedContent: v.nullable(content) })) });
export type TeacherAiDrafts = Infer<typeof drafts>;
export type TeacherAiDraft = TeacherAiDrafts["drafts"][number];
export function parseTeacherAiDrafts(input: unknown) { return check(drafts, input); }
export function parseTeacherAiWrite(input: unknown) { return check(v.object({ ok: v.literal(true), id: v.nonEmpty(), replayed: v.boolean() }), input); }
