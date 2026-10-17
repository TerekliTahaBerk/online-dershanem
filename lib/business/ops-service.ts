import "server-only";

import type { Prisma } from "@prisma/client";

import { assertAccountingPeriodOpen, reverseLedgerTransaction } from "@/lib/business/finance";
import { getAdPlatformProvider } from "@/lib/business/providers";
import { reconcileBusinessUnit } from "@/lib/business/reconciliation";
import { resolveMutationUnit, scopedUnitIds, type BusinessAccess } from "@/lib/business/access";
import { BusinessCommandError, runWithReceipt, type CommandExecution } from "./command-receipt";
import { executeGovernance, dryRunGovernance } from "./governance-service";
import type { OpsCommand } from "./ops-commands";

/**
 * İŞLETME PAZARLAMA + FİNANS SERVİSİ (P2.7c). `isletme/actions.ts`
 * içindeki kampanya, reklam, atıf, Meta senkronu, finans işlemi, ters kayıt,
 * dönem kilidi ve mutabakat eylemlerinin iş kuralları buraya OLDUĞU GİBİ
 * taşındı; web eylemleri ve mobil `POST /api/panel/business/ops` aynı
 * fonksiyonu çağırır. Makbuz, atomik audit ve tekrar davranışı ortak
 * çalıştırıcıdan (`runWithReceipt`). Dönem kilidi kontrolü ters kayıt ve yeni
 * işlemde AYNI transaction içinde yapılır.
 */

export type OpsResult = { entityId: string; section: string; summary?: Record<string, number>; dryRunResult?: string };

const fail = (status: 400 | 404 | 409 | 422, code: string, message: string) => new BusinessCommandError(status, code, message);
const unitFor = (access: BusinessAccess, requested: string | undefined) => {
  try {
    return resolveMutationUnit(access, requested);
  } catch (error) {
    throw fail(422, error instanceof Error ? error.message : "BUSINESS_UNIT_REQUIRED", "İş birimi seçin.");
  }
};
const periodLocked = (error: unknown) => error instanceof Error && error.message === "ACCOUNTING_PERIOD_LOCKED";
const LOCKED = () => fail(409, "ACCOUNTING_PERIOD_LOCKED", "Bu tarih kilitli bir muhasebe döneminde; yalnız ters / düzeltme kaydı kullanılabilir.");

