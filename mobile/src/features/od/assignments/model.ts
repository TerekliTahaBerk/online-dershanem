import { ASSIGNMENT_EVIDENCE_MAX, ASSIGNMENT_EVIDENCE_MIN, type AssignmentProgressStatus, type MobileAssignment } from '@contracts/student';

import type { Tone } from '@/design/tokens';

/**
 * Çalışmalar — sunucu durumlarından türetilen SUNUM modeli. Yeni iş kuralı
 * yoktur; yalnız iki ayrı sunucu durumunu (öğrencinin ilerlemesi ve
 * öğretmenin teslim kararı, bkz. `lib/panel/assignment-progress-policy.ts`)
 * üç sekmeye yerleştirir:
 *
 *  - Bekleyen: öğrencinin yapacağı bir şey var (başlanmadı / çalışıyor /
 *    öğretmen düzeltme istedi).
 *  - Teslim edilen: öğrenci tamamladı veya kanıtı öğretmende.
 *  - Değerlendirilen: kanıtlı çalışma öğretmen tarafından onaylandı.
 */
export type AssignmentTab = 'pending' | 'submitted' | 'reviewed';

export const TAB_LABEL: Record<AssignmentTab, string> = {
  pending: 'Bekleyen',
  submitted: 'Teslim edilen',
  reviewed: 'Değerlendirilen',
};

/** Web `StudentAssignmentList` ile aynı kopya. */
export const PROGRESS_LABEL: Record<AssignmentProgressStatus, string> = {
  TODO: 'Başlanmadı',
  IN_PROGRESS: 'Çalışıyorum',
  DONE: 'Tamamlandı',
};

export const RUBRIC_LABEL = { NEEDS_WORK: 'Bir adım daha', DEVELOPING: 'Gelişiyor', MEETS: 'Karşılıyor' } as const;

export function usesEvidenceFlow(assignment: MobileAssignment, evidenceEnabled: boolean): boolean {
  return evidenceEnabled && assignment.evidenceRequired;
}

export function latestSubmission(assignment: MobileAssignment) {
  // Sunucu teslimleri deneme numarasına göre azalan sırada döner.
  return assignment.submissions[0] ?? null;
}

export function tabFor(assignment: MobileAssignment, evidenceEnabled: boolean): AssignmentTab {
  if (usesEvidenceFlow(assignment, evidenceEnabled)) {
    const latest = latestSubmission(assignment);
    if (!latest || latest.status === 'CHANGES_REQUESTED') return 'pending';
    return latest.status === 'APPROVED' ? 'reviewed' : 'submitted';
  }
  return assignment.status === 'DONE' ? 'submitted' : 'pending';
}

export function groupAssignments(assignments: MobileAssignment[], evidenceEnabled: boolean): Record<AssignmentTab, MobileAssignment[]> {
  const groups: Record<AssignmentTab, MobileAssignment[]> = { pending: [], submitted: [], reviewed: [] };
  for (const assignment of assignments) groups[tabFor(assignment, evidenceEnabled)].push(assignment);
  return groups;
}

export function isOverdue(assignment: MobileAssignment, now: Date): boolean {
  return assignment.status !== 'DONE' && Date.parse(assignment.dueAt) < now.getTime();
}

/** Web rozet mantığıyla aynı: süresi geçen → kritik, tamamlanan → başarı. */
export function statusPresentation(assignment: MobileAssignment, evidenceEnabled: boolean, now: Date): { label: string; tone: Tone } {
  if (usesEvidenceFlow(assignment, evidenceEnabled)) {
    const latest = latestSubmission(assignment);
    if (latest?.status === 'SUBMITTED') return { label: 'Kanıt öğretmeninde', tone: 'info' };
    if (latest?.status === 'APPROVED') return { label: 'Kanıt onaylandı', tone: 'success' };
    if (latest?.status === 'CHANGES_REQUESTED') return { label: 'Yeniden deneyebilirsin', tone: 'warning' };
  }
  if (isOverdue(assignment, now)) return { label: 'Süresi geçti', tone: 'critical' };
  if (assignment.status === 'DONE') return { label: PROGRESS_LABEL.DONE, tone: 'success' };
  if (assignment.status === 'IN_PROGRESS') return { label: PROGRESS_LABEL.IN_PROGRESS, tone: 'info' };
  return { label: PROGRESS_LABEL.TODO, tone: 'neutral' };
}

/** Kanıt gönderilebilir mi? Sunucu kuralının aynası (`submissions/route.ts`). */
export function canSubmitEvidence(assignment: MobileAssignment, evidenceEnabled: boolean): boolean {
  if (!usesEvidenceFlow(assignment, evidenceEnabled)) return false;
  const latest = latestSubmission(assignment);
  return !latest || latest.status === 'CHANGES_REQUESTED';
}

/**
 * İlerleme düğmeleri: kanıtsız ödevde serbest; kanıtlı ödevde sunucu yalnız
 * değerlendirme yokken TODO / IN_PROGRESS kabul eder (DONE öğretmen onayıyla).
 */
export function allowedProgress(assignment: MobileAssignment, evidenceEnabled: boolean): AssignmentProgressStatus[] {
  if (!usesEvidenceFlow(assignment, evidenceEnabled)) return ['TODO', 'IN_PROGRESS', 'DONE'];
  const latest = latestSubmission(assignment);
  if (latest && latest.status !== 'CHANGES_REQUESTED') return [];
  return ['TODO', 'IN_PROGRESS'];
}

export function evidenceLengthError(text: string): string | null {
  const length = text.trim().length;
  if (length < ASSIGNMENT_EVIDENCE_MIN) return `Kanıt metni en az ${ASSIGNMENT_EVIDENCE_MIN} karakter olmalı.`;
  if (length > ASSIGNMENT_EVIDENCE_MAX) return `Kanıt metni en fazla ${ASSIGNMENT_EVIDENCE_MAX} karakter olabilir.`;
  return null;
}

/**
 * Aynı MANTIKSAL yazmanın tekrarında aynı anahtar: ağ belirsizliğinde
 * kullanıcı "tekrar dene" derse sunucu ikinci kaydı oluşturmaz (ilerleme:
 * `lastMutationKey`, kanıt: `idempotencyKey`). Girdi değişince yeni anahtar.
 */
export type PendingWrite<I> = { input: I; key: string } | null;

export function keyForWrite<I>(pending: PendingWrite<I>, input: I, same: (left: I, right: I) => boolean, generate: () => string): { key: string; pending: NonNullable<PendingWrite<I>> } {
  if (pending && same(pending.input, input)) return { key: pending.key, pending };
  const key = generate();
  return { key, pending: { input, key } };
}
