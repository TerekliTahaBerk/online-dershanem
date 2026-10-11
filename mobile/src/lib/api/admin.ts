import {
  parseActivationDesk,
  parseAdminReports,
  parseGlobalSearch,
  parseInterventionCreate,
  parseInterventionGenerate,
  parseInterventionInbox,
  parseInterventionUpdate,
  parseOkResult,
  parseOperationsCenter,
  parseStepUpResult,
  type MobileActivationDesk,
  type MobileAdminReports,
  type MobileGlobalSearch,
  type MobileInterventionInbox,
  type MobileOperationsCenter,
  type MobileOpsGroupFilter,
  type MobileStepUpResult,
} from '@contracts/admin';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * Faz 1 yönetim uçları. Okumalar `/api/panel/admin/*` ve mevcut
 * `/api/panel/admin-search`; yetki her istekte sunucuda (gerçek ADMIN oturumu,
 * hassas yazmalarda taze step-up). Yanıtlar güven sınırında doğrulanır.
 */

function validated<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

export async function fetchOperationsCenter(api: ApiClient, group: MobileOpsGroupFilter, signal?: AbortSignal): Promise<MobileOperationsCenter> {
  const query = group === 'tumu' ? '' : `?grup=${encodeURIComponent(group)}`;
  return validated(parseOperationsCenter(await api.request<unknown>(`/api/panel/admin/operations-center${query}`, { signal })));
}

export async function searchGlobal(api: ApiClient, query: string, signal?: AbortSignal): Promise<MobileGlobalSearch> {
  return validated(parseGlobalSearch(await api.request<unknown>(`/api/panel/admin-search?q=${encodeURIComponent(query.trim().slice(0, 80))}`, { signal })));
}

/**
 * Hassas işlem öncesi ikinci faktör (yalnız doğrulayıcı kodu; sunucu
 * kurtarma kodunu step-up için kabul etmez). Başarı yalnız sunucu
 * `verified: true` dediğinde sayılır.
 */
export async function verifyStepUp(api: ApiClient, code: string): Promise<MobileStepUpResult> {
  return validated(parseStepUpResult(await api.request<unknown>('/api/auth/mfa/code/verify', { method: 'POST', body: { code, method: 'TOTP', purpose: 'STEP_UP' } })));
}

/* ------------------------------------------------------------------ *
 * Müdahale kutusu (Faz 2.1). Okuma yönetim ucundan; yazmalar web ile
 * AYNI uçlardan (aynı yetki, sürüm kontrolü, denetim ve ürün olayları).
 * ------------------------------------------------------------------ */

export async function fetchInterventionInbox(api: ApiClient, signal?: AbortSignal): Promise<MobileInterventionInbox> {
  return validated(parseInterventionInbox(await api.request<unknown>('/api/panel/admin/interventions', { signal })));
}

export type InterventionPatch =
  | { action: 'ASSIGN_SELF' | 'REOPEN' }
  | { action: 'START'; note?: string }
  | { action: 'LOG_ACTION'; note: string }
  | { action: 'SNOOZE'; days: number; note?: string }
  | { action: 'RESOLVE'; outcomeCode: string; note?: string }
  | { action: 'FALSE_POSITIVE'; falsePositiveReason: string; note?: string };

/** `expectedVersion` sunucuda karşılaştırılır; başka yerde değişen kayıt 409 döner (üzerine yazılmaz). */
export async function updateIntervention(api: ApiClient, id: string, expectedVersion: number, patch: InterventionPatch): Promise<void> {
  validated(parseInterventionUpdate(await api.request<unknown>(`/api/panel/interventions/${encodeURIComponent(id)}`, { method: 'PATCH', body: { ...patch, expectedVersion } })));
}

export async function createIntervention(api: ApiClient, input: { studentId: string; reasonCode: string; explanation: string; suggestedAction: string; followUpDate: string }): Promise<string> {
  return validated(parseInterventionCreate(await api.request<unknown>('/api/panel/interventions', { method: 'POST', body: input }))).id;
}

export async function generateInterventions(api: ApiClient): Promise<{ createdCount: number; reactivatedCount: number; evaluatedStudentCount: number }> {
  return validated(parseInterventionGenerate(await api.request<unknown>('/api/panel/interventions/generate', { method: 'POST', body: {} })));
}

/** Yönetim raporları (son 30 gün; Faz 2.1). CSV dışa aktarımı mobilde yok (E5). */
export async function fetchAdminReports(api: ApiClient, signal?: AbortSignal): Promise<MobileAdminReports> {
  return validated(parseAdminReports(await api.request<unknown>('/api/panel/admin/reports', { signal })));
}

/* ------------------------------------------------------------------ *
 * Aktivasyon masası (Faz 2.1). Geçiş ve sipariş bağlama sunucuda taze
 * step-up ister (428 → native doğrulama → aynı istek bir kez).
 * ------------------------------------------------------------------ */

export async function fetchActivationDesk(api: ApiClient, signal?: AbortSignal): Promise<MobileActivationDesk> {
  return validated(parseActivationDesk(await api.request<unknown>('/api/panel/admin/activation-desk', { signal })));
}

export async function transitionOnboarding(api: ApiClient, orderId: string, input: { toState: string; ownerId: string | null; blockerReason: string | null; note: string | null }): Promise<void> {
  validated(parseOkResult(await api.request<unknown>(`/api/panel/orders/${encodeURIComponent(orderId)}/onboarding`, { method: 'POST', body: input })));
}

export async function linkOrderToStudent(api: ApiClient, orderId: string, userId: string): Promise<void> {
  validated(parseOkResult(await api.request<unknown>(`/api/panel/orders/${encodeURIComponent(orderId)}/user`, { method: 'POST', body: { userId } })));
}

export async function updateLeadStatus(api: ApiClient, leadId: string, status: string): Promise<void> {
  validated(parseOkResult(await api.request<unknown>(`/api/panel/leads/${encodeURIComponent(leadId)}`, { method: 'PATCH', body: { status } })));
}

export async function retryEmail(api: ApiClient, emailId: string): Promise<void> {
  validated(parseOkResult(await api.request<unknown>(`/api/panel/email-outbox/${encodeURIComponent(emailId)}/retry`, { method: 'PATCH', body: {} })));
}
