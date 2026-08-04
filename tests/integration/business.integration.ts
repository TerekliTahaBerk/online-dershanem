import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { persistInstagramEvent, processBackgroundJobs, sendConversationMessage } from "../../lib/business/jobs";
import type { NormalizedInstagramEvent } from "../../lib/business/instagram";
import { assertAccountingPeriodOpen, reverseLedgerTransaction, upsertOrderLedger } from "../../lib/business/finance";
import { reconcileBusinessUnit } from "../../lib/business/reconciliation";
import { executeAutomations } from "../../lib/business/automation";
import { applyBusinessRetention } from "../../lib/business/retention";

const enabled = process.env.BUSINESS_INTEGRATION_TEST === "true";
const runId = crypto.randomUUID();
const integration = (name: string, fn: () => Promise<void>) => test(name, { skip: !enabled }, fn);

integration("Instagram webhook duplicate olmadan inbox, lead ve mesaj oluşturur", async () => {
  process.env.INSTAGRAM_AI_ENABLED = "false";
  const event: NormalizedInstagramEvent = { eventKind: "MESSAGE", providerEventId: `integration-mid-${runId}`, accountExternalId: `integration-account-${runId}`, senderId: `integration-customer-${runId}`, recipientId: `integration-account-${runId}`, occurredAt: new Date(), text: "Merhaba", mediaMetadata: null, referral: null, isEcho: false, relatedMessageIds: [] };
  const payload = event as unknown as Prisma.InputJsonValue;
  await Promise.all([persistInstagramEvent(event, payload), persistInstagramEvent(event, payload)]);
  await processBackgroundJobs(10);
  const [events, messages, lead] = await Promise.all([
    prisma.instagramWebhookEvent.count({ where: { providerEventId: event.providerEventId } }),
    prisma.businessMessage.count({ where: { externalId: event.providerEventId } }),
    prisma.businessLead.findFirst({ where: { instagramScopedId: event.senderId } }),
  ]);
  assert.equal(events, 1); assert.equal(messages, 1); assert.ok(lead);
  await prisma.automationRule.create({ data: { businessUnitId: lead!.businessUnitId, name: `Hot lead ${runId}`, triggerType: "HOT_LEAD", conditions: { temperature: "HOT" }, actions: [{ type: "ADD_TAG", tag: "otomatik-sicak" }] } });
  await executeAutomations("HOT_LEAD", { businessUnitId: lead!.businessUnitId, entityType: "lead", entityId: lead!.id, leadId: lead!.id, temperature: "HOT" });
  assert.ok((await prisma.businessLead.findUniqueOrThrow({ where: { id: lead!.id } })).tags.includes("otomatik-sicak"));
  assert.equal(await prisma.automationExecution.count({ where: { rule: { name: `Hot lead ${runId}` }, result: "SUCCEEDED" } }), 1);
  const conversation = await prisma.businessConversation.findFirstOrThrow({ where: { instagramScopedUserId: event.senderId } });
  const sentId = await sendConversationMessage({ conversationId: conversation.id, text: "Merhaba, nasıl yardımcı olabilirim?", senderType: "HUMAN", idempotencyKey: `integration-manual-reply-${runId}` });
  assert.equal((await prisma.businessMessage.findUniqueOrThrow({ where: { id: sentId } })).status, "SENT");
});

