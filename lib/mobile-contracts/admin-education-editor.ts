import { check, v, type Infer } from "./validate";

export const EDITOR_KINDS = ["lesson", "assignment", "material", "setup", "version", "outcome", "submission", "calendar"] as const;
const option = v.object({ id: v.string(), name: v.string(), revision: v.optional(v.nullable(v.string()), null) });
const field = v.object({ key: v.nonEmpty(), label: v.string(), type: v.oneOf(["text", "number", "boolean", "date", "choice", "ids", "lines", "links", "score", "hidden"] as const), value: v.string(), options: v.array(option), required: v.boolean() });
const form = v.object({ id: v.nonEmpty(), title: v.string(), path: v.nonEmpty(), method: v.oneOf(["POST", "PATCH"] as const), revision: v.nullable(v.string()), fields: v.array(field), preview: v.boolean(), upload: v.boolean() });
const editor = v.object({ contractVersion: v.literal(1), title: v.string(), description: v.string(), forms: v.array(form), rows: v.array(v.object({ id: v.nonEmpty(), title: v.string(), detail: v.string(), kind: v.oneOf(EDITOR_KINDS), at: v.nullable(v.iso()) })), hasMore: v.boolean(), file: v.nullable(v.object({ id: v.nonEmpty(), title: v.string(), hasFile: v.boolean(), url: v.nullable(v.string()), fileName: v.nullable(v.string()), mimeType: v.nullable(v.string()), kind: v.oneOf(["LINK", "PDF", "VIDEO"] as const) })) });
const preview = v.object({ count: v.int(0), hasConflicts: v.boolean(), conflicts: v.array(v.object({ occurrenceIndex: v.int(0), message: v.string() })), occurrences: v.array(v.object({ startsAt: v.iso(), endsAt: v.iso(), label: v.string() })) });
export type EducationEditor = Infer<typeof editor>;
export type EducationForm = Infer<typeof form>;
export type EducationField = Infer<typeof field>;
export type EditorKind = (typeof EDITOR_KINDS)[number];
export const parseEducationEditor = (input: unknown) => check(editor, input);
export const parseEducationPreview = (input: unknown) => check(preview, input);

/** Pure transport conversion; server schemas remain the authority. */
export function educationFormBody(form: EducationForm, values: Record<string, string>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const scores: { criterionId: string; level: string }[] = [];
  for (const field of form.fields) {
    const value = values[field.key] ?? field.value;
    if (field.key === "groupId" && values.targetType === "STUDENT" || ["studentId", "teacherId"].includes(field.key) && values.targetType === "GROUP") continue;
    if (!value.trim() && !field.required && ["date", "number"].includes(field.type)) continue;
    if (field.required && !value.trim()) throw new Error(`${field.label} gerekli.`);
    if (field.type === "score") { scores.push({ criterionId: field.key.slice(6), level: value }); continue; }
    if (field.type === "number") { if (!Number.isFinite(Number(value))) throw new Error(`${field.label} bir sayı olmalı.`); body[field.key] = Number(value); }
    else if (field.type === "boolean") body[field.key] = value === "true";
    else if (field.type === "date") { const date = new Date(value); if (!Number.isFinite(date.getTime())) throw new Error(`${field.label} geçerli bir tarih olmalı.`); body[field.key] = date.toISOString(); }
    else if (field.type === "ids") body[field.key] = value.split(",").filter(Boolean);
    else if (field.type === "links") body[field.key] = value.split(",").filter(Boolean).map((pair) => { const [parentId, studentId] = pair.split("|"); return { parentId, studentId }; });
    else if (field.type === "lines") body[field.key] = value.split("\n").map((line) => line.trim()).filter(Boolean);
    else if (value || field.required || field.key === "meetingUrl" || field.key === "description") body[field.key] = value;
  }
  if (scores.length) body.scores = scores;
  return body;
}
