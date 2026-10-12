import { parseBusinessSection, type MobileBusinessSection } from '@contracts/business';

import type { ApiClient } from './client';
import { ApiError } from './errors';

/**
 * İşletme (P2.7) okumaları — web `isletme/[section]` ile AYNI yükleyici ve
 * sorgu parametreleri. Yetki her istekte sunucuda (`BusinessRoleAssignment`);
 * yetkisiz bölüm 404 döner.
 */
export type BusinessQuery = Record<string, string | undefined>;

export async function fetchBusinessSection(api: ApiClient, slug: string, query: BusinessQuery, signal?: AbortSignal): Promise<MobileBusinessSection> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '' && value !== 'ALL') params.set(key, value);
  const suffix = params.toString();
  const result = parseBusinessSection(await api.request<unknown>(`/api/panel/business/sections/${encodeURIComponent(slug)}${suffix ? `?${suffix}` : ''}`, { signal }));
  if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
  return result.value;
}

/* ------------------------------------------------------------------ *
 * P2.7b CRM yazmaları — web Server Action'larıyla AYNI servis
 * (`POST /api/panel/business/crm`). Kaydı değiştiren komutlar ekrandaki
 * revizyonu taşır; eski görünüm 409 döner (üzerine yazılmaz).
 * ------------------------------------------------------------------ */

export type CrmCommandInput =
  | { type: 'conversation.control'; conversationId: string; aiMode: string; status: string }
  | { type: 'conversation.read'; conversationId: string }
  | { type: 'conversation.assign'; conversationId: string; assignedUserId: string }
  | { type: 'conversation.tag'; conversationId: string; tag: string }
  | { type: 'conversation.ai_suggest'; conversationId: string }
  | { type: 'lead.create'; businessUnitId?: string; firstName: string; phone?: string; email?: string; productInterest: string }
  | { type: 'lead.stage'; leadId: string; stage: string; lostReasonCode?: string; lostReasonDetail?: string }
  | { type: 'lead.note'; leadId: string; note: string }
  | { type: 'lead.task'; leadId: string; title: string; dueAt?: string }
  | { type: 'lead.task_complete'; taskId: string }
  | { type: 'lead.follow_up'; leadId: string; nextFollowUpAt: string; note?: string; taskTitle?: string }
  | { type: 'lead.owner'; leadId: string; assignedUserId: string }
  | { type: 'lead.priority'; leadId: string; priority: string }
  | { type: 'lead.duplicate_dismiss'; leadId: string }
  | { type: 'lead.merge'; sourceId: string; targetId: string }
  | { type: 'lead.link_order'; leadId: string; product: 'OD' | 'ODK'; orderId: string }
  | { type: 'lead.link_lifecycle'; leadId: string; userId?: string; force?: boolean };

export async function runCrm(api: ApiClient, command: CrmCommandInput, context: { idempotencyKey: string; expectedRevision?: string }): Promise<void> {
  await api.request('/api/panel/business/crm', { method: 'POST', body: { command, idempotencyKey: context.idempotencyKey, ...(context.expectedRevision ? { expectedRevision: context.expectedRevision } : {}) } });
}

/** Instagram yanıtı: mevcut gönderim ucu (kuyruğa alınır; teslim durumu mesajda görünür). */
export async function sendBusinessReply(api: ApiClient, conversationId: string, text: string, idempotencyKey: string): Promise<void> {
  await api.request('/api/integrations/instagram/send', { method: 'POST', body: { conversationId, text, idempotencyKey: `human:${conversationId}:${idempotencyKey}` } });
}

/* ------------------------------------------------------------------ *
 * P2.7c pazarlama + finans — web Server Action'larıyla AYNI servis
 * (`POST /api/panel/business/ops`). Finans kaydı, ters kayıt ve dönem kilidi
 * sunucuda taze step-up ister (428 → native doğrulama → aynı anahtarla tekrar).
 * ------------------------------------------------------------------ */

export type OpsCommandInput =
  | { type: 'campaign.create'; businessUnitId?: string; name: string; platform: string; budgetTl: number; productInterest: string }
  | { type: 'advertisement.create'; campaignId: string; adSetName: string; name: string; spentTl: number; impressions: number; clicks: number; messageStarts: number; leadCount: number; saleCount: number; revenueTl: number }
  | { type: 'attribution.manual'; leadId: string; campaignId: string; advertisementId: string }
  | { type: 'meta_ads.sync' }
  | { type: 'finance.create'; businessUnitId?: string; kind: 'MANUAL_INCOME' | 'EXPENSE'; description: string; category: string; amountTl: number; vatRate: number; withholdingRate: number; commissionTl: number; transactionDate?: string }
  | { type: 'finance.reverse'; transactionId: string }
  | { type: 'period.lock'; businessUnitId?: string; startsAt: string; endsAt: string }
  | { type: 'reconciliation.run' }
  | { type: 'reconciliation.resolve'; id: string; status: 'MANUALLY_MATCHED' | 'CORRECTED' };

export type OpsOutcome = { result: { entityId: string; section: string; summary?: Record<string, number> }; replayed: boolean };

export async function runOps(api: ApiClient, command: OpsCommandInput, idempotencyKey: string): Promise<OpsOutcome> {
  return api.request<OpsOutcome>('/api/panel/business/ops', { method: 'POST', body: { command, idempotencyKey } });
}
