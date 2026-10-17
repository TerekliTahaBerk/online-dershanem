import { operationDigest } from "./group-mutation-core";

/** Her devir yeni atama kimliği üretir; boş atama da bir sürümdür. */
export function coachAssignmentRevision(assignment: { id: string; coachId: string; cadenceDays: number | null } | null) {
  return operationDigest(assignment ? { id: assignment.id, coachId: assignment.coachId, cadenceDays: assignment.cadenceDays } : null);
}

export class CoachAssignmentConflict extends Error {
  constructor(public code = "COACH_ASSIGNMENT_CONFLICT", message = "Koç ataması değişti. Sayfayı yenileyip tekrar deneyebilirsiniz.") { super(message); }
}

export function readCoachReceipt(payload: unknown, digest: string): { ok: true; replayed: boolean } {
  const saved = payload as { operationDigest?: string } | null;
  if (saved?.operationDigest !== digest) throw new CoachAssignmentConflict("IDEMPOTENCY_REUSE", "İşlem anahtarı farklı bir istek için kullanılamaz.");
  return { ok: true, replayed: true };
}
