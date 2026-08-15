import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { normalizePrismaEnv } from "@/lib/prisma-env";
import { checkDevDatabase } from "@/lib/dev-database-guard";

const { databaseUrl, directUrl } = normalizePrismaEnv();

// `.env.local` production adreslerini taşıyabiliyor; development'ta uzak
// veritabanı açık onay ister. Ayrıntı: lib/dev-database-guard.ts
const devDatabase = checkDevDatabase(process.env);
if (!devDatabase.ok) throw new Error(`[db] ${devDatabase.reason}`);
const isAccelerateUrl =
  databaseUrl?.startsWith("prisma://") === true ||
  databaseUrl?.startsWith("prisma+postgres://") === true;
const shouldUseDirectConnection = process.env.VERCEL !== "1" && Boolean(directUrl);

const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(shouldUseDirectConnection && directUrl ? { datasourceUrl: directUrl } : {})
  });

  return isAccelerateUrl && !shouldUseDirectConnection
    ? (client.$extends(withAccelerate()) as unknown as PrismaClient)
    : client;
};

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
