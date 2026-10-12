import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { loadBusinessSectionData } from "@/lib/business/section-data-server";
import { BUSINESS_SECTION_SLUGS } from "@/lib/business/sections";
import { BUSINESS_ROLE_PERMISSIONS } from "@/lib/business/permission-matrix";
import type { BusinessAccess } from "@/lib/business/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { toMobileBusinessSection } from "@/lib/mobile/business-views";
import { parseBusinessSection } from "@/lib/mobile-contracts/business";
import { runCrmCommand, CrmError, crmRevision } from "@/lib/business/crm-service";
import { runOpsCommand } from "@/lib/business/ops-service";
import { BusinessCommandError } from "@/lib/business/command-receipt";
import { integration } from "./integration-utils";

/**
 * P2.7a — İşletme bölümlerinin mobil projeksiyonu gerçek Postgres verisiyle:
 * her bölüm sözleşmeye uyar; konuşma / aday detayı web parametreleriyle
 * (`conversation`, `lead`) yüklenir; kapsam dışı iş birimi verisi görünmez.
 */
integration("P2.7a İşletme: 16 bölüm gerçek veriyle sözleşmeye uyar; detaylar ve iş birimi kapsamı", async () => {
  const run = randomUUID().slice(0, 8);
  const user = await db.user.create({ data: { email: `p27-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused", fullName: "P27 Satış" } });
  const existing = await db.businessUnit.findFirst({ where: { product: "OD" } });
  const unit = existing ?? (await db.businessUnit.create({ data: { code: `p27-${run}`, name: "P27 OD", product: "OD" } }));
  const connection = await db.integrationConnection.create({ data: { businessUnitId: unit.id, provider: "INSTAGRAM", displayName: `P27 ${run}`, status: "CONNECTED" } });
  const account = await db.instagramAccount.create({ data: { businessUnitId: unit.id, connectionId: connection.id, externalId: `p27-acc-${run}` } });
  const lead = await db.businessLead.create({ data: { businessUnitId: unit.id, source: "MANUAL", firstName: "Ece", lastName: `P27${run}`, phone: `+90555${run.replace(/\D/g, "0").slice(0, 7).padEnd(7, "0")}`, stage: "QUALIFIED", nextFollowUpAt: new Date(Date.now() - 86_400_000), assignedUserId: user.id } });
  const conversation = await db.businessConversation.create({ data: { businessUnitId: unit.id, instagramAccountId: account.id, instagramScopedUserId: `p27-user-${run}`, displayName: `P27 Konuşma ${run}`, lastMessageAt: new Date(), unreadCount: 2, tags: ["sıcak"] } });
  await db.businessLead.update({ where: { id: lead.id }, data: { conversationId: conversation.id } });
  await db.businessMessage.create({ data: { conversationId: conversation.id, direction: "INBOUND", senderType: "CUSTOMER", status: "RECEIVED", idempotencyKey: `p27-msg-${run}`, occurredAt: new Date(), body: "Fiyat nedir?" } });
  const transaction = await db.financialTransaction.create({ data: { businessUnitId: unit.id, source: "MANUAL", idempotencyKey: `p27-tx-${run}`, kind: "EXPENSE", transactionAt: new Date(), description: `P27 gider ${run}`, category: "Reklam", grossCents: 12000, netCents: 10000, status: "PAID" } });
  await db.businessRoleAssignment.create({ data: { userId: user.id, businessUnitId: unit.id, role: "SUPER_ADMIN" } });

  const session = { userId: user.id, role: "ADMIN", email: user.email, fullName: user.fullName, status: "ACTIVE", mustChangePassword: false, mfaVerifiedAt: new Date(), stepUpAt: null } as unknown as SessionUser;
  const access: BusinessAccess = { session, units: [{ id: unit.id, code: unit.code, name: unit.name, product: unit.product, role: "SUPER_ADMIN" }] };
  const granted = new Set(BUSINESS_ROLE_PERMISSIONS.SUPER_ADMIN);
  const view = async (section: (typeof BUSINESS_SECTION_SLUGS)[number], query: Record<string, string> = {}) => {
    const projected = toMobileBusinessSection({ section, data: await loadBusinessSectionData(access, section, query), units: access.units, granted, query });
    const parsed = parseBusinessSection(JSON.parse(JSON.stringify(projected)));
    assert.ok(parsed.ok, `${section}: ${parsed.ok ? "" : parsed.error}`);
    return projected;
  };
  try {
    for (const section of BUSINESS_SECTION_SLUGS) await view(section);

    const inbox = await view("mesaj-kutusu", { unread: "1" });
    const row = inbox.cards[0].rows.find((item) => item.id === conversation.id);
    assert.deepEqual(row?.target, { kind: "conversation", id: conversation.id });
    assert.equal(row?.badge?.label, "2");
    const thread = await view("mesaj-kutusu", { conversation: conversation.id });
    assert.equal(thread.conversation?.messages[0].body, "Fiyat nedir?");
    assert.equal(thread.conversation?.leadId, lead.id);

    const worklist = await view("adaylar", { focus: "all", q: `P27${run}` });
    assert.ok(worklist.cards[0].rows.some((item) => item.id === lead.id && item.badge?.label === "Gecikti"));
    const detail = await view("adaylar", { lead: lead.id });
    assert.equal(detail.lead?.stageLabel, "Nitelikli");
    assert.equal(detail.lead?.followUp.tone, "critical");
    assert.equal((await view("adaylar", { lead: "yok-boyle-aday" })).notice, "Aday bulunamadı veya erişim dışı.");

    const expenses = await view("giderler");
    assert.ok(expenses.cards[0].rows.some((item) => item.id === transaction.id));
    assert.ok(!(await view("gelirler")).cards[0].rows.some((item) => item.id === transaction.id), "gider gelir listesinde görünmez");

    // Kapsam: başka bir iş birimine erişen kullanıcı bu kayıtları göremez.
    const other: BusinessAccess = { session, units: [{ id: "baska-birim", code: "x", name: "Başka", product: "ODK", role: "SUPER_ADMIN" }] };
    const outside = toMobileBusinessSection({ section: "mesaj-kutusu", data: await loadBusinessSectionData(other, "mesaj-kutusu", { conversation: conversation.id }), units: other.units, granted, query: {} });
    assert.equal(outside.conversation, null);
    assert.ok(!outside.cards[0].rows.some((item) => item.id === conversation.id));
  } finally {
    await db.businessRoleAssignment.deleteMany({ where: { userId: user.id } });
    await db.financialTransaction.deleteMany({ where: { id: transaction.id } });
    await db.businessMessage.deleteMany({ where: { conversationId: conversation.id } });
    await db.leadActivity.deleteMany({ where: { leadId: lead.id } });
    await db.businessLead.deleteMany({ where: { id: lead.id } });
    await db.businessConversation.deleteMany({ where: { id: conversation.id } });
    await db.instagramAccount.deleteMany({ where: { id: account.id } });
    await db.integrationConnection.deleteMany({ where: { id: connection.id } });
    if (!existing) await db.businessUnit.delete({ where: { id: unit.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});

integration("P2.7b CRM komutları: web ile aynı kurallar; işlem anahtarı, revizyon 409, atomik audit, iş birimi kapsamı", async () => {
  const run = randomUUID().slice(0, 8);
  const user = await db.user.create({ data: { email: `p27b-${run}@example.com`, role: "TEACHER", status: "ACTIVE", passwordHash: "unused", fullName: "P27b Satış" } });
  const existing = await db.businessUnit.findFirst({ where: { product: "OD" } });
  const unit = existing ?? (await db.businessUnit.create({ data: { code: `p27b-${run}`, name: "P27b OD", product: "OD" } }));
  const connection = await db.integrationConnection.create({ data: { businessUnitId: unit.id, provider: "INSTAGRAM", displayName: `P27b ${run}` } });
  const account = await db.instagramAccount.create({ data: { businessUnitId: unit.id, connectionId: connection.id, externalId: `p27b-acc-${run}` } });
  const conversation = await db.businessConversation.create({ data: { businessUnitId: unit.id, instagramAccountId: account.id, instagramScopedUserId: `p27b-user-${run}`, unreadCount: 3 } });
  const session = { userId: user.id, role: "TEACHER", email: user.email, fullName: user.fullName } as unknown as SessionUser;
  const access: BusinessAccess = { session, units: [{ id: unit.id, code: unit.code, name: unit.name, product: unit.product, role: "SALES" }] };
  const leadIds: string[] = [];
  try {
    // Aday oluşturma: aynı anahtar eşzamanlı tek aday + tek audit; başka komutta 409.
    const key = randomUUID();
    const create = { type: "lead.create" as const, firstName: `P27b${run}`, phone: "+905551234567", productInterest: "ONLINE_DERSHANEM" as const };
    const created = await Promise.all([runCrmCommand(access, create, { idempotencyKey: key }), runCrmCommand(access, create, { idempotencyKey: key })]);
    assert.equal(created.filter((item) => item.replayed).length, 1);
    const leadId = created[0].result.entityId;
    leadIds.push(leadId);
    assert.equal(await db.businessLead.count({ where: { firstName: `P27b${run}` } }), 1);
    assert.equal(await db.auditLog.count({ where: { actorUserId: user.id, action: "LEAD_CREATED" } }), 1);
    await assert.rejects(runCrmCommand(access, { ...create, firstName: "Başka" }, { idempotencyKey: key }), (error) => error instanceof CrmError && error.code === "IDEMPOTENCY_REUSE");

    // Aşama: kayıp nedeni olmadan LOST 422; revizyonla ilerler; eski revizyon 409.
    let lead = await db.businessLead.findUniqueOrThrow({ where: { id: leadId } });
    await assert.rejects(runCrmCommand(access, { type: "lead.stage", leadId, stage: "LOST" }, { expectedRevision: crmRevision(lead) }), (error) => error instanceof CrmError && error.code === "LOST_REASON_REQUIRED");
    const stale = crmRevision(lead);
    const staged = await runCrmCommand(access, { type: "lead.stage", leadId, stage: "QUALIFIED" }, { idempotencyKey: randomUUID(), expectedRevision: stale });
    assert.equal(staged.result.lead?.stage, "QUALIFIED");
    await assert.rejects(runCrmCommand(access, { type: "lead.priority", leadId, priority: "HIGH" }, { idempotencyKey: randomUUID(), expectedRevision: stale }), (error) => error instanceof CrmError && error.code === "CRM_CONFLICT");
    lead = await db.businessLead.findUniqueOrThrow({ where: { id: leadId } });
    await runCrmCommand(access, { type: "lead.priority", leadId, priority: "HIGH" }, { expectedRevision: crmRevision(lead) });

    // Not, görev, görev tamamlama, takip, sorumlu.
    await runCrmCommand(access, { type: "lead.note", leadId, note: "Akşam aranacak" });
    const due = new Date(Date.now() + 86_400_000).toISOString();
    await runCrmCommand(access, { type: "lead.task", leadId, title: "Geri ara", dueAt: due });
    const task = await db.leadTask.findFirstOrThrow({ where: { leadId } });
    await runCrmCommand(access, { type: "lead.task_complete", taskId: task.id });
    assert.ok((await db.leadTask.findUniqueOrThrow({ where: { id: task.id } })).completedAt);
    lead = await db.businessLead.findUniqueOrThrow({ where: { id: leadId } });
    await runCrmCommand(access, { type: "lead.follow_up", leadId, nextFollowUpAt: due, taskTitle: "Takip görüşmesi" }, { expectedRevision: crmRevision(lead) });
    lead = await db.businessLead.findUniqueOrThrow({ where: { id: leadId } });
    assert.equal(lead.nextFollowUpAt?.toISOString(), due);
    await runCrmCommand(access, { type: "lead.owner", leadId, assignedUserId: "" }, { expectedRevision: crmRevision(lead) });
    assert.equal((await db.businessLead.findUniqueOrThrow({ where: { id: leadId } })).assignedUserId, null);
    const types = (await db.leadActivity.findMany({ where: { leadId }, select: { type: true } })).map((item) => item.type);
    for (const type of ["LEAD_CREATED", "STAGE_CHANGED", "NOTE", "FOLLOW_UP_SCHEDULED", "OWNER_CHANGED"]) assert.ok(types.includes(type as never), type);

    // Birleştirme: aynı telefonla ikinci aday öneri taşır; kaynak SPAM olur.
    const dup = await runCrmCommand(access, { ...create, firstName: `P27b${run}-iki` });
    leadIds.push(dup.result.entityId);
    const duplicate = await db.businessLead.findUniqueOrThrow({ where: { id: dup.result.entityId } });
    assert.equal((duplicate.matchSuggestion as { leadId: string }).leadId, leadId);
    const target = await db.businessLead.findUniqueOrThrow({ where: { id: leadId } });
    await runCrmCommand(access, { type: "lead.merge", sourceId: duplicate.id, targetId: leadId }, { expectedRevision: crmRevision(target) });
    assert.equal((await db.businessLead.findUniqueOrThrow({ where: { id: duplicate.id } })).stage, "SPAM");
    await assert.rejects(runCrmCommand(access, { type: "lead.link_order", leadId, product: "OD", orderId: "cjld2cjxh0000qzrmn831i7rn" }), (error) => error instanceof CrmError && error.code === "ORDER_NOT_FOUND");

    // Konuşma: okundu, etiket, atama, denetim; AI kapalıyken öneri sessizce geçer.
    await runCrmCommand(access, { type: "conversation.read", conversationId: conversation.id });
    await runCrmCommand(access, { type: "conversation.tag", conversationId: conversation.id, tag: "sıcak" });
    let current = await db.businessConversation.findUniqueOrThrow({ where: { id: conversation.id } });
    assert.equal(current.unreadCount, 0);
    assert.deepEqual(current.tags, ["sıcak"]);
    await runCrmCommand(access, { type: "conversation.control", conversationId: conversation.id, aiMode: "OFF", status: "WAITING_HUMAN" }, { expectedRevision: crmRevision(current) });
    current = await db.businessConversation.findUniqueOrThrow({ where: { id: conversation.id } });
    assert.equal(current.status, "WAITING_HUMAN");
    assert.equal(current.assignedUserId, user.id, "web ile aynı: denetimi değiştiren kişi sorumlu olur");
    await runCrmCommand(access, { type: "conversation.ai_suggest", conversationId: conversation.id });

    // Kapsam: başka iş birimine erişen kullanıcı bu kayıtları değiştiremez.
    const other: BusinessAccess = { session, units: [{ id: "baska-birim", code: "x", name: "Başka", product: "ODK", role: "SALES" }] };
    await assert.rejects(runCrmCommand(other, { type: "lead.note", leadId, note: "sızma" }), (error) => error instanceof CrmError && error.status === 404);
    await assert.rejects(runCrmCommand(other, { type: "conversation.read", conversationId: conversation.id }), (error) => error instanceof CrmError && error.status === 404);
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: user.id } });
    await db.leadTask.deleteMany({ where: { leadId: { in: leadIds } } });
    await db.leadActivity.deleteMany({ where: { leadId: { in: leadIds } } });
    await db.businessLead.deleteMany({ where: { id: { in: leadIds } } });
    await db.businessConversation.deleteMany({ where: { id: conversation.id } });
    await db.instagramAccount.deleteMany({ where: { id: account.id } });
    await db.integrationConnection.deleteMany({ where: { id: connection.id } });
    if (!existing) await db.businessUnit.delete({ where: { id: unit.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});

integration("P2.7c pazarlama + finans: web kurallarıyla kampanya, reklam, atıf, finans kaydı, dönem kilidi, ters kayıt, mutabakat çözümü", async () => {
  const run = randomUUID().slice(0, 8);
  const user = await db.user.create({ data: { email: `p27c-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused", fullName: "P27c Muhasebe" } });
  const existing = await db.businessUnit.findFirst({ where: { product: "OD" } });
  const unit = existing ?? (await db.businessUnit.create({ data: { code: `p27c-${run}`, name: "P27c OD", product: "OD" } }));
  const session = { userId: user.id, role: "ADMIN", email: user.email, fullName: user.fullName } as unknown as SessionUser;
  const access: BusinessAccess = { session, units: [{ id: unit.id, code: unit.code, name: unit.name, product: unit.product, role: "SUPER_ADMIN" }] };
  const lead = await db.businessLead.create({ data: { businessUnitId: unit.id, source: "MANUAL", firstName: `P27c${run}` } });
  // Kilitlenecek dönem: geçmişte, başka verilerle çakışmayacak bir gün.
  const day = `2001-0${1 + (parseInt(run.slice(0, 2), 16) % 9)}-1${parseInt(run.slice(2, 3), 16) % 9}`;
  const created: { campaignId?: string; txIds: string[]; periodId?: string; recordId?: string } = { txIds: [] };
  try {
    const key = randomUUID();
    const campaign = { type: "campaign.create" as const, name: `P27c Kampanya ${run}`, platform: "INSTAGRAM", budgetTl: 1500.5, productInterest: "ONLINE_DERSHANEM" as const };
    const results = await Promise.all([runOpsCommand(access, campaign, { idempotencyKey: key }), runOpsCommand(access, campaign, { idempotencyKey: key })]);
    assert.equal(results.filter((item) => item.replayed).length, 1);
    created.campaignId = results[0].result.entityId;
    assert.equal((await db.businessCampaign.findUniqueOrThrow({ where: { id: created.campaignId } })).budgetCents, 150050);
    await assert.rejects(runOpsCommand(access, { ...campaign, name: "başka" }, { idempotencyKey: key }), (error) => error instanceof BusinessCommandError && error.code === "IDEMPOTENCY_REUSE");

    const ad = await runOpsCommand(access, { type: "advertisement.create", campaignId: created.campaignId, adSetName: "Set A", name: "Reklam A", spentTl: 100, impressions: 1000, clicks: 50, messageStarts: 5, leadCount: 2, saleCount: 1, revenueTl: 300 });
    await runOpsCommand(access, { type: "attribution.manual", leadId: lead.id, campaignId: created.campaignId, advertisementId: ad.result.entityId });
    assert.equal(await db.attribution.count({ where: { leadId: lead.id, isManual: true } }), 1);
    await assert.rejects(runOpsCommand(access, { type: "advertisement.create", campaignId: "cjld2cjxh0000qzrmn831i7rn", adSetName: "x1", name: "x1", spentTl: 0, impressions: 0, clicks: 0, messageStarts: 0, leadCount: 0, saleCount: 0, revenueTl: 0 }), (error) => error instanceof BusinessCommandError && error.code === "CAMPAIGN_NOT_FOUND");

    // Finans: KDV dahil tutardan KDV ayrıştırılır (web formülü).
    const income = await runOpsCommand(access, { type: "finance.create", kind: "MANUAL_INCOME", description: `P27c gelir ${run}`, category: "Satış", amountTl: 120, vatRate: 20, withholdingRate: 0, commissionTl: 0, transactionDate: day });
    created.txIds.push(income.result.entityId);
    assert.equal(income.result.section, "gelirler");
    const row = await db.financialTransaction.findUniqueOrThrow({ where: { id: income.result.entityId } });
    assert.equal(row.netCents, 12000);
    assert.equal(row.vatCents, 2000);

    // Dönem kilidi: kilitli tarihe yeni kayıt 409; ters kayıt bugünün açık döneminde yapılır.
    const period = await runOpsCommand(access, { type: "period.lock", startsAt: day, endsAt: day });
    created.periodId = period.result.entityId;
    await assert.rejects(runOpsCommand(access, { type: "finance.create", kind: "EXPENSE", description: "kilitli", category: "Gider", amountTl: 10, vatRate: 0, withholdingRate: 0, commissionTl: 0, transactionDate: day }), (error) => error instanceof BusinessCommandError && error.code === "ACCOUNTING_PERIOD_LOCKED");
    await assert.rejects(runOpsCommand(access, { type: "period.lock", startsAt: day, endsAt: "2000-01-01" }), (error) => error instanceof BusinessCommandError && error.code === "INVALID_PERIOD");
    const reversed = await runOpsCommand(access, { type: "finance.reverse", transactionId: income.result.entityId });
    assert.equal(reversed.result.section, "gelirler");
    const reversal = await db.financialTransaction.findUniqueOrThrow({ where: { idempotencyKey: `reversal:${income.result.entityId}` } });
    created.txIds.push(reversal.id);
    assert.equal(reversal.netCents, -12000);
    await assert.rejects(runOpsCommand(access, { type: "finance.reverse", transactionId: income.result.entityId }), (error) => error instanceof BusinessCommandError && error.code === "TRANSACTION_NOT_FOUND");

    const record = await db.reconciliationRecord.create({ data: { businessUnitId: unit.id, provider: "PAYTR", externalId: `p27c-${run}`, expectedCents: 100, actualCents: 90, status: "UNMATCHED" } });
    created.recordId = record.id;
    await runOpsCommand(access, { type: "reconciliation.resolve", id: record.id, status: "MANUALLY_MATCHED" });
    assert.equal((await db.reconciliationRecord.findUniqueOrThrow({ where: { id: record.id } })).status, "MANUALLY_MATCHED");
    for (const action of ["CAMPAIGN_CREATED", "ADVERTISEMENT_CREATED", "ATTRIBUTION_MANUALLY_SET", "FINANCIAL_TRANSACTION_CREATED", "ACCOUNTING_PERIOD_LOCKED", "FINANCIAL_TRANSACTION_REVERSED", "RECONCILIATION_RESOLVED"]) {
      assert.equal(await db.auditLog.count({ where: { actorUserId: user.id, action } }), 1, action);
    }

    // Kapsam: başka iş birimine erişen kullanıcı bu kayıtlara dokunamaz.
    const other: BusinessAccess = { session, units: [{ id: "baska-birim", code: "x", name: "Başka", product: "ODK", role: "SUPER_ADMIN" }] };
    await assert.rejects(runOpsCommand(other, { type: "reconciliation.resolve", id: record.id, status: "CORRECTED" }), (error) => error instanceof BusinessCommandError && error.status === 404);
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: user.id } });
    if (created.recordId) await db.reconciliationRecord.delete({ where: { id: created.recordId } });
    await db.financialTransaction.deleteMany({ where: { id: { in: created.txIds } } });
    if (created.periodId) await db.accountingPeriod.delete({ where: { id: created.periodId } });
    await db.attribution.deleteMany({ where: { leadId: lead.id } });
    if (created.campaignId) {
      await db.businessAdvertisement.deleteMany({ where: { adSet: { campaignId: created.campaignId } } });
      await db.businessAdSet.deleteMany({ where: { campaignId: created.campaignId } });
      await db.businessCampaign.delete({ where: { id: created.campaignId } });
    }
    await db.businessLead.delete({ where: { id: lead.id } });
    if (!existing) await db.businessUnit.delete({ where: { id: unit.id } });
    await db.user.delete({ where: { id: user.id } });
  }
});
