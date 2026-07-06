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
}

main().finally(() => prisma.$disconnect());
