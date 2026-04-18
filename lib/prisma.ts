import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { normalizePrismaEnv } from "@/lib/prisma-env";

const { databaseUrl, directUrl } = normalizePrismaEnv();
const isAccelerateUrl = databaseUrl?.startsWith("prisma://") ?? false;
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
