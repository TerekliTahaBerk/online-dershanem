import {
  parseChangeRequestResult,
  parseCheckInCreated,
  parseCheckInState,
  parseCoachingMutationResult,
  parseGoals,
  parseHelpFeedbackResult,
  parsePreferenceResult,
  parseTaskCompleteResult,
  parseYonCoaching,
  parseYonPlan,
  parseYonToday,
  type MobileYonPreference,
  type YonCompleteStatus,
  type YonOverloadOption,
  type YonRescheduleReason,
} from '@contracts/yon';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * M3 Yön (OK) öğrenci uçları + ortak check-in. Her yanıt paylaşılan
 * sözleşme doğrulayıcısından geçer; uymayan yanıt `invalid_response` olur ve
 * ekrana "başarılı" diye yansımaz. Yazmalar bu katmanda ASLA otomatik
 * tekrarlanmaz. Öğrenci kimliği hiçbir istekte gönderilmez (sunucu oturumdan
 * çözer).
 */

function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

const id = (value: string) => encodeURIComponent(value);

/* Okuma */

export async function fetchYonToday(api: ApiClient, signal?: AbortSignal) {
  return validated(parseYonToday(await api.request<unknown>('/api/panel/student/yon', { signal })));
}

export async function fetchYonPlan(api: ApiClient, signal?: AbortSignal) {
  return validated(parseYonPlan(await api.request<unknown>('/api/panel/student/plan', { signal })));
}

export async function fetchGoals(api: ApiClient, signal?: AbortSignal) {
  return validated(parseGoals(await api.request<unknown>('/api/panel/student/goals', { signal })));
}

export async function fetchYonCoaching(api: ApiClient, signal?: AbortSignal) {
  return validated(parseYonCoaching(await api.request<unknown>('/api/panel/student/coaching', { signal })));
}

export async function fetchCheckIn(api: ApiClient, signal?: AbortSignal) {
  return validated(parseCheckInState(await api.request<unknown>('/api/panel/student/check-in', { signal })));
}

/* Plan görevi — web Planım / Bugün ile aynı uç (`/api/panel/kocum/tasks/[id]/complete`) */

export type TaskCompletionPayload = {
  status: YonCompleteStatus;
  actualQuestions?: number | null;
  actualCorrect?: number | null;
  actualIncorrect?: number | null;
  actualBlank?: number | null;
  actualMinutes?: number | null;
  studentNote?: string | null;
  difficultyFelt?: number | null;
  energyFelt?: number | null;
};

export async function completePlanTask(api: ApiClient, taskId: string, payload: TaskCompletionPayload) {
  const body = await api.request<unknown>(`/api/panel/kocum/tasks/${id(taskId)}/complete`, { method: 'POST', body: payload });
  return validated(parseTaskCompleteResult(body));
}

export async function requestPlanChange(api: ApiClient, planId: string, input: { category: 'TOO_MUCH' | 'WRONG_DAYS'; overwhelmPulse: number; option: YonOverloadOption; expectedVersion: number }) {
  const body = await api.request<unknown>(`/api/panel/adaptive-plan/${id(planId)}/request-change`, { method: 'POST', body: input });
  return validated(parseChangeRequestResult(body));
}

/**
 * Tercihler — sunucu şeması alanların TAMAMINI bekler (eksik alan varsayılana
 * döner). Bu yüzden mobil, düzenlemediği alanları (sınav tarihi / türü,
 * yoğunluk nabzı, planlama açık mı) sunucudan okuduğu değerlerle aynen geri
 * gönderir; böylece web'de girilmiş bilgi silinmez.
 */
export async function savePlanPreference(api: ApiClient, preference: MobileYonPreference) {
  const body = await api.request<unknown>('/api/panel/adaptive-plan/preferences', {
    method: 'PATCH',
    body: {
      availableDays: preference.availableDays,
      minutesPerDay: preference.minutesPerDay,
      nextExamAt: preference.nextExamAt,
      examLabel: preference.nextExamAt ? preference.examLabel || 'OKUL SINAVI' : null,
      planningEnabled: preference.planningEnabled,
      overwhelmPulse: preference.overwhelmPulse,
    },
  });
  return validated(parsePreferenceResult(body));
}

/* Koçluk görüşmesi — paneldeki öğrenci REQUEST / ACCEPT eylemleri */

export async function requestSessionReschedule(api: ApiClient, sessionId: string, input: { reason: YonRescheduleReason; expectedVersion: number; idempotencyKey: string }) {
  const body = await api.request<unknown>(`/api/panel/coaching-sessions/${id(sessionId)}`, {
    method: 'POST',
    body: { action: 'REQUEST', reason: input.reason, expectedVersion: input.expectedVersion, idempotencyKey: input.idempotencyKey },
  });
  return validated(parseCoachingMutationResult(body));
}

export async function acceptSessionProposal(api: ApiClient, sessionId: string, input: { expectedVersion: number; idempotencyKey: string }) {
  const body = await api.request<unknown>(`/api/panel/coaching-sessions/${id(sessionId)}`, {
    method: 'POST', body: { action: 'ACCEPT', ...input },
  });
  return validated(parseCoachingMutationResult(body));
}

/* Check-in (OD + Yön ortak) */

export type CheckInPayload = {
  target: { kind: 'GROUP'; groupId: string } | { kind: 'COACH'; coachAssignmentId: string };
  energy: 'LOW' | 'STEADY' | 'GOOD';
  confidence: 'NEED_GUIDANCE' | 'BUILDING' | 'CONFIDENT';
  barrier: 'NONE' | 'NOT_UNDERSTANDING' | 'TIME_LOAD' | 'ACCESS_TECH' | 'NEED_EXAMPLE' | 'OTHER';
  shareWithTeacher: boolean;
  helpRequested: boolean;
};

export async function submitCheckIn(api: ApiClient, payload: CheckInPayload) {
  const body = await api.request<unknown>('/api/panel/student-check-ins', {
    method: 'POST',
    body: {
      ...(payload.target.kind === 'GROUP' ? { groupId: payload.target.groupId } : { coachAssignmentId: payload.target.coachAssignmentId }),
      energy: payload.energy,
      confidence: payload.confidence,
      barrier: payload.barrier,
      shareWithTeacher: payload.shareWithTeacher,
      helpRequested: payload.helpRequested,
    },
  });
  return validated(parseCheckInCreated(body));
}

export async function sendHelpFeedback(api: ApiClient, requestId: string, input: { expectedVersion: number; helpful: boolean }) {
  const body = await api.request<unknown>(`/api/panel/student-help-requests/${id(requestId)}/feedback`, { method: 'POST', body: input });
  return validated(parseHelpFeedbackResult(body));
}
