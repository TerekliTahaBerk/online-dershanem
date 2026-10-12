import "server-only";

import {
  AiMode,
  ConversationStatus,
  LeadSource,
  LeadStage,
  LeadTemperature,
  ProductInterest,
  type Prisma,
} from "@prisma/client";
import type { BusinessAccess } from "@/lib/business/permissions";
import type { BusinessSectionSlug } from "@/lib/business/sections";
import { prisma } from "@/lib/prisma";
import { resolveIstanbulDateRange } from "@/lib/istanbul-time";
import {
  countConversations,
  loadBusinessOverviewKpis,
  loadDeductibleVatCents,
  loadLeadStageCounts,
} from "@/lib/business/queries/overview";
import {
  findDuplicateLeads,
  loadFunnelLeads,
  loadLeadDetail,
  loadLeadWorklist,
  loadSalesOwners,
} from "@/lib/business/queries/leads";
import { loadLeadAnalytics } from "@/lib/business/lead-metrics";
import type { LeadListFocus } from "@/lib/business/leads";
import { loadLeadLifecycleDetail } from "@/lib/lifecycle/lead-detail-server";

export type BusinessSectionQuery = Record<string, string | string[] | undefined>;

/**
 * İŞLETME BÖLÜM VERİSİ (`/panel/yonetim/isletme/[section]`). Sayfadaki
 * yükleyici OLDUĞU GİBİ buraya taşındı: bölüme göre koşullu sorgular, ürün /
 * tarih / aday / gelen kutusu süzgeçleri ve iş birimi kapsamı (`access.units`).
 * Web sayfası ve mobil İşletme ucu (`/api/panel/business/sections/[section]`)
 * AYNI fonksiyonu çağırır. Yetki (bölüm izni) çağırandadır.
 */