integration("ODK ödeme ledger entegrasyonu idempotenttir, mutabakat ve ters kayıt çalışır", async () => {
  const pack = await prisma.odkPackage.upsert({ where: { slug: `integration-package-${runId}` }, update: {}, create: { title: "Integration", slug: `integration-package-${runId}`, priceCents: 12000 } });
  const order = await prisma.odkOrder.create({ data: { id: `integration-order-${runId}`, packageId: pack.id, status: "PAID", subtotalCents: 12000, totalCents: 12000, buyerInfo: { email: `integration-${runId}@example.com` } } });
  await prisma.odkPayment.create({ data: { id: `integration-payment-${runId}`, orderId: order.id, provider: "PAYTR", providerRef: `integration-ref-${runId}`, status: "SUCCEEDED", amountCents: 12000, paidAt: new Date() } });
  for (let index = 0; index < 2; index++) await prisma.$transaction((tx) => upsertOrderLedger(tx, { source: "ONLINE_DENEME_KULUBU", orderId: order.id, totalCents: 12000, discountCents: 0, description: "Integration ODK", paidAt: new Date(), paymentMethod: "PAYTR", buyerInfo: order.buyerInfo }));
  const rows = await prisma.financialTransaction.findMany({ where: { idempotencyKey: `order:ODK:${order.id}:sale` } }); assert.equal(rows.length, 1);
  const unit = await prisma.businessUnit.findUniqueOrThrow({ where: { product: "ODK" } }); const result = await reconcileBusinessUnit(unit.id); assert.ok(result.scanned >= 1);
  const reversal = await reverseLedgerTransaction(rows[0].id); assert.equal(reversal.netCents, -12000);
  assert.equal((await prisma.financialTransaction.findUniqueOrThrow({ where: { id: rows[0].id } })).status, "CANCELLED");
});

integration("kilitli muhasebe dönemi yeni kaydı reddeder", async () => {
  const unit = await prisma.businessUnit.findUniqueOrThrow({ where: { product: "OD" } }); const at = new Date("2026-01-15T12:00:00Z");
  await prisma.accountingPeriod.upsert({ where: { businessUnitId_startsAt_endsAt: { businessUnitId: unit.id, startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2026-01-31T23:59:59Z") } }, update: { status: "LOCKED" }, create: { businessUnitId: unit.id, startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2026-01-31T23:59:59Z"), status: "LOCKED", lockedAt: new Date() } });
  await assert.rejects(() => assertAccountingPeriodOpen(unit.id, at), /ACCOUNTING_PERIOD_LOCKED/);
});

integration("KVKK saklama işi kapalı eski konuşma ve lead PII'sini anonimleştirir", async () => {
  const unit = await prisma.businessUnit.findUniqueOrThrow({ where: { product: "OD" } }); await prisma.businessUnit.update({ where: { id: unit.id }, data: { retentionDays: 30 } });
  const connection = await prisma.integrationConnection.upsert({ where: { businessUnitId_provider_displayName: { businessUnitId: unit.id, provider: "INSTAGRAM", displayName: "Retention test" } }, update: {}, create: { businessUnitId: unit.id, provider: "INSTAGRAM", displayName: "Retention test" } });
  const account = await prisma.instagramAccount.create({ data: { businessUnitId: unit.id, connectionId: connection.id, externalId: `retention-account-${runId}` } });
  const conversation = await prisma.businessConversation.create({ data: { businessUnitId: unit.id, instagramAccountId: account.id, instagramScopedUserId: `retention-user-${runId}`, displayName: "Silinecek Kişi", status: "CLOSED", lastMessageAt: new Date("2020-01-01") } });
  const lead = await prisma.businessLead.create({ data: { businessUnitId: unit.id, conversationId: conversation.id, source: "INSTAGRAM_ORGANIC", firstName: "Silinecek", phone: "05551234567", normalizedPhone: "+905551234567", tags: [] } });
  const message = await prisma.businessMessage.create({ data: { conversationId: conversation.id, direction: "INBOUND", senderType: "CUSTOMER", body: "Kişisel mesaj", status: "RECEIVED", idempotencyKey: `retention-message-${runId}`, occurredAt: new Date("2020-01-01") } });
  const result = await applyBusinessRetention(new Date("2026-08-04")); assert.equal(result.conversations, 1);
  assert.equal((await prisma.businessMessage.findUniqueOrThrow({ where: { id: message.id } })).body, null); assert.equal((await prisma.businessLead.findUniqueOrThrow({ where: { id: lead.id } })).phone, null);
});

test.after(async () => { await prisma.$disconnect(); });
