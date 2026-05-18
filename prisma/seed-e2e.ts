/**
 * E2E için test kullanıcılarını idempotent olarak oluşturur.
 *
 * Çalıştırma:
 *   E2E_PASSWORD="testpass123" tsx prisma/seed-e2e.ts
 *
 * Oluşturulan hesaplar:
 *   - e2e-admin@onlinedershanem.test   (ADMIN)
 *   - e2e-ogrenci@onlinedershanem.test (USER + Student)
 *   - e2e-ogretmen@onlinedershanem.test (USER + Teacher)
 *   - e2e-veli@onlinedershanem.test    (USER + Parent)
 *
 * UYARI: Sadece test/staging ortamında çalıştırın. Production DATABASE_URL
 * tespit edilirse abort eder.
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = process.env.E2E_PASSWORD || "testpass123";

const ACCOUNTS = [
  {
    email: "e2e-admin@onlinedershanem.test",
    fullName: "E2E Admin",
    role: UserRole.ADMIN,
    profile: null,
  },
  {
    email: "e2e-ogrenci@onlinedershanem.test",
    fullName: "E2E Öğrenci",
    role: UserRole.STUDENT,
    profile: "student" as const,
  },
  {
    email: "e2e-ogretmen@onlinedershanem.test",
    fullName: "E2E Öğretmen",
    role: UserRole.TEACHER,
    profile: "teacher" as const,
  },
  {
    email: "e2e-veli@onlinedershanem.test",
    fullName: "E2E Veli",
    role: UserRole.PARENT,
    profile: "parent" as const,
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (/prod|production/i.test(dbUrl)) {
    console.error("❌ Production DATABASE_URL tespit edildi. Abort.");
    process.exit(1);
  }
  console.log(`🌱 E2E seed başlıyor (password: ${PASSWORD.replace(/./g, "*")})`);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const acc of ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: { passwordHash, name: acc.fullName, role: acc.role },
      create: {
        email: acc.email,
        name: acc.fullName,
        passwordHash,
        role: acc.role,
      },
    });

    if (acc.profile === "student") {
      const phone = `+9050000000${acc.email.length.toString().padStart(2, "0")}`;
      await prisma.student.upsert({
        where: { userId: user.id },
        update: { fullName: acc.fullName },
        create: {
          userId: user.id,
          fullName: acc.fullName,
          email: acc.email,
          phone,
          phoneKey: phone.replace(/\D/g, ""),
        },
      });
    } else if (acc.profile === "teacher") {
      await prisma.teacher.upsert({
        where: { userId: user.id },
        update: { fullName: acc.fullName },
        create: {
          userId: user.id,
          fullName: acc.fullName,
          email: acc.email,
          subjects: "Genel",
        },
      });
    } else if (acc.profile === "parent") {
      await prisma.parent.upsert({
        where: { userId: user.id },
        update: { fullName: acc.fullName },
        create: { userId: user.id, fullName: acc.fullName, email: acc.email },
      });
    }

    console.log(`✓ ${acc.email}`);
  }

  console.log("✅ E2E seed tamam.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
