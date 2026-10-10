import {
  parseDigestFeedbackResult,
  parseParentAccount,
  parseParentAssignments,
  parseParentChildren,
  parseParentCoaching,
  parseParentDigest,
  parseParentExternalExams,
  parseParentHome,
  parseParentInsights,
  parseParentLessons,
  parseParentOdkReport,
  parseParentTeachers,
} from '@contracts/parent';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * M6 veli okuma uçları. Her yanıt paylaşılan sözleşmeden geçer.
 * `studentId` = StudentProfile.id (seçicideki kimlik); sunucu onu velinin
 * bağlantıları arasında yeniden çözer — istemci seçimi yetki DEĞİLDİR.
 * Bu katmanda çocuğun işine dokunan hiçbir yazma çağrısı yoktur; tek yazma,
 * velinin KENDİ haftalık özet geri bildirimi (mevcut uç).
 */
function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

const child = (studentId: string) => `studentId=${encodeURIComponent(studentId)}`;

export type ParentResource = 'home' | 'lessons' | 'assignments' | 'teachers' | 'insights' | 'coaching' | 'digests' | 'external-exams' | 'odk-report';

export const fetchParentChildren = async (api: ApiClient, signal?: AbortSignal) =>
  validated(parseParentChildren(await api.request<unknown>('/api/panel/parent/children', { signal })));

export const fetchParentAccount = async (api: ApiClient, signal?: AbortSignal) =>
  validated(parseParentAccount(await api.request<unknown>('/api/panel/parent/account', { signal })));

export const fetchParentHome = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentHome(await api.request<unknown>(`/api/panel/parent/home?${child(studentId)}`, { signal })));

export const fetchParentLessons = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentLessons(await api.request<unknown>(`/api/panel/parent/lessons?${child(studentId)}`, { signal })));

export const fetchParentAssignments = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentAssignments(await api.request<unknown>(`/api/panel/parent/assignments?${child(studentId)}`, { signal })));

export const fetchParentTeachers = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentTeachers(await api.request<unknown>(`/api/panel/parent/teachers?${child(studentId)}`, { signal })));

export const fetchParentInsights = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentInsights(await api.request<unknown>(`/api/panel/parent/insights?${child(studentId)}`, { signal })));

export const fetchParentCoaching = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentCoaching(await api.request<unknown>(`/api/panel/parent/coaching?${child(studentId)}`, { signal })));

export const fetchParentDigest = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentDigest(await api.request<unknown>(`/api/panel/parent/digests?${child(studentId)}`, { signal })));

export const fetchParentExternalExams = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentExternalExams(await api.request<unknown>(`/api/panel/parent/external-exams?${child(studentId)}`, { signal })));

export const fetchParentOdkReport = async (api: ApiClient, studentId: string, signal?: AbortSignal) =>
  validated(parseParentOdkReport(await api.request<unknown>(`/api/odk/parent/report?${child(studentId)}`, { signal })));

/** Velinin kendi geri bildirimi — mevcut uç; sunucu özetin YAYINLANMIŞ ve bu velinin çocuğuna ait olduğunu doğrular. */
export async function sendParentDigestFeedback(api: ApiClient, digestId: string, input: { helpful: boolean | null; anxietyPulse: number | null }) {
  return validated(parseDigestFeedbackResult(await api.request<unknown>(`/api/panel/weekly-digests/${encodeURIComponent(digestId)}/feedback`, { method: 'POST', body: input })));
}
