/**
 * ODK domain zod schemaları — legacy re-exports + yeni import şemaları.
 * Aktif admin API `admin-schemas.ts` kullanır.
 */

export {
  AnswerKeyDocumentSchema as AnswerKeyDocument,
  previewAnswerKeyImport,
  summarizeAnswerKeyPreview,
  ANSWER_KEY_SCHEMA_VERSION,
} from "./answer-key-import";

export {
  OutcomeDocumentSchema as LearningOutcomeList,
  previewOutcomeImport,
  OUTCOME_SCHEMA_VERSION,
} from "./outcome-import";

export { DEFAULT_EXAM_SETTINGS, normalizeExamSettings, type ExamSettings } from "./exam-domain";
export { ODK_EXAM_TEMPLATES, resolveTemplateForCreate } from "./exam-templates";
export { createExamSchema as ExamCreateInput, updateExamScheduleSchema as ExamUpdateInput } from "./admin-schemas";
