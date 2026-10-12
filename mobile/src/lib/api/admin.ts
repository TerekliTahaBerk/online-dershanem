import { parseOrderRetryRevision } from '@contracts/admin-orders';
import {
  parseActivationDesk,
  parseArchiveImpact,
  parseDeletePreview,
  parseOffboardingPreview,
  parseChildAccountResult,
  parseEducators,
  parseParentsPage,
  parseProvisioningRetry,
  parseSignups,
  parseStudent360,
  parseInviteResult,
  parsePeopleDirectory,
  parsePersonDetail,
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
  type MobileArchiveImpact,
  type MobileDeletePreview,
  type MobileOffboardingPreview,
  type MobileChildAccountResult,
  type MobileEducators,
  type MobileParentsPage,
  type MobileSignups,
  type MobileStudent360,
  type MobileInviteResult,
  type MobilePeopleDirectory,
  type MobilePersonDetail,
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

/* ------------------------------------------------------------------ *
 * Kişiler & erişim (Faz 2.2). Okumalar yönetim ucundan; yazmalar web ile
 * AYNI `/api/panel/users/*` uçlarından. Hepsi sunucuda taze step-up ister.
 * ------------------------------------------------------------------ */

export type PeopleQuery = { sekme?: string; q?: string; rol?: string; urun?: string; durum?: string; sayfa?: number };

export async function fetchPeopleDirectory(api: ApiClient, query: PeopleQuery, signal?: AbortSignal): Promise<MobilePeopleDirectory> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
  const suffix = params.toString();
  return validated(parsePeopleDirectory(await api.request<unknown>(`/api/panel/admin/people${suffix ? `?${suffix}` : ''}`, { signal })));
}

export async function fetchPersonDetail(api: ApiClient, userId: string, signal?: AbortSignal): Promise<MobilePersonDetail> {
  return validated(parsePersonDetail(await api.request<unknown>(`/api/panel/admin/people/${encodeURIComponent(userId)}`, { signal })));
}

export type CreateUserInput = {
  email: string;
  fullName: string;
  phone: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
  products?: ('OD' | 'OK' | 'ODK')[];
  classLevel?: string;
  examType?: string;
  schoolName?: string;
  subjects?: string[];
};

/** Hesap açar; sunucu tek kullanımlık davet bağlantısı döner (parola istemci görmez). */
export async function createUser(api: ApiClient, input: CreateUserInput): Promise<MobileInviteResult> {
  return validated(parseInviteResult(await api.request<unknown>('/api/panel/users', { method: 'POST', body: input })));
}

export async function updateUserProfile(api: ApiClient, userId: string, input: { email: string; fullName: string; phone: string; classLevel?: string; schoolName?: string; targetGoal?: string; subjects?: string[]; bio?: string }): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: input });
}

export async function setUserStatus(api: ApiClient, userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}/status`, { method: 'POST', body: { status } });
}

/** Daveti / parolayı yeniler: açık oturumlar kapanır, yeni tek kullanımlık bağlantı döner. */
export async function resetUserInvite(api: ApiClient, userId: string): Promise<MobileInviteResult> {
  return validated(parseInviteResult(await api.request<unknown>(`/api/panel/users/${encodeURIComponent(userId)}/reset-password`, { method: 'POST', body: {} })));
}

export async function setUserProducts(api: ApiClient, userId: string, products: ('OD' | 'OK' | 'ODK')[]): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}/products`, { method: 'PUT', body: { products } });
}

export async function grantStaffRole(api: ApiClient, userId: string, input: { product: string; role: string; reason: string }): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}/staff-roles`, { method: 'POST', body: input });
}

export async function revokeStaffRole(api: ApiClient, userId: string, input: { assignmentId: string; reason: string }): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}/staff-roles`, { method: 'DELETE', body: input });
}

export async function setCoachCapacity(api: ApiClient, userId: string, coachCapacity: number | null): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}/coach-profile`, { method: 'PATCH', body: { coachCapacity } });
}

export async function requestMfaReset(api: ApiClient, userId: string, reason: string): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}/mfa-reset`, { method: 'POST', body: { reason } });
}

/** Çift kontrol: isteği açan ve hedef dışındaki yönetici onaylar (kural sunucuda). */
export async function approveMfaReset(api: ApiClient, requestId: string): Promise<void> {
  await api.request(`/api/panel/mfa-resets/${encodeURIComponent(requestId)}/approve`, { method: 'POST', body: {} });
}

/* ------------------------------------------------------------------ *
 * Kişi detayı: arşiv / silme / devir ön izlemeleri ve ek işlemler
 * (mevcut uçlar; ön izlemeler de taze step-up ister).
 * ------------------------------------------------------------------ */

export async function fetchArchiveImpact(api: ApiClient, userId: string): Promise<MobileArchiveImpact> {
  return validated(parseArchiveImpact(await api.request<unknown>(`/api/panel/users/${encodeURIComponent(userId)}/archive-impact`)));
}

export async function fetchDeletePreview(api: ApiClient, userId: string): Promise<MobileDeletePreview> {
  return validated(parseDeletePreview(await api.request<unknown>(`/api/panel/users/${encodeURIComponent(userId)}`)));
}

/** Kalıcı silme: yalnız arşivlenmiş ve korunacak geçmişi olmayan hesapta (kural sunucuda). */
export async function deleteUser(api: ApiClient, userId: string): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export async function fetchOffboardingPreview(api: ApiClient, teacherId: string): Promise<MobileOffboardingPreview> {
  return validated(parseOffboardingPreview(await api.request<unknown>(`/api/panel/users/${encodeURIComponent(teacherId)}/offboarding`)));
}

