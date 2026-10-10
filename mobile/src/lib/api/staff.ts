import {
  parseApproveResult,
  parseCoachHome,
  parseCoachPlanDetail,
  parseCoachPlans,
  parseCoachSessionDetail,
  parseCoachSessions,
  parseCoachStudentDetail,
  parseCoachStudents,
  parseHelpInbox,
  parseHelpResult,
  parseLessonSaveResult,
  parseNoteResult,
  parseOdkStaffReport,
  parseOdkStaffStudents,
  parseRescheduleResult,
  parseReviewResult,
  parseSessionResult,
  parseSubmissionDetail,
  parseSubmissionQueue,
  parseSuggestionResult,
  parseTeacherAssignments,
  parseTeacherHome,
  parseTeacherLessonDetail,
  parseTeacherLessons,
  type HelpAction,
  type LessonRange,
  type MobileAttendance,
  type NoteVisibility,
} from '@contracts/staff';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * M7 personel uçları. Okumalar yeni `/api/panel/staff/*` ve
 * `/api/odk/staff/*` uçlarından; YAZMALAR MEVCUT web uçlarıyla (aynı yetki,
 * doğrulama, denetim, bildirim ve tekrar / sürüm kuralları). İstek
 * `Authorization: Bearer` ile; token URL'de yok. Çevrimdışı kuyruk yok (M8).
 */
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}
const id = (value: string) => encodeURIComponent(value);
const get = (api: ApiClient, path: string, signal?: AbortSignal) => api.request<unknown>(path, { signal });

/* ---- Öğretmen okuma ---- */
export const fetchTeacherHome = async (api: ApiClient, signal?: AbortSignal) => validated(parseTeacherHome(await get(api, '/api/panel/staff/teacher/home', signal)));
export const fetchTeacherLessons = async (api: ApiClient, range: LessonRange, signal?: AbortSignal) => validated(parseTeacherLessons(await get(api, `/api/panel/staff/teacher/lessons?aralik=${range}`, signal)));
export const fetchTeacherLesson = async (api: ApiClient, lessonId: string, signal?: AbortSignal) => validated(parseTeacherLessonDetail(await get(api, `/api/panel/staff/teacher/lessons/${id(lessonId)}`, signal)));
export const fetchTeacherAssignments = async (api: ApiClient, signal?: AbortSignal) => validated(parseTeacherAssignments(await get(api, '/api/panel/staff/teacher/assignments', signal)));
export const fetchSubmissionQueue = async (api: ApiClient, signal?: AbortSignal) => validated(parseSubmissionQueue(await get(api, '/api/panel/staff/teacher/submissions', signal)));
export const fetchSubmission = async (api: ApiClient, submissionId: string, signal?: AbortSignal) => validated(parseSubmissionDetail(await get(api, `/api/panel/staff/teacher/submissions/${id(submissionId)}`, signal)));
export const fetchHelpInbox = async (api: ApiClient, signal?: AbortSignal) => validated(parseHelpInbox(await get(api, '/api/panel/staff/teacher/help', signal)));

/* ---- Öğretmen yazma (MEVCUT uçlar) ---- */
export type LessonNotesPayload = {
  topic: string;
  note: string;
  nextGoal: string;
  homework: string;
  complete: boolean;
  students: { studentId: string; note: string; attendance: MobileAttendance }[];
  outcomes: { outcomeId: string; evidenceType: 'TAUGHT' | 'OBSERVED' | 'INDEPENDENT' | 'NEEDS_REVIEW' }[];
  outcomeSkipReason: 'CATALOG_MISSING' | 'COMPLETE_LATER' | 'NOT_APPLICABLE' | null;
  expectedVersion?: number;
  idempotencyKey?: string;
};
export const saveLessonNotes = async (api: ApiClient, lessonId: string, payload: LessonNotesPayload) =>
  validated(parseLessonSaveResult(await api.request<unknown>(`/api/panel/lessons/${id(lessonId)}/notes`, { method: 'PUT', body: payload })));

export const reviewSubmission = async (
  api: ApiClient,
  submissionId: string,
  payload: { expectedVersion: number; decision: 'APPROVE' | 'REQUEST_CHANGES'; feedback: string; interactionDurationMs: number; scores: { criterionId: string; level: 'NEEDS_WORK' | 'DEVELOPING' | 'MEETS' }[] },
) => validated(parseReviewResult(await api.request<unknown>(`/api/panel/assignment-submissions/${id(submissionId)}/review`, { method: 'POST', body: payload })));

