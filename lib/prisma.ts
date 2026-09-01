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

const createPrismaClient = (datasourceUrl?: string): PrismaClient => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  });

  const useAccelerate = isAccelerateUrl && !datasourceUrl && !shouldUseDirectConnection;
  return useAccelerate
    ? (client.$extends(withAccelerate()) as unknown as PrismaClient)
    : client;
};

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDirect?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient(
  shouldUseDirectConnection && directUrl ? directUrl : undefined,
);

/** Accelerate geçici kesintilerinde kritik yollar için DIRECT_URL yedek istemcisi. */
export const prismaDirect: PrismaClient | null =
  isAccelerateUrl && directUrl && !shouldUseDirectConnection
    ? (globalForPrisma.prismaDirect ?? createPrismaClient(directUrl))
    : null;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  if (prismaDirect) globalForPrisma.prismaDirect = prismaDirect;
}
