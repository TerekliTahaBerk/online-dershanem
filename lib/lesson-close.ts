import { createHash } from "node:crypto";

type HashableClosePayload = {
  topic: string;
  note: string;
  nextGoal: string;
  homework: string;
  students: { studentId: string; note: string; attendance: string }[];
  outcomes: { outcomeId: string; evidenceType: string }[];
  outcomeSkipReason: string | null;
  assignmentDraft?: {
    title: string;
    description: string;
    dueAt: string;
    studentIds: string[];
  } | null;
};

/** Aynı kapanış niyetini sıralamadan etkilenmeyen, PII loglamayan biçimde karşılaştırır. */
export function lessonCloseRequestHash(payload: HashableClosePayload): string {
  const canonical = {
    ...payload,
    students: [...payload.students].sort((a, b) => a.studentId.localeCompare(b.studentId)),
    outcomes: [...payload.outcomes].sort((a, b) => a.outcomeId.localeCompare(b.outcomeId)),
    assignmentDraft: payload.assignmentDraft ? {
      ...payload.assignmentDraft,
      studentIds: [...new Set(payload.assignmentDraft.studentIds)].sort(),
    } : null,
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
