import { parseEducation, parseGroup360, parseGroupCandidates, parseGroupMemberPreview, parseGroupMutationResult, type GroupTab } from '@contracts/admin-education';

import type { ApiClient } from './client';
import { ApiError } from './errors';

function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

export async function fetchEducation(api: ApiClient, signal?: AbortSignal) {
  return validated(parseEducation(await api.request<unknown>('/api/panel/admin/education', { signal })));
}

export async function fetchGroup360(api: ApiClient, id: string, tab: GroupTab, signal?: AbortSignal) {
  return validated(parseGroup360(await api.request<unknown>(`/api/panel/admin/groups/${encodeURIComponent(id)}?sekme=${tab}`, { signal })));
}

export type GroupCreateInput = { name: string; subject: string; level: string; teacherId: string; studentIds: string[] };
export type GroupUpdate = { action: 'UPDATE_META'; name: string; subject: string; level: string } | { action: 'CHANGE_TEACHER'; teacherId: string } | { action: 'SET_ACTIVE'; isActive: boolean } | { action: 'ADD_STUDENT'; studentId: string };
export type GroupMemberAction = { action: 'TRANSFER'; studentIds: string[]; targetGroupId: string } | { action: 'REMOVE'; studentIds: string[] } | { action: 'NOTIFY'; studentIds: string[]; title: string; body: string };

export async function createGroup(api: ApiClient, input: GroupCreateInput, idempotencyKey: string) {
  return validated(parseGroupMutationResult(await api.request<unknown>('/api/panel/groups', { method: 'POST', body: { ...input, idempotencyKey } })));
}

export async function updateGroup(api: ApiClient, id: string, input: GroupUpdate, expectedRevision: string, idempotencyKey: string) {
  return validated(parseGroupMutationResult(await api.request<unknown>(`/api/panel/groups/${encodeURIComponent(id)}`, { method: 'PATCH', body: { ...input, expectedRevision, idempotencyKey } })));
}

export async function fetchGroupCandidates(api: ApiClient, id: string, search: string, signal?: AbortSignal) {
  return validated(parseGroupCandidates(await api.request<unknown>(`/api/panel/groups/${encodeURIComponent(id)}/students?q=${encodeURIComponent(search.trim().slice(0, 120))}`, { signal })));
}

export async function previewGroupMembers(api: ApiClient, id: string, input: GroupMemberAction) {
  return validated(parseGroupMemberPreview(await api.request<unknown>(`/api/panel/groups/${encodeURIComponent(id)}/members`, { method: 'POST', body: { ...input, mode: 'PREVIEW' } })));
}

export async function executeGroupMembers(api: ApiClient, id: string, input: GroupMemberAction, versions: { expectedRevision: string; expectedTargetRevision?: string }, idempotencyKey: string) {
  return validated(parseGroupMutationResult(await api.request<unknown>(`/api/panel/groups/${encodeURIComponent(id)}/members`, { method: 'POST', body: { ...input, mode: 'EXECUTE', ...versions, idempotencyKey } })));
}