export async function loadBusinessSectionData(access: BusinessAccess, section: BusinessSectionSlug, query: BusinessSectionQuery) {
    const product = typeof query.product === "string" ? query.product : "ALL";
    const scopedUnits = access.units.filter(
      (unit) => product === "ALL" || unit.product === product,
    );
    const unitIds = (scopedUnits.length ? scopedUnits : access.units).map(
      (unit) => unit.id,
    );
    const selectedConversation =
      typeof query.conversation === "string" ? query.conversation : undefined;
    const selectedLeadId =
      typeof query.lead === "string" ? query.lead : undefined;
    const messageCursor =
      typeof query.messageCursor === "string" ? query.messageCursor : undefined;
    // Tarih aralığı İstanbul yerel gününe göre çözümlenir; geçersiz/ters/aşırı
    // geniş aralıklar sessizce farklı bir aralığa dönüşmez, `notice` ile bildirilir.
    const {
      from,
      to,
      notice: rangeNotice,
    } = resolveIstanbulDateRange({
      from: query.from,
      to: query.to,
      defaultDays: 30,
      maxDays: 366,
    });
    const conversationCursor =
      typeof query.cursor === "string" ? query.cursor : undefined;
    const needsInbox = section === "mesaj-kutusu" || section === "genel-bakis";
    const needsCampaigns = [
      "genel-bakis",
      "kampanyalar",
      "reklamlar",
      "mesaj-kutusu",
      "adaylar",
    ].includes(section);
    const needsFinance = [
      "genel-bakis",
      "gelirler",
      "giderler",
      "vergiler",
    ].includes(section);
    const leadFocusRaw = typeof query.focus === "string" ? query.focus : "today";
    const leadFocus: LeadListFocus =
      leadFocusRaw === "overdue" ||
      leadFocusRaw === "no_activity" ||
      leadFocusRaw === "all" ||
      leadFocusRaw === "mine"
        ? leadFocusRaw
        : "today";
    const leadStageFilter =
      typeof query.stage === "string" &&
      Object.values(LeadStage).includes(query.stage as LeadStage)
        ? (query.stage as LeadStage)
        : "ALL";
    const leadSourceFilter =
      typeof query.source === "string" &&
      Object.values(LeadSource).includes(query.source as LeadSource)
        ? (query.source as LeadSource)
        : "ALL";
    const leadInterestFilter =
      typeof query.interest === "string" &&
      Object.values(ProductInterest).includes(query.interest as ProductInterest)
        ? (query.interest as ProductInterest)
        : "ALL";
    const leadOwnerFilter = typeof query.owner === "string" ? query.owner : "ALL";
    const leadCampaignFilter =
      typeof query.campaign === "string" ? query.campaign : "ALL";
    const leadQuery = typeof query.q === "string" ? query.q : undefined;
    const inboxWhere: Prisma.BusinessConversationWhereInput = {
      businessUnitId: { in: unitIds },
      ...(section === "genel-bakis"
        ? { lastMessageAt: { gte: from, lte: to } }
        : {}),
      ...(typeof query.status === "string" &&
      Object.values(ConversationStatus).includes(
        query.status as ConversationStatus,
      )
        ? { status: query.status as ConversationStatus }
        : {}),
      ...(query.unread === "1" ? { unreadCount: { gt: 0 } } : {}),
      ...(typeof query.temperature === "string" &&
      Object.values(LeadTemperature).includes(
        query.temperature as LeadTemperature,
      )
        ? { temperature: query.temperature as LeadTemperature }
        : {}),
      ...(typeof query.ai === "string" &&
      Object.values(AiMode).includes(query.ai as AiMode)
        ? { aiMode: query.ai as AiMode }
        : {}),
      ...(typeof query.q === "string" && query.q.trim()
        ? {
            OR: [
              { username: { contains: query.q.trim(), mode: "insensitive" } },
              { displayName: { contains: query.q.trim(), mode: "insensitive" } },
              { instagramScopedUserId: { contains: query.q.trim() } },
            ],
          }
        : {}),
    };
    const needsKpis = section === "genel-bakis" || section === "vergiler";
    const [
      messagesPage,
      conversationsPage,
      selectedDetail,
      campaigns,
      ads,
      transactions,
      reconciliations,
      knowledge,
      rules,
      integrations,
      jobs,
      audit,
      kpis,
      staff,
      periods,
      prompts,
      settingsUnits,
      deductibleVatCents,
      settingsUsers,
      roleAssignments,
      inboxTotal,
      funnelCounts,
      leadWorklist,
      funnelLeads,
      salesOwners,
      leadAnalytics,
    ] = await Promise.all([
      selectedConversation
        ? prisma.businessMessage.findMany({
            where: {
              conversation: {
                id: selectedConversation,
                businessUnitId: { in: unitIds },
              },
            },
            orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
            take: 101,
            ...(messageCursor ? { cursor: { id: messageCursor }, skip: 1 } : {}),
          })
        : Promise.resolve([]),
      needsInbox
        ? prisma.businessConversation.findMany({
            where: inboxWhere,
            include: {
              lead: true,
              messages: { orderBy: { occurredAt: "desc" }, take: 1 },
            },
            orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
            take: 31,
            ...(conversationCursor
              ? { cursor: { id: conversationCursor }, skip: 1 }
              : {}),
          })
        : Promise.resolve([]),
      selectedConversation
        ? prisma.businessConversation.findFirst({
            where: { id: selectedConversation, businessUnitId: { in: unitIds } },
            include: {
              lead: {
                include: {
                  activities: { orderBy: { createdAt: "desc" }, take: 20 },
                  tasks: { orderBy: { createdAt: "desc" }, take: 20 },
                  attributions: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                    include: { campaign: true, advertisement: true },
                  },
                  financialTransactions: {
                    orderBy: { transactionAt: "desc" },
                    take: 10,
                  },
                },
              },
              aiExecutions: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          })
        : Promise.resolve(null),
      needsCampaigns
        ? prisma.businessCampaign.findMany({
            where: { businessUnitId: { in: unitIds } },
            include: { adSets: { include: { advertisements: true } } },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      needsCampaigns
        ? prisma.businessAdvertisement.findMany({
            where: { adSet: { campaign: { businessUnitId: { in: unitIds } } } },
            include: { adSet: { include: { campaign: true } } },
            take: 100,
          })
        : Promise.resolve([]),
      needsFinance
        ? prisma.financialTransaction.findMany({
            where: {
              businessUnitId: { in: unitIds },
              transactionAt: { gte: from, lte: to },
            },
            orderBy: { transactionAt: "desc" },
            take: 500,
          })
        : Promise.resolve([]),
      section === "mutabakat"
        ? prisma.reconciliationRecord.findMany({
            where: { businessUnitId: { in: unitIds } },
            orderBy: { createdAt: "desc" },
            take: 100,
          })
        : Promise.resolve([]),
      section === "ai-bilgi-merkezi"
        ? prisma.knowledgeBaseEntry.findMany({
            where: { businessUnitId: { in: unitIds } },
            orderBy: { updatedAt: "desc" },
            take: 100,
          })
        : Promise.resolve([]),
      section === "otomasyon-kurallari"
        ? prisma.automationRule.findMany({
            where: { businessUnitId: { in: unitIds } },
            include: { executions: { orderBy: { createdAt: "desc" }, take: 5 } },
            orderBy: { updatedAt: "desc" },
            take: 100,
          })
        : Promise.resolve([]),
      section === "entegrasyonlar"
        ? prisma.integrationConnection.findMany({
            where: { businessUnitId: { in: unitIds } },
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
      section === "sistem-kayitlari"
        ? prisma.backgroundJob.findMany({
            where: {
              OR: [{ businessUnitId: { in: unitIds } }, { businessUnitId: null }],
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      section === "sistem-kayitlari"
        ? prisma.auditLog.findMany({
            where: {
              entityType: {
                in: [
                  "BusinessLead",
                  "BusinessConversation",
                  "FinancialTransaction",
                  "InstagramWebhookEvent",
                  "ReconciliationRecord",
                  "AccountingPeriod",
                ],
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      needsKpis
        ? loadBusinessOverviewKpis({ unitIds, from, to })
        : Promise.resolve(null),
      section === "mesaj-kutusu" ||
      section === "adaylar" ||
      section === "satis-hunisi"
        ? prisma.businessRoleAssignment.findMany({
            where: {
              businessUnitId: { in: unitIds },
              role: { in: ["SUPER_ADMIN", "ADMIN", "SALES", "SUPPORT"] },
            },
            include: { user: { select: { id: true, fullName: true } } },
            take: 100,
          })
        : Promise.resolve([]),
      section === "vergiler"
        ? prisma.accountingPeriod.findMany({
            where: { businessUnitId: { in: unitIds } },
            orderBy: { startsAt: "desc" },
            take: 24,
          })
        : Promise.resolve([]),
      section === "ai-bilgi-merkezi"
        ? prisma.aIPromptVersion.findMany({
            where: {
              OR: [{ businessUnitId: { in: unitIds } }, { businessUnitId: null }],
            },
            orderBy: [{ name: "asc" }, { version: "desc" }],
            take: 50,
          })
        : Promise.resolve([]),
      section === "ayarlar"
        ? prisma.businessUnit.findMany({
            where: { id: { in: unitIds } },
            select: { id: true, name: true, retentionDays: true },
          })
        : Promise.resolve([]),
      section === "vergiler"
        ? loadDeductibleVatCents({ unitIds, from, to })
        : Promise.resolve(0),
      section === "ayarlar"
        ? prisma.user.findMany({
            where: { status: "ACTIVE" },
            select: { id: true, fullName: true, email: true },
            orderBy: { fullName: "asc" },
            take: 200,
          })
        : Promise.resolve([]),
      section === "ayarlar"
        ? prisma.businessRoleAssignment.findMany({
            where: { businessUnitId: { in: unitIds } },
            include: {
              user: { select: { fullName: true } },
              businessUnit: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
          })
        : Promise.resolve([]),
      section === "mesaj-kutusu"
        ? countConversations(inboxWhere)
        : Promise.resolve(0),
      section === "satis-hunisi"
        ? loadLeadStageCounts(unitIds)
        : Promise.resolve({} as Record<string, number>),
      section === "adaylar"
        ? loadLeadWorklist(unitIds, {
            focus: leadFocus,
            stage: leadStageFilter,
            ownerId: leadOwnerFilter,
            source: leadSourceFilter,
            campaignId: leadCampaignFilter,
            interest: leadInterestFilter,
            q: leadQuery,
          })
        : Promise.resolve([]),
      section === "satis-hunisi" ? loadFunnelLeads(unitIds) : Promise.resolve([]),
      section === "adaylar" || section === "genel-bakis" || section === "raporlar"
        ? loadSalesOwners(unitIds)
        : Promise.resolve([]),
      section === "genel-bakis" || section === "raporlar"
        ? loadLeadAnalytics({ unitIds, from, to })
        : Promise.resolve(null),
    ]);
    const conversations = conversationsPage.slice(0, 30);
    const nextCursor =
      conversationsPage.length > 30 ? conversationsPage[30].id : null;
    const income = kpis?.incomeCents ?? 0;
    const expense = kpis?.expenseCents ?? 0;
    const selected = selectedDetail;
    const messages = messagesPage.slice(0, 100);
    const nextMessageCursor =
      messagesPage.length > 100 ? messagesPage[100].id : null;
    const orderedMessages = [...messages].reverse();
    const leadDetail =
      section === "adaylar" && selectedLeadId
        ? await loadLeadDetail(selectedLeadId, unitIds)
        : null;
    const leadLifecycleDetail =
      section === "adaylar" && selectedLeadId
        ? await loadLeadLifecycleDetail(selectedLeadId, {
            businessUnitIds: unitIds,
          })
        : null;
    const leadDuplicates = leadDetail
      ? await findDuplicateLeads({
          id: leadDetail.id,
          businessUnitId: leadDetail.businessUnitId,
          normalizedPhone: leadDetail.normalizedPhone,
          normalizedEmail: leadDetail.normalizedEmail,
        })
      : [];
    const ownerOptions = (salesOwners.length ? salesOwners : staff).map(
      (item) => ({
        id: item.user.id,
        fullName: item.user.fullName || "İsimsiz",
      }),
    );
    const uniqueOwners = Array.from(
      new Map(ownerOptions.map((o) => [o.id, o])).values(),
    );
    const ownerNameMap: Record<string, string> = Object.fromEntries(
      uniqueOwners.map((o) => [o.id, o.fullName]),
    );
    const provisioning = leadDetail
      ? {
          odStatus: leadDetail.relatedOdOrderId
            ? ((
                await prisma.odOrder.findFirst({
                  where: { id: leadDetail.relatedOdOrderId },
                  select: { provisioningStatus: true },
                })
              )?.provisioningStatus ?? null)
            : null,
          odkStatus: leadDetail.relatedOdkOrderId
            ? ((
                await prisma.odkOrder.findFirst({
                  where: { id: leadDetail.relatedOdkOrderId },
                  select: { provisioningStatus: true },
                })
              )?.provisioningStatus ?? null)
            : null,
        }
      : undefined;

  return { product, scopedUnits, unitIds, selectedConversation, selectedLeadId, messageCursor, from, to, rangeNotice, conversationCursor, leadFocus, leadStageFilter, leadSourceFilter, leadInterestFilter, leadOwnerFilter, leadCampaignFilter, leadQuery, campaigns, ads, transactions, reconciliations, knowledge, rules, integrations, jobs, audit, kpis, staff, periods, prompts, settingsUnits, deductibleVatCents, settingsUsers, roleAssignments, inboxTotal, funnelCounts, leadWorklist, funnelLeads, salesOwners, leadAnalytics, conversations, nextCursor, income, expense, selected, messages, nextMessageCursor, orderedMessages, leadDetail, leadLifecycleDetail, leadDuplicates, ownerOptions, uniqueOwners, ownerNameMap, provisioning };
}

export type BusinessSectionData = Awaited<ReturnType<typeof loadBusinessSectionData>>;