export const respondHelp = async (api: ApiClient, requestId: string, payload: { expectedVersion: number; action: HelpAction }) =>
  validated(parseHelpResult(await api.request<unknown>(`/api/panel/student-help-requests/${id(requestId)}/respond`, { method: 'POST', body: payload })));

/* ---- Koç okuma ---- */
export const fetchCoachHome = async (api: ApiClient, signal?: AbortSignal) => validated(parseCoachHome(await get(api, '/api/panel/staff/coach/home', signal)));
export const fetchCoachStudents = async (api: ApiClient, signal?: AbortSignal) => validated(parseCoachStudents(await get(api, '/api/panel/staff/coach/students', signal)));
export const fetchCoachStudent = async (api: ApiClient, studentId: string, signal?: AbortSignal) => validated(parseCoachStudentDetail(await get(api, `/api/panel/staff/coach/students/${id(studentId)}`, signal)));
export const fetchCoachSessions = async (api: ApiClient, signal?: AbortSignal) => validated(parseCoachSessions(await get(api, '/api/panel/staff/coach/sessions', signal)));
export const fetchCoachSession = async (api: ApiClient, sessionId: string, signal?: AbortSignal) => validated(parseCoachSessionDetail(await get(api, `/api/panel/staff/coach/sessions/${id(sessionId)}`, signal)));
export const fetchCoachPlans = async (api: ApiClient, signal?: AbortSignal) => validated(parseCoachPlans(await get(api, '/api/panel/staff/coach/plans', signal)));
export const fetchCoachPlan = async (api: ApiClient, planId: string, signal?: AbortSignal) => validated(parseCoachPlanDetail(await get(api, `/api/panel/staff/coach/plans/${id(planId)}`, signal)));

/* ---- Koç yazma (MEVCUT uçlar) ---- */
export const createCoachingSession = async (api: ApiClient, payload: { studentId: string; scheduledAt: string; meetingUrl: string | null; idempotencyKey: string }) =>
  validated(parseSessionResult(await api.request<unknown>('/api/panel/coaching-sessions', { method: 'POST', body: payload })));

export type SessionMutation =
  | { action: 'SAVE'; expectedVersion: number; idempotencyKey: string; scheduledAt: string; meetingUrl: string | null }
  | { action: 'COMPLETE'; expectedVersion: number; idempotencyKey: string; focus: string; sharedNote: string; privateNote: string; decisions: { title: string; scheduledFor: string; durationMinutes: number }[] };
export const mutateCoachingSession = async (api: ApiClient, sessionId: string, payload: SessionMutation) =>
  validated(parseSessionResult(await api.request<unknown>(`/api/panel/coaching-sessions/${id(sessionId)}`, { method: 'POST', body: payload })));

export const createCoachNote = async (api: ApiClient, payload: { studentId: string; body: string; visibility: NoteVisibility }) =>
  validated(parseNoteResult(await api.request<unknown>('/api/panel/kocum/notes', { method: 'POST', body: payload })));

export const rescheduleTask = async (api: ApiClient, taskId: string, payload: { scheduledFor: string; expectedPlanVersion: number }) =>
  validated(parseRescheduleResult(await api.request<unknown>(`/api/panel/kocum/tasks/${id(taskId)}/reschedule`, { method: 'POST', body: payload })));

export const reviewSuggestion = async (api: ApiClient, suggestionId: string, decision: 'ACCEPTED' | 'REJECTED') =>
  validated(parseSuggestionResult(await api.request<unknown>(`/api/panel/kocum/suggestions/${id(suggestionId)}/review`, { method: 'POST', body: { decision, applyTasks: true } })));

export const approvePlan = async (api: ApiClient, planId: string, expectedVersion: number) =>
  validated(parseApproveResult(await api.request<unknown>(`/api/panel/adaptive-plan/${id(planId)}/approve`, { method: 'POST', body: { expectedVersion } })));

/* ---- Deneme Ligi ilişkili raporlar (salt okunur) ---- */
export const fetchOdkStaffStudents = async (api: ApiClient, signal?: AbortSignal) => validated(parseOdkStaffStudents(await get(api, '/api/odk/staff/related-reports', signal)));
export const fetchOdkStaffReport = async (api: ApiClient, studentId: string, signal?: AbortSignal) => validated(parseOdkStaffReport(await get(api, `/api/odk/staff/related-reports?studentId=${id(studentId)}`, signal)));
