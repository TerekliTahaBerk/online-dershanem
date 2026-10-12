import { parseMockExamsAdmin, parsePilot, parsePilotResult, type MockExamErrorCode, type MockExamTypeCode, type PilotActionCode } from '@contracts/admin-rollout';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * P2.8 kalanlar: kontrollü yayın (pilot) ve dış denemeler. Okumalar yönetim
 * ucundan; yazmalar web ile AYNI `pilot-cohorts*` ve `mock-exams*` uçlarına
 * gider. Sunucu taze step-up ister; Bearer yazmaları işlem anahtarı ve sürüm /
 * revizyon taşır (eski görünüm 409).
 */
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

export async function fetchPilot(api: ApiClient, signal?: AbortSignal) {
  return validated(parsePilot(await api.request<unknown>('/api/panel/admin/pilot', { signal })));
}

/** Kohort oluşturmak erişimi açmaz; `requestKey` aynı zamanda işlem anahtarıdır. */
export async function createPilotCohort(api: ApiClient, groupId: string, idempotencyKey: string) {
  return validated(parsePilotResult(await api.request<unknown>('/api/panel/pilot-cohorts', { method: 'POST', body: { groupId, requestKey: idempotencyKey } })));
}

export async function transitionPilotCohort(api: ApiClient, input: { cohortId: string; action: PilotActionCode; expectedVersion: number; stopReason?: string }, idempotencyKey: string) {
  const { cohortId, ...body } = input;
  return validated(parsePilotResult(await api.request<unknown>(`/api/panel/pilot-cohorts/${encodeURIComponent(cohortId)}`, { method: 'PATCH', body: { ...body, idempotencyKey } })));
}

export async function fetchAdminMockExams(api: ApiClient, studentId: string | null, signal?: AbortSignal) {
  const query = studentId ? `?${new URLSearchParams({ ogrenci: studentId })}` : '';
  return validated(parseMockExamsAdmin(await api.request<unknown>(`/api/panel/admin/mock-exams${query}`, { signal })));
}

export type MockExamEntry = {
  studentId: string;
  exam: MockExamTypeCode;
  title: string;
  publisher: string;
  takenAt: string;
  durationMinutes: number | null;
  entryDurationMs: number;
  source: 'MANUAL' | 'PASTE';
  sections: { subjectCode: string; correctCount: number; incorrectCount: number; blankCount: number; durationMinutes: number | null; errorCategories: MockExamErrorCode[] }[];
};

export async function createMockExam(api: ApiClient, input: MockExamEntry, idempotencyKey: string): Promise<void> {
  await api.request('/api/panel/mock-exams', { method: 'POST', body: { ...input, idempotencyKey } });
}

/** Nedenler ve (yalnız onayda) sonraki adım; `expectedRevision` ekrandaki sürümdür. */
export async function reviseMockExam(api: ApiClient, examId: string, input: { reasons: { sectionId: string; categories: MockExamErrorCode[] }[]; nextAction?: string; expectedRevision: string }, idempotencyKey: string): Promise<void> {
  await api.request(`/api/panel/mock-exams/${encodeURIComponent(examId)}`, { method: 'PATCH', body: { ...input, idempotencyKey } });
}
