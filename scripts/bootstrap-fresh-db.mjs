import { cliLog } from "./lib/cli-logger.mjs";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (process.env.ALLOW_FRESH_DB_BOOTSTRAP !== "true") {
  throw new Error("Fresh DB bootstrap için ALLOW_FRESH_DB_BOOTSTRAP=true zorunludur.");
}

const prisma = new PrismaClient();
const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'`;

if (tables.length) {
  const migrationTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public._prisma_migrations')::text AS name`,
  );
  if (!migrationTable[0]?.name) {
    await prisma.$disconnect();
    throw new Error(
      `Veritabanı boş değil (${tables.length} tablo) ve Prisma migration geçmişi yok. Fresh bootstrap durduruldu.`,
    );
  }
  cliLog.info("Şema daha önce bootstrap edilmiş; bekleyen migration'lar uygulanacak.");
}
await prisma.$disconnect();

// Fresh veritabanında bütün SQL migration'ları gerçekten çalıştır. `db push`
// partial index, CHECK constraint ve trigger gibi Prisma DSL'in ifade edemediği
// nesneleri oluşturmaz; migration'ları `resolve --applied` ile işaretlemek de bu
// SQL'i sonsuza dek atlar. Deploy boş veritabanında migration tablosunu kendisi
// oluşturur ve tekrar çalıştırıldığında yalnız bekleyen migration'ları uygular.
execFileSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

const bootstrapPrisma = new PrismaClient();
await bootstrapPrisma.businessUnit.upsert({
  where: { product: "OD" },
  update: { name: "OnlineDershanem", isActive: true },
  create: { id: "cbusinessunitod000000000001", code: "OD", name: "OnlineDershanem", product: "OD" },
});
await bootstrapPrisma.businessUnit.upsert({
  where: { product: "ODK" },
  update: { name: "OnlineDenemeKulübü", isActive: true },
  create: { id: "cbusinessunitodk00000000001", code: "ODK", name: "OnlineDenemeKulübü", product: "ODK" },
});
await bootstrapPrisma.$disconnect();
cliLog.info("Fresh database hazırlandı; migration SQL zinciri uygulandı.");
