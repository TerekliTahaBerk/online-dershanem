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
    await prisma.businessLead.upsert({ where: { conversationId: conversation.id }, update: {}, create: { businessUnitId: od.id, conversationId: conversation.id, instagramScopedId: "demo_customer_1", firstName: "Demo", source: "INSTAGRAM_ORGANIC", temperature: "HOT", productInterest: "ONLINE_DERSHANEM", stage: "QUALIFIED", tags: ["tyt"] } });
  }
  console.log("İşletme merkezi temel verileri hazırlandı.");
}

main().finally(() => prisma.$disconnect());
