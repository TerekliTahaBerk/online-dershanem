import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

if (process.env.ALLOW_FRESH_DB_BOOTSTRAP !== "true") {
  throw new Error("Fresh DB bootstrap için ALLOW_FRESH_DB_BOOTSTRAP=true zorunludur.");
}

const prisma = new PrismaClient();
const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'`;
await prisma.$disconnect();
if (tables.length) throw new Error(`Veritabanı boş değil (${tables.length} tablo). Bu komut yalnızca yepyeni veritabanında çalışır.`);

execFileSync("npx", ["prisma", "db", "push", "--skip-generate"], { stdio: "inherit", env: process.env });
const migrations = readdirSync("prisma/migrations", { withFileTypes: true }).filter((item) => item.isDirectory()).map((item) => item.name).sort();
for (const migration of migrations) execFileSync("npx", ["prisma", "migrate", "resolve", "--applied", migration], { stdio: "inherit", env: process.env });
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
console.log(`Fresh database hazırlandı; ${migrations.length} migration işaretlendi.`);