async function execute(tx: Prisma.TransactionClient, access: BusinessAccess, command: OpsCommand): Promise<CommandExecution<OpsResult>> {
  const actor = access.session.userId;
  const unitIds = scopedUnitIds(access);
  switch (command.type) {
    case "knowledge.create": case "knowledge.version": case "prompt.create":
    case "automation.create": case "automation.toggle": case "retention.update":
    case "role.assign": case "role.revoke":
      return executeGovernance(tx, access, command);
    case "automation.dry_run": throw new Error("dry-run transaction dışında çalışır");
    case "campaign.create": {
      const unit = unitFor(access, command.businessUnitId);
      const row = await tx.businessCampaign.create({ data: { businessUnitId: unit.id, name: command.name, platform: command.platform, budgetCents: Math.round(command.budgetTl * 100), productInterest: command.productInterest } });
      return { entityType: "BusinessCampaign", entityId: row.id, action: "CAMPAIGN_CREATED", result: { entityId: row.id, section: "kampanyalar" } };
    }
    case "advertisement.create": {
      const campaign = await tx.businessCampaign.findFirst({ where: { id: command.campaignId, businessUnitId: { in: unitIds } } });
      if (!campaign) throw fail(404, "CAMPAIGN_NOT_FOUND", "Kampanya bulunamadı; kaldırılmış ya da değişmiş olabilir.");
      const adSet = await tx.businessAdSet.create({ data: { campaignId: campaign.id, name: command.adSetName } });
      const ad = await tx.businessAdvertisement.create({ data: { adSetId: adSet.id, name: command.name, spentCents: Math.round(command.spentTl * 100), impressions: command.impressions, clicks: command.clicks, messageStarts: command.messageStarts, leadCount: command.leadCount, saleCount: command.saleCount, revenueCents: Math.round(command.revenueTl * 100) } });
      return { entityType: "BusinessAdvertisement", entityId: ad.id, action: "ADVERTISEMENT_CREATED", result: { entityId: ad.id, section: "reklamlar" } };
    }
    case "attribution.manual": {
      const lead = await tx.businessLead.findFirst({ where: { id: command.leadId, businessUnitId: { in: unitIds } } });
      if (!lead) throw fail(404, "LEAD_NOT_FOUND", "Aday bulunamadı; kaldırılmış ya da değişmiş olabilir.");
      if (command.campaignId && !(await tx.businessCampaign.count({ where: { id: command.campaignId, businessUnitId: lead.businessUnitId } }))) throw fail(404, "CAMPAIGN_NOT_FOUND", "Kampanya bulunamadı; kaldırılmış ya da değişmiş olabilir.");
      if (command.advertisementId && !(await tx.businessAdvertisement.count({ where: { id: command.advertisementId, adSet: { campaign: { businessUnitId: lead.businessUnitId } } } }))) throw fail(404, "ADVERTISEMENT_NOT_FOUND", "Reklam bulunamadı; kaldırılmış ya da değişmiş olabilir.");
      await tx.attribution.create({ data: { leadId: lead.id, campaignId: command.campaignId || null, advertisementId: command.advertisementId || null, model: "MANUAL", confidence: 1, isManual: true } });
      return { entityType: "BusinessLead", entityId: lead.id, action: "ATTRIBUTION_MANUALLY_SET", payload: { campaignId: command.campaignId || null, advertisementId: command.advertisementId || null }, result: { entityId: lead.id, section: "adaylar" } };
    }
    case "finance.create": {
      const unit = unitFor(access, command.businessUnitId);
      const at = new Date();
      const transactionAt = command.transactionDate ? new Date(`${command.transactionDate}T00:00:00+03:00`) : at;
      try {
        await assertAccountingPeriodOpen(unit.id, transactionAt, tx);
      } catch (error) {
        if (periodLocked(error)) throw LOCKED();
        throw error;
      }
      const netCents = Math.round(command.amountTl * 100);
      const vatCents = Math.round((netCents * command.vatRate) / (100 + command.vatRate));
      const withholdingCents = Math.round(((netCents - vatCents) * command.withholdingRate) / 100);
      const row = await tx.financialTransaction.create({ data: { businessUnitId: unit.id, source: "MANUAL", idempotencyKey: `manual:${crypto.randomUUID()}`, kind: command.kind, status: "PAID", transactionAt, paidAt: transactionAt, description: command.description, category: command.category, grossCents: netCents, netCents, vatRate: command.vatRate, vatCents, withholdingRate: command.withholdingRate, withholdingCents, commissionCents: Math.round(command.commissionTl * 100), createdById: actor } });
      return { entityType: "FinancialTransaction", entityId: row.id, action: "FINANCIAL_TRANSACTION_CREATED", payload: { kind: row.kind, netCents: row.netCents }, result: { entityId: row.id, section: row.kind === "EXPENSE" ? "giderler" : "gelirler" } };
    }
    case "finance.reverse": {
      const original = await tx.financialTransaction.findFirst({ where: { id: command.transactionId, businessUnitId: { in: unitIds }, cancelledAt: null } });
      if (!original) throw fail(404, "TRANSACTION_NOT_FOUND", "İşlem bulunamadı veya zaten ters kaydedilmiş.");
      try {
        await reverseLedgerTransaction(original.id, actor, tx);
      } catch (error) {
        if (periodLocked(error)) throw LOCKED();
        throw error;
      }
      return { entityType: "FinancialTransaction", entityId: original.id, action: "FINANCIAL_TRANSACTION_REVERSED", result: { entityId: original.id, section: original.kind === "EXPENSE" ? "giderler" : "gelirler" } };
    }
    case "period.lock": {
      const unit = unitFor(access, command.businessUnitId);
      const startsAt = new Date(`${command.startsAt}T00:00:00+03:00`);
      const endsAt = new Date(`${command.endsAt}T23:59:59.999+03:00`);
      if (endsAt < startsAt) throw fail(400, "INVALID_PERIOD", "Dönem bitişi başlangıçtan önce olamaz.");
      const overlap = await tx.accountingPeriod.findFirst({ where: { businessUnitId: unit.id, NOT: { startsAt, endsAt }, startsAt: { lte: endsAt }, endsAt: { gte: startsAt } } });
      if (overlap) throw fail(409, "ACCOUNTING_PERIOD_OVERLAP", "Bu aralık başka bir muhasebe dönemiyle çakışıyor.");
      const period = await tx.accountingPeriod.upsert({ where: { businessUnitId_startsAt_endsAt: { businessUnitId: unit.id, startsAt, endsAt } }, update: { status: "LOCKED", lockedAt: new Date(), lockedById: actor }, create: { businessUnitId: unit.id, startsAt, endsAt, status: "LOCKED", lockedAt: new Date(), lockedById: actor } });
      return { entityType: "AccountingPeriod", entityId: period.id, action: "ACCOUNTING_PERIOD_LOCKED", result: { entityId: period.id, section: "vergiler" } };
    }
    case "reconciliation.resolve": {
      const record = await tx.reconciliationRecord.findFirst({ where: { id: command.id, businessUnitId: { in: unitIds } } });
      if (!record) throw fail(404, "RECONCILIATION_NOT_FOUND", "Mutabakat kaydı bulunamadı; kaldırılmış ya da değişmiş olabilir.");
      await tx.reconciliationRecord.update({ where: { id: record.id }, data: { status: command.status, resolvedAt: new Date(), resolvedById: actor } });
      return { entityType: "ReconciliationRecord", entityId: record.id, action: "RECONCILIATION_RESOLVED", payload: { status: command.status }, result: { entityId: record.id, section: "mutabakat" } };
    }
    case "meta_ads.sync":
    case "reconciliation.run":
      throw new Error(`${command.type} transaction dışında çalışır`);
  }
}

