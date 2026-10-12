import { parseEducationEditor, parseEducationPreview, type EducationForm, type EditorKind } from '@contracts/admin-education-editor';
import type { ApiClient } from './client';
import { ApiError } from './errors';

function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}
export async function fetchEducationEditor(api: ApiClient, input: { kind: EditorKind; id?: string; group?: string; q?: string; page?: number; week?: number; teacher?: string; lesson?: string }, signal?: AbortSignal, teacherMode = false) {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return validated(parseEducationEditor(await api.request(`${teacherMode ? '/api/panel/staff/teacher/education' : '/api/panel/admin/education/editor'}?${query}`, { signal })));
}
export async function previewEducationLessons(api: ApiClient, body: Record<string, unknown>) {
  return validated(parseEducationPreview(await api.request('/api/panel/lessons/preview-series', { method: 'POST', body })));
}
export async function saveEducationForm(api: ApiClient, form: EducationForm, body: Record<string, unknown> | FormData, revision: string | null, key: string) {
  if (!/^\/api\/panel\/(lessons|assignments|materials|setup|curriculum|assignment-submissions)(\/|$)/.test(form.path)) throw new ApiError({ kind: 'invalid_response' });
  const result = await api.request<unknown>(form.path, { method: form.method, body, timeoutMs: 60_000, headers: { 'X-Od-Idempotency-Key': key, ...(revision ? { 'X-Od-Expected-Revision': revision } : {}) } });
  if (!result || typeof result !== 'object' || !('id' in result || 'ok' in result || 'material' in result || 'reviewed' in result)) throw new ApiError({ kind: 'invalid_response' });
  return result;
}
