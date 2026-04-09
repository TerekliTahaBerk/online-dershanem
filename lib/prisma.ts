import "server-only";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const accelerateUrl = process.env.DATABASE_URL;

if (!accelerateUrl) {
  throw new Error("DATABASE_URL ortam değişkeni tanımlı değil.");
}

const createPrismaClient = () =>
  new PrismaClient({
    accelerateUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  }).$extends(withAccelerate());

type PrismaClientSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientSingleton;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
