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
