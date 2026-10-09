import { parseOdkExamDetail, parseOdkExamList, parseOdkHome, parseOdkResult, type OdkListView } from '@contracts/odk';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * M4 Deneme Ligi (ODK) öğrenci okuma uçları. Her yanıt paylaşılan sözleşme
 * doğrulayıcısından geçer. Bu katmanda deneme BAŞLATMA, cevap, kalp atışı,
 * bütünlük olayı veya teslim çağrısı YOKTUR (M4 kapsam dışı; sınav web'de).
 * Öğrenci kimliği hiçbir istekte gönderilmez.
 */
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

const id = (value: string) => encodeURIComponent(value);

export async function fetchOdkHome(api: ApiClient, signal?: AbortSignal) {
  return validated(parseOdkHome(await api.request<unknown>('/api/odk/student/home', { signal })));
}

export async function fetchOdkExams(api: ApiClient, view: OdkListView, signal?: AbortSignal) {
  const query = view === 'tumu' ? '' : `?gorunum=${view}`;
  return validated(parseOdkExamList(await api.request<unknown>(`/api/odk/student/exams${query}`, { signal })));
}

export async function fetchOdkExamDetail(api: ApiClient, examId: string, signal?: AbortSignal) {
  return validated(parseOdkExamDetail(await api.request<unknown>(`/api/odk/student/exams/${id(examId)}`, { signal })));
}

export async function fetchOdkResult(api: ApiClient, examId: string, signal?: AbortSignal) {
  return validated(parseOdkResult(await api.request<unknown>(`/api/odk/student/exams/${id(examId)}/result`, { signal })));
}

/** Cevap anahtarı dosya yolu — yalnız Bearer başlıkla indirilir (URL'de token yok). */
export function answerKeyPath(examId: string): string {
  return `/api/odk/student/exams/${id(examId)}/answer-key`;
}
