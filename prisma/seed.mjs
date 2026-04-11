import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  const adminName = process.env.ADMIN_NAME?.trim() || "Online Dershanem Admin";

  if (!adminEmail || !adminPassword) {
    console.log("Seed skipped: ADMIN_EMAIL veya ADMIN_PASSWORD tanımlı değil.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: "ADMIN"
    }
  });

  console.log(`Admin kullanıcısı hazır: ${adminEmail}`);

  // Seed camps if none exist
  const campCount = await prisma.camp.count();
  if (campCount === 0) {
    const campPaytrLink = "https://www.paytr.com/link/dQECKnq";
    const camps = [
      {
        name: "AYT Belirleyici Konular Kampı",
        detail: "Trigonometri, Türev, Limit ve Logaritma konularıyla AYT'de en kritik dört alana odaklanılır.",
        category: "AYT",
        quota: 1,
        price: 200000,
        originalPrice: 500000,
        paytrLink: campPaytrLink,
      },
      {
        name: "Fonksiyon ve Polinom Kampı",
        detail: "Fonksiyonlar (her yıl düzenli geliyor), Polinomlar, İkinci dereceden denklemler ve eşitsizlikler başlıklarında sistemli tekrar yapılır.",
        category: "AYT",
        quota: 3,
        price: 200000,
        originalPrice: 500000,
        paytrLink: campPaytrLink,
      },
      {
        name: "AYT Geometri Ana Kampı",
        detail: "Çember ve daire, Doğrunun analitiği, Noktanın analitiği ve Katı cisimler konularında geometri temeli güçlendirilir.",
        category: "AYT",
        quota: 2,
        price: 200000,
        originalPrice: 500000,
        paytrLink: campPaytrLink,
      },
      {
        name: "Problemler Kampı",
        detail: "Problemler konusu üzerinde soru çözüm stratejileri ve hız çalışmaları yapılır.",
        category: "TYT",
        quota: 2,
        price: 200000,
        originalPrice: 500000,
        paytrLink: campPaytrLink,
      },
      {
        name: "Fonksiyon ve Grafik Kampı",
        detail: "Fonksiyonlar ve Grafik yorumlama konularıyla TYT temel yorum gücü geliştirilir.",
        category: "TYT",
        quota: 1,
        price: 200000,
        originalPrice: 500000,
        paytrLink: campPaytrLink,
      },
      {
        name: "Yeni Nesil Sorular Kampı",
        detail: "Problem çözme, Mantık ve Çok adımlı sorular üzerinden yeni nesil soru bakış açısı kazandırılır.",
        category: "LGS",
        quota: 3,
        price: 200000,
        originalPrice: 500000,
        paytrLink: campPaytrLink,
      },
      {
        name: "Geometri Kampı",
        detail: "Üçgenler, Eşlik ve benzerlik, Dönüşüm geometrisi başlıklarında geometri temeli pekiştirilir.",
        category: "LGS",
        quota: 2,
        price: 200000,
        originalPrice: 500000,
        paytrLink: campPaytrLink,
      },
      {
        name: "Açılar ve Üçgenler Kampı",
        detail: "Açılar ve Üçgenler konularında temel kavramlar ve soru çözüm teknikleri işlenir.",
        category: "LGS",
        quota: 1,
        price: 200000,
        originalPrice: 500000,
        paytrLink: campPaytrLink,
      },
    ];

    await prisma.camp.createMany({ data: camps });
    console.log(`${camps.length} kamp eklendi.`);
  } else {
    console.log(`Kamplar zaten mevcut (${campCount} adet), seed atlandı.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