/** Güvenli devir: gruplar / dersler / koçluk / müdahaleler devredilir, öğretmen askıya alınır. */
export async function executeOffboarding(api: ApiClient, teacherId: string, input: { transferTeacherId: string; transferCoachTeacherId?: string; transferInterventionOwnerId?: string }): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(teacherId)}/offboarding`, { method: 'POST', body: input });
}

/** Akademik düzenleme (ek süre / mola); `expectedVersion` ile, başka yerde değişirse 409. */
export async function saveAccessibility(api: ApiClient, userId: string, input: { expectedVersion: number; assessmentExtraPercent: number; breaksAllowed: boolean }): Promise<void> {
  await api.request(`/api/panel/users/${encodeURIComponent(userId)}/accessibility`, { method: 'PATCH', body: input });
}

export async function linkStudentTeacher(api: ApiClient, input: { studentId: string; teacherId: string; subject: string }): Promise<void> {
  await api.request('/api/panel/student-teachers', { method: 'POST', body: input });
}

export async function unlinkStudentTeacher(api: ApiClient, linkId: string): Promise<void> {
  await api.request('/api/panel/student-teachers', { method: 'DELETE', body: { id: linkId } });
}

function withQuery(path: string, query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

/* ------------------------------------------------------------------ *
 * Veliler ve veli–öğrenci bağlantıları (web `yonetim/veliler`). Yazmalar
 * web ile AYNI `/api/panel/relationships` uçlarından (taze step-up).
 * ------------------------------------------------------------------ */

export type ParentsQuery = { q?: string; durum?: string; sayfa?: number };

export async function fetchParentsPage(api: ApiClient, query: ParentsQuery, signal?: AbortSignal): Promise<MobileParentsPage> {
  return validated(parseParentsPage(await api.request<unknown>(withQuery('/api/panel/admin/parents', query), { signal })));
}

export async function createRelationship(api: ApiClient, input: { parentId: string; studentId: string; relationship?: string; primaryContact: boolean; canViewAcademic: boolean; canViewPayments: boolean }): Promise<void> {
  await api.request('/api/panel/relationships', { method: 'POST', body: input });
}

export async function updateRelationship(api: ApiClient, id: string, relationship: string): Promise<void> {
  await api.request(`/api/panel/relationships/${encodeURIComponent(id)}`, { method: 'PATCH', body: { relationship } });
}

/** Bağlantıyı kaldırır; veli bu öğrencinin verisini bir sonraki istekte göremez. */
export async function removeRelationship(api: ApiClient, id: string): Promise<void> {
  await api.request(`/api/panel/relationships/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ *
 * Öğretmen doluluğu ve yeni kayıtlar.
 * ------------------------------------------------------------------ */

export async function fetchEducators(api: ApiClient, signal?: AbortSignal): Promise<MobileEducators> {
  return validated(parseEducators(await api.request<unknown>('/api/panel/admin/educators', { signal })));
}

export type SignupsQuery = { sekme?: 'kayitlar' | 'cocuklar'; filtre?: string; sayfa?: number };

export async function fetchSignups(api: ApiClient, query: SignupsQuery, signal?: AbortSignal): Promise<MobileSignups> {
  return validated(parseSignups(await api.request<unknown>(withQuery('/api/panel/admin/signups', query), { signal })));
}

/** Yalnız iletişim takibi; hiçbir ürün erişimini açmaz ya da kapatmaz. */
export async function updateSignupContact(api: ApiClient, userId: string, input: { contactStatus: string; contactNote: string }): Promise<void> {
  await api.request(`/api/panel/signups/${encodeURIComponent(userId)}/contact`, { method: 'PATCH', body: input });
}

/** Velinin eklediği çocuk için öğrenci hesabı; yeni hesapta tek kullanımlık davet döner. */
export async function createChildAccount(api: ApiClient, childId: string, input: { email: string; fullName?: string; phone?: string }): Promise<MobileChildAccountResult> {
  return validated(parseChildAccountResult(await api.request<unknown>(`/api/panel/signups/children/${encodeURIComponent(childId)}/account`, { method: 'POST', body: input })));
}

/* ------------------------------------------------------------------ *
 * Öğrenci 360 (web `yonetim/ogrenciler/[id]`), koç atama ve erişim açmayı
 * yeniden deneme (web Server Action'larıyla AYNI servisler).
 * ------------------------------------------------------------------ */

export async function fetchStudent360(api: ApiClient, studentProfileId: string, query: { sekme?: string; gorunum?: string }, signal?: AbortSignal): Promise<MobileStudent360> {
  return validated(parseStudent360(await api.request<unknown>(withQuery(`/api/panel/admin/students/${encodeURIComponent(studentProfileId)}`, query), { signal })));
}

export async function assignCoach(api: ApiClient, input: { studentId: string; coachId: string; cadenceDays?: string; overrideReason?: string; expectedRevision: string }, idempotencyKey: string): Promise<void> {
  await api.request('/api/panel/admin/coach-assignments', { method: 'POST', body: { ...input, idempotencyKey } });
}

export async function retryProvisioning(api: ApiClient, orderId: string, idempotencyKey: string, expectedRevision?: string): Promise<{ succeeded: boolean; message: string }> {
  const revision = expectedRevision ?? validated(parseOrderRetryRevision(await api.request<unknown>(`/api/panel/admin/orders/${encodeURIComponent(orderId)}/provisioning-retry`))).revision;
  const result = validated(parseProvisioningRetry(await api.request<unknown>(`/api/panel/admin/orders/${encodeURIComponent(orderId)}/provisioning-retry`, { method: 'POST', body: { idempotencyKey, expectedRevision: revision } })));
  return { succeeded: result.succeeded, message: result.message };
}
