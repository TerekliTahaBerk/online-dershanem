import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.upsert({
    where: { code: "KPSS" },
    update: { name: "KPSS", targetAudience: "adult", isActive: true },
    create: { code: "KPSS", name: "KPSS", targetAudience: "adult" },
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
