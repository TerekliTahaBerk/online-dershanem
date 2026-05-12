// Idempotent backfill:
//   1. Ensures two well-known access tags exist:
//        - od-default  (service = OD)   "OD Erişimi"
//        - odk-default (service = ODK)  "ODK Erişimi"
//   2. Grants both tags to every existing User that is a STUDENT or TEACHER
//      (or that has a Student/Teacher relation), preserving any tags they already hold.
//   3. Never revokes or modifies existing OdkUserAccessTag rows.
//
// Safe to re-run. Uses upsert everywhere.

import { PrismaClient } from "@prisma/client";

// Inline env normalization (same logic as lib/prisma-env.ts) so this script
// can run standalone without TS compilation.
function firstDefined(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}
const databaseUrl = firstDefined([
  "DATABASE_URL",
  "STORAGE_DATABASE_URL",
  "STORAGE_PRISMA_DATABASE_URL",
  "STORAGE_POSTGRES_URL",
]);
const directUrl = firstDefined([
  "DIRECT_URL",
  "STORAGE_PRISMA_DATABASE_URL",
  "STORAGE_POSTGRES_URL",
  "STORAGE_DATABASE_URL",
]);
if (!process.env.DATABASE_URL && databaseUrl) process.env.DATABASE_URL = databaseUrl;
if (!process.env.DIRECT_URL && directUrl) process.env.DIRECT_URL = directUrl;

const prisma = new PrismaClient();

const DEFAULT_TAGS = [
  {
    key: "od-default",
    title: "OD Erişimi",
    description: "Online Dershanem öğrenci/eğitmen paneline standart erişim",
    service: "OD",
  },
  {
    key: "odk-default",
    title: "ODK Erişimi",
    description: "Online Deneme Kulübü standart erişim",
    service: "ODK",
  },
];

async function ensureDefaultTags() {
  const tags = {};
  for (const t of DEFAULT_TAGS) {
    const tag = await prisma.odkAccessTag.upsert({
      where: { key: t.key },
      create: {
        key: t.key,
        title: t.title,
        description: t.description,
        service: t.service,
        isActive: true,
      },
      update: {
        // Make sure the service field is set on already-existing rows (post-migration default).
        service: t.service,
        isActive: true,
      },
    });
    tags[t.service] = tag;
  }
  return tags;
}

async function backfillUsers(tags) {
  // Eligible: any user with role STUDENT or TEACHER OR a related Student/Teacher row.
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: "STUDENT" },
        { role: "TEACHER" },
        { student: { isNot: null } },
        { teacher: { isNot: null } },
      ],
    },
    select: { id: true, role: true, email: true },
  });

  let granted = 0;
  for (const u of users) {
    for (const service of ["OD", "ODK"]) {
      const tag = tags[service];
      await prisma.odkUserAccessTag.upsert({
        where: { userId_accessTagId: { userId: u.id, accessTagId: tag.id } },
        create: {
          userId: u.id,
          accessTagId: tag.id,
          source: "MANUAL",
          // expiresAt: null  → süresiz
          // revokedAt: null  → aktif
        },
        update: {
          // Var olan kaydı bozmuyoruz — sadece revoke edilmişse geri açıyoruz.
          revokedAt: null,
        },
      });
      granted++;
    }
  }

  return { userCount: users.length, grantOps: granted };
}

async function main() {
  console.log("→ Erişim etiketleri backfill başlıyor...");
  const tags = await ensureDefaultTags();
  console.log(`  ✓ Default etiketler hazır: ${Object.values(tags).map((t) => t.key).join(", ")}`);

  const result = await backfillUsers(tags);
  console.log(`  ✓ ${result.userCount} kullanıcıya OD + ODK tag atandı (${result.grantOps} upsert).`);
  console.log("✔ Tamamlandı.");
}

main()
  .catch((err) => {
    console.error("✗ Backfill hatası:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