/** Dış servis / tarama: mevcut iş kuralı kendi yazmalarını yapar; makbuz sonra. */
async function outside(access: BusinessAccess, command: Extract<OpsCommand, { type: "meta_ads.sync" | "reconciliation.run" | "automation.dry_run" }>): Promise<CommandExecution<OpsResult>> {
  if (command.type === "automation.dry_run") return dryRunGovernance(access, command);
  if (command.type === "meta_ads.sync") {
    let result: { synced: number };
    try {
      result = await getAdPlatformProvider().syncCampaigns();
    } catch (error) {
      if (error instanceof Error && error.message === "META_ADS_CONFIGURATION_MISSING") throw fail(422, error.message, "Meta Ads entegrasyonu yapılandırılmamış.");
      throw error;
    }
    return { entityType: "IntegrationConnection", entityId: "META_ADS", action: "META_ADS_SYNCED", payload: result, result: { entityId: "META_ADS", section: "entegrasyonlar", summary: result } };
  }
  let scanned = 0;
  let issues = 0;
  for (const unit of access.units) {
    const outcome = await reconcileBusinessUnit(unit.id);
    scanned += outcome.scanned;
    issues += outcome.issues;
  }
  return { entityType: "ReconciliationRecord", entityId: "batch", action: "RECONCILIATION_RUN", payload: { scanned, issues }, result: { entityId: "batch", section: "mutabakat", summary: { scanned, issues } } };
}

export async function runOpsCommand(access: BusinessAccess, command: OpsCommand, options: { idempotencyKey?: string } = {}): Promise<{ result: OpsResult; replayed: boolean }> {
  return runWithReceipt<OpsResult>({
    actorUserId: access.session.userId,
    namespace: "ops",
    idempotencyKey: options.idempotencyKey,
    digestOf: { command },
    ...(command.type === "meta_ads.sync" || command.type === "reconciliation.run" || command.type === "automation.dry_run"
      ? { outside: () => outside(access, command) }
      : { transactional: (tx: Prisma.TransactionClient) => execute(tx, access, command) }),
  });
}


