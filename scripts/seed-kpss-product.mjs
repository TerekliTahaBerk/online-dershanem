import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.upsert({
    where: { code: "KPSS" },
    // `requiresPlanApproval: false` — KPSS öğretmensiz/otonom bir üründür:
    // haftalık planı koç onayı beklemeden aktif olur (KPSS Görev 6, migration 0109).
    // Migration 0109 var olan KPSS satırında da bu bayrağı false'a çeker; burada
    // tekrarlanması, ürün satırı migration'dan SONRA açılan ortamlar içindir.
    update: { name: "KPSS", targetAudience: "adult", isActive: true, requiresPlanApproval: false },
    create: { code: "KPSS", name: "KPSS", targetAudience: "adult", requiresPlanApproval: false },
  });
  const examFamily = await prisma.examFamily.upsert({
    where: { code: "KPSS_EGITIM_BILIMLERI" },
    update: { name: "KPSS Eğitim Bilimleri", productId: product.id, isActive: true },
    create: {
      code: "KPSS_EGITIM_BILIMLERI",
      name: "KPSS Eğitim Bilimleri",
      productId: product.id,
    },
  });

  console.log(JSON.stringify({ product: product.code, examFamily: examFamily.code }));
}

main().finally(() => prisma.$disconnect());
