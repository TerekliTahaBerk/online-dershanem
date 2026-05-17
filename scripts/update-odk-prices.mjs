import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const packages = [
  {
    slug: "lgs-paketi",
    title: "LGS Paketi",
    description: "8. sınıf LGS hazırlığı için kazanım odaklı dijital deneme paketi.",
    priceCents: 50000,
    originalPriceCents: 100000,
  },
  {
    slug: "tyt-paketi",
    title: "TYT Paketi",
    description: "TYT'ye yönelik tüm dersleri kapsayan kazanım analizli deneme paketi.",
    priceCents: 50000,
    originalPriceCents: 100000,
  },
  {
    slug: "ayt-paketi",
    title: "AYT Paketi",
    description: "AYT alan derslerinde net kazandıran odaklı deneme paketi.",
    priceCents: 50000,
    originalPriceCents: 100000,
  },
  {
    slug: "yks-paketi",
    title: "YKS Paketi",
    description: "TYT + AYT birlikte: en kapsamlı YKS hazırlık paketi.",
    priceCents: 75000,
    originalPriceCents: 150000,
  },
];

async function main() {
  // Find existing LGS package(s) with auto-generated slug like "lgs-paketi-XXXX"
  const existing = await prisma.odkPackage.findMany({
    where: { slug: { startsWith: "lgs-paketi-" } },
  });
  for (const ex of existing) {
    if (ex.slug !== "lgs-paketi") {
      // remove duplicate auto-generated slug variants so the canonical slug below succeeds
      console.log(`Deleting legacy LGS package with slug ${ex.slug}`);
      await prisma.odkPackage.delete({ where: { id: ex.id } });
    }
  }

  for (const pkg of packages) {
    const result = await prisma.odkPackage.upsert({
      where: { slug: pkg.slug },
      update: {
        title: pkg.title,
        description: pkg.description,
        priceCents: pkg.priceCents,
        originalPriceCents: pkg.originalPriceCents,
        isActive: true,
      },
      create: {
        title: pkg.title,
        slug: pkg.slug,
        description: pkg.description,
        priceCents: pkg.priceCents,
        originalPriceCents: pkg.originalPriceCents,
        isActive: true,
      },
    });
    console.log(`✔ ${result.title} → ${result.priceCents / 100} TL (eski ${result.originalPriceCents / 100} TL)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
