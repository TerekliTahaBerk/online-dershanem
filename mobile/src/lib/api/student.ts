import {
  parseAssignmentList,
  parseAssignmentProgressResult,
  parseInsights,
  parseLessonDetail,
  parseLessonList,
  parseMaterialList,
  parseMockExams,
  parseOdHome,
  parseRecovery,
  parseRecoveryCheckpointResult,
  parseRecoveryItemResult,
  parseReviewQueue,
  parseReviewResponse,
  parseSubmissionResult,
  parseDigestFeedbackResult,
  parseWeeklyDigest,
  parseWeeklyGoalResult,
  type AssignmentProgressStatus,
} from '@contracts/student';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * M2 OD öğrenci uçları. Her yanıt paylaşılan sözleşme doğrulayıcısından
 * geçer; uymayan yanıt `invalid_response` olur ve ekrana "başarılı" diye
 * yansımaz. Yazmalar bu katmanda ASLA otomatik tekrarlanmaz; tekrar güvenli
 * olan uçlarda (ilerleme `mutationKey`, kanıt / tekrar `idempotencyKey`)
 * anahtarı çağıran üretir ve aynı mantıksal deneme için yeniden kullanır.
 */

function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

const id = (value: string) => encodeURIComponent(value);

export async function fetchOdHome(api: ApiClient, signal?: AbortSignal) {
  return validated(parseOdHome(await api.request<unknown>('/api/panel/student/home?scope=OD', { signal })));
}

/* Çalışmalar */

export async function fetchAssignments(api: ApiClient, signal?: AbortSignal) {
  return validated(parseAssignmentList(await api.request<unknown>('/api/panel/assignments?scope=OD', { signal })));
}

export async function updateAssignmentProgress(
  api: ApiClient,
  input: { assignmentId: string; status: AssignmentProgressStatus; expectedVersion: number; mutationKey: string },
) {
  const body = await api.request<unknown>(`/api/panel/assignments/${id(input.assignmentId)}/progress`, {
    method: 'PATCH',
    body: { status: input.status, expectedVersion: input.expectedVersion, mutationKey: input.mutationKey },
  });
  return validated(parseAssignmentProgressResult(body));
}

export async function submitAssignmentEvidence(api: ApiClient, input: { assignmentId: string; textEvidence: string; idempotencyKey: string }) {
  const body = await api.request<unknown>(`/api/panel/assignments/${id(input.assignmentId)}/submissions`, {
    method: 'POST',
    body: { textEvidence: input.textEvidence, idempotencyKey: input.idempotencyKey },
  });
  return validated(parseSubmissionResult(body));
}

/* Dersler */

export async function fetchLessons(api: ApiClient, filter: 'yaklasan' | 'tamamlanan', signal?: AbortSignal) {
  return validated(parseLessonList(await api.request<unknown>(`/api/panel/student/lessons?durum=${filter}`, { signal })));
}

export async function fetchLessonDetail(api: ApiClient, lessonId: string, signal?: AbortSignal) {
  return validated(parseLessonDetail(await api.request<unknown>(`/api/panel/student/lessons/${id(lessonId)}`, { signal })));
}

/* Kaynaklar */

export async function fetchMaterials(api: ApiClient, signal?: AbortSignal) {
  return validated(parseMaterialList(await api.request<unknown>('/api/panel/materials', { signal })));
}

/** Kimlikli dosya ucu — token URL'e KONMAZ; indirme `authHeaders()` ile yapılır. */
export function materialFilePath(materialId: string): string {
  return `/api/panel/materials/${id(materialId)}/file`;
}

/* Gidişat */

export async function fetchInsights(api: ApiClient, signal?: AbortSignal) {
  return validated(parseInsights(await api.request<unknown>('/api/panel/student/insights', { signal })));
}

export async function saveWeeklyGoal(api: ApiClient, goal: string) {
  return validated(parseWeeklyGoalResult(await api.request<unknown>('/api/panel/student/weekly-goal', { method: 'PATCH', body: { goal } })));
}

export async function fetchMockExams(api: ApiClient, examId: string | null, signal?: AbortSignal) {
  const query = examId ? `?deneme=${id(examId)}` : '';
  return validated(parseMockExams(await api.request<unknown>(`/api/panel/mock-exams${query}`, { signal })));
}

/* Tekrar ve telafi */

export async function fetchReviewQueue(api: ApiClient, signal?: AbortSignal) {
  return validated(parseReviewQueue(await api.request<unknown>('/api/panel/student/review-queue', { signal })));
}

export async function respondReview(api: ApiClient, input: { itemId: string; response: 'WRONG' | 'UNSURE' | 'CORRECT'; idempotencyKey: string }) {
  const body = await api.request<unknown>(`/api/panel/review-queue/${id(input.itemId)}/respond`, {
    method: 'POST',
    body: { response: input.response, idempotencyKey: input.idempotencyKey },
  });
  return validated(parseReviewResponse(body));
}

/** Aynı gün içinde tekrar ertelemek sunucuda etkisizdir (204). */
export async function deferReview(api: ApiClient, itemId: string): Promise<void> {
  await api.request(`/api/panel/review-queue/${id(itemId)}/defer`, { method: 'POST', body: {} });
}

export async function fetchRecovery(api: ApiClient, signal?: AbortSignal) {
  return validated(parseRecovery(await api.request<unknown>('/api/panel/student/recovery', { signal })));
}

export async function completeRecoveryItem(api: ApiClient, packageId: string, itemId: string) {
  const body = await api.request<unknown>(`/api/panel/recovery-packages/${id(packageId)}/items/${id(itemId)}/complete`, { method: 'POST', body: {} });
  return validated(parseRecoveryItemResult(body));
}

export async function submitRecoveryCheckpoint(api: ApiClient, packageId: string, response: 'NOT_YET' | 'NEED_HELP' | 'READY') {
  const body = await api.request<unknown>(`/api/panel/recovery-packages/${id(packageId)}/checkpoint`, { method: 'POST', body: { response } });
  return validated(parseRecoveryCheckpointResult(body));
}

/* Haftalık özet */

export async function fetchWeeklyDigest(api: ApiClient, signal?: AbortSignal) {
  return validated(parseWeeklyDigest(await api.request<unknown>('/api/panel/student/weekly-digest', { signal })));
}

/** Haftalık özet geri bildirimi — sunucuda upsert (aynı değer tekrar gönderilebilir). */
export async function sendDigestFeedback(api: ApiClient, digestId: string, input: { helpful: boolean | null; anxietyPulse: number | null }) {
  return validated(parseDigestFeedbackResult(await api.request<unknown>(`/api/panel/weekly-digests/${id(digestId)}/feedback`, { method: 'POST', body: input })));
}
