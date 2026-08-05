import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.odkPackage.upsert({
    where: { slug: "tyt-deneme-kulubu" },
    update: { title: "TYT Deneme Kulübü", priceCents: 149900, isActive: true },
    create: {
      title: "TYT Deneme Kulübü", slug: "tyt-deneme-kulubu",
      description: "Online deneme paketi", priceCents: 149900,
      originalPriceCents: 199900, durationDays: 90, isActive: true, isFeatured: true,
    },
  });
  console.log("Public ürün kataloğu hazırlandı.");

  const od = await prisma.businessUnit.upsert({ where: { product: "OD" }, update: { name: "OnlineDershanem", isActive: true }, create: { code: "OD", name: "OnlineDershanem", product: "OD" } });
  const odk = await prisma.businessUnit.upsert({ where: { product: "ODK" }, update: { name: "OnlineDenemeKulübü", isActive: true }, create: { code: "ODK", name: "OnlineDenemeKulübü", product: "ODK" } });
  await Promise.all([
    prisma.expenseCategory.upsert({ where: { businessUnitId_code: { businessUnitId: od.id, code: "ADVERTISING" } }, update: {}, create: { businessUnitId: od.id, code: "ADVERTISING", name: "Reklam" } }),
    prisma.expenseCategory.upsert({ where: { businessUnitId_code: { businessUnitId: od.id, code: "SOFTWARE" } }, update: {}, create: { businessUnitId: od.id, code: "SOFTWARE", name: "Yazılım" } }),
    prisma.taxProfile.upsert({ where: { businessUnitId_name: { businessUnitId: od.id, name: "Varsayılan" } }, update: {}, create: { businessUnitId: od.id, name: "Varsayılan", vatRate: 20, isDefault: true } }),
    prisma.taxProfile.upsert({ where: { businessUnitId_name: { businessUnitId: odk.id, name: "Varsayılan" } }, update: {}, create: { businessUnitId: odk.id, name: "Varsayılan", vatRate: 20, isDefault: true } }),
    prisma.knowledgeBaseEntry.upsert({ where: { id: "demo-kb-registration" }, update: {}, create: { id: "demo-kb-registration", businessUnitId: od.id, title: "Kayıt süreci", category: "REGISTRATION", productInterest: "ONLINE_DERSHANEM", content: "Güncel paket seçildikten sonra güvenli ödeme ekranı kullanılır. Ödeme onayı sistem tarafından doğrulanır.", source: "Site içeriği" } }),
  ]);
  if (process.env.NODE_ENV !== "production") {
    const connection = await prisma.integrationConnection.upsert({ where: { businessUnitId_provider_displayName: { businessUnitId: od.id, provider: "INSTAGRAM", displayName: "Demo Instagram" } }, update: {}, create: { businessUnitId: od.id, provider: "INSTAGRAM", displayName: "Demo Instagram", status: "CONNECTED", config: { mock: true } } });
    const account = await prisma.instagramAccount.upsert({ where: { externalId: "demo_instagram_account" }, update: {}, create: { businessUnitId: od.id, connectionId: connection.id, externalId: "demo_instagram_account", username: "onlinedershanem_demo", aiMode: "SUGGESTION" } });
    const conversation = await prisma.businessConversation.upsert({ where: { instagramAccountId_instagramScopedUserId: { instagramAccountId: account.id, instagramScopedUserId: "demo_customer_1" } }, update: {}, create: { businessUnitId: od.id, instagramAccountId: account.id, instagramScopedUserId: "demo_customer_1", username: "demo_ogrenci", displayName: "Demo Öğrenci", status: "OPEN", temperature: "HOT", unreadCount: 1, productInterest: "ONLINE_DERSHANEM" } });
    await prisma.businessMessage.upsert({ where: { idempotencyKey: "seed:demo-message-1" }, update: {}, create: { conversationId: conversation.id, externalId: "demo_mid_1", direction: "INBOUND", senderType: "CUSTOMER", body: "TYT paketleri hakkında bilgi alabilir miyim?", status: "RECEIVED", idempotencyKey: "seed:demo-message-1", occurredAt: new Date() } });
    await prisma.businessMessage.upsert({ where: { idempotencyKey: "seed:demo-message-ai" }, update: {}, create: { conversationId: conversation.id, direction: "OUTBOUND", senderType: "AI", body: "Elbette. Hangi sınıf seviyesindesiniz?", status: "SENT", idempotencyKey: "seed:demo-message-ai", occurredAt: new Date(Date.now()-60_000) } });
    await prisma.businessMessage.upsert({ where: { idempotencyKey: "seed:demo-message-human" }, update: {}, create: { conversationId: conversation.id, direction: "OUTBOUND", senderType: "HUMAN", body: "Size uygun seçenekleri birlikte inceleyebiliriz.", status: "SENT", idempotencyKey: "seed:demo-message-human", occurredAt: new Date() } });
    const hotLead = await prisma.businessLead.upsert({ where: { conversationId: conversation.id }, update: {}, create: { businessUnitId: od.id, conversationId: conversation.id, instagramScopedId: "demo_customer_1", firstName: "Demo", source: "INSTAGRAM_ORGANIC", temperature: "HOT", productInterest: "ONLINE_DERSHANEM", stage: "QUALIFIED", tags: ["tyt"] } });
    await prisma.businessLead.upsert({ where: { id: "demo-warm-lead" }, update: {}, create: { id: "demo-warm-lead", businessUnitId: odk.id, firstName: "Ilık Demo", source: "ODK_WEB_FORM", temperature: "WARM", productInterest: "ONLINE_DENEME_KULUBU", stage: "CONTACTED", tags: ["tyt"] } });
    await prisma.businessLead.upsert({ where: { id: "demo-cold-lead" }, update: {}, create: { id: "demo-cold-lead", businessUnitId: od.id, firstName: "Soğuk Demo", source: "MANUAL", temperature: "COLD", stage: "NEW", tags: [] } });
    const campaign = await prisma.businessCampaign.upsert({ where: { businessUnitId_platform_externalId: { businessUnitId: od.id, platform: "META", externalId: "demo-campaign" } }, update: {}, create: { businessUnitId: od.id, platform: "META", externalId: "demo-campaign", name: "TYT Yaz Demo", status: "ACTIVE", budgetCents: 250000, spentCents: 100000, productInterest: "ONLINE_DERSHANEM" } });
    const adSet = await prisma.businessAdSet.upsert({ where: { campaignId_externalId: { campaignId: campaign.id, externalId: "demo-adset" } }, update: {}, create: { campaignId: campaign.id, externalId: "demo-adset", name: "TYT Veliler", status: "ACTIVE", budgetCents: 250000 } });
    const ad = await prisma.businessAdvertisement.upsert({ where: { adSetId_externalId: { adSetId: adSet.id, externalId: "demo-ad" } }, update: {}, create: { adSetId: adSet.id, externalId: "demo-ad", name: "TYT Mesaj Reklamı", spentCents: 100000, impressions: 50000, reach: 40000, clicks: 1200, messageStarts: 180, leadCount: 55, saleCount: 8, revenueCents: 480000 } });
    await prisma.attribution.upsert({ where: { id: "demo-attribution" }, update: {}, create: { id: "demo-attribution", leadId: hotLead.id, campaignId: campaign.id, advertisementId: ad.id, model: "FIRST_TOUCH", confidence: 0.98 } });
    const expense = await prisma.financialTransaction.upsert({ where: { idempotencyKey: "seed:demo-expense" }, update: {}, create: { businessUnitId: od.id, source: "MANUAL", idempotencyKey: "seed:demo-expense", kind: "EXPENSE", status: "PAID", transactionAt: new Date(), paidAt: new Date(), description: "Demo reklam gideri", category: "ADVERTISING", grossCents: 120000, netCents: 120000, vatRate: 20, vatCents: 20000 } });
    await prisma.reconciliationRecord.upsert({ where: { provider_externalId: { provider: "PAYTR", externalId: "demo-mismatch" } }, update: {}, create: { businessUnitId: od.id, financialTransactionId: expense.id, provider: "PAYTR", externalId: "demo-mismatch", expectedCents: 120000, actualCents: 118000, status: "REVIEW_REQUIRED", details: { demo: true } } });
    await prisma.aIPromptVersion.upsert({ where: { name_version: { name: "instagram-sales", version: 1 } }, update: {}, create: { businessUnitId: od.id, name: "instagram-sales", version: 1, systemPrompt: "Sade, dürüst ve yardımcı bir Türkçe marka dili kullan. Doğrulanmamış fiyat söyleme.", isActive: true } });
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    if (admin) await prisma.notification.upsert({ where: { id: "demo-business-notification" }, update: {}, create: { id: "demo-business-notification", userId: admin.id, type: "SYSTEM", title: "Demo mutabakat uyarısı", body: "Bir demo tutar uyuşmazlığı inceleme bekliyor.", href: "/panel/yonetim/isletme/mutabakat" } });
  }
  // İşletme erişimi yalnız BusinessRoleAssignment ile verilir; platform
  // ADMIN rolü tek başına yetki taşımaz. Aktif yöneticilere her iş biriminde
  // SUPER_ADMIN ataması yapılmazsa panel boş 404 döner.
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  for (const admin of admins) {
    for (const unit of [od, odk]) {
      await prisma.businessRoleAssignment.upsert({
        where: { userId_businessUnitId_role: { userId: admin.id, businessUnitId: unit.id, role: "SUPER_ADMIN" } },
        update: {},
        create: { userId: admin.id, businessUnitId: unit.id, role: "SUPER_ADMIN" },
      });
    }
  }
  console.log(`İşletme merkezi temel verileri hazırlandı (${admins.length} yöneticiye SUPER_ADMIN ataması).`);
}

main().finally(() => prisma.$disconnect());
