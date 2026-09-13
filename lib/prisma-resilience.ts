import { Prisma, PrismaClient } from "@prisma/client";
import { prisma, prismaDirect } from "@/lib/prisma";

const TRANSIENT_PRISMA_CODES = new Set([
  "P5006", // Accelerate / server-side transport failure
  "P6000", // Accelerate generic server error (often 530 unreachable)
  "P6008", // Accelerate connection / engine start error
  "P5011", // Accelerate rate limit — short backoff may help
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientPrismaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code);
  }

  if (!(error instanceof Error)) return false;
  const message = error.message;
  return message.includes("P6000") || message.includes("Query Engine instance was unreachable");
}

/**
 * Accelerate geçici olarak erişilemez olduğunda (P6000/530 vb.) kısa retry
 * ve ardından DIRECT_URL üzerinden yedek istemci ile tekrar dener.
 *
 * Kritik yol (oturum çözümleme, giriş) için kullanılır; tüm sorguları
 * Accelerate'i bypass edecek şekilde değiştirmeyiz.
 */
export async function withPrismaResilience<T>(
  operation: (client: PrismaClient) => Promise<T>,
  options: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 120;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation(prisma);
    } catch (error) {
      lastError = error;
      if (!isTransientPrismaError(error) || attempt === retries) break;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  if (prismaDirect) {
    try {
      return await operation(prismaDirect);
    } catch {
      // Yedek de başarısızsa orijinal Accelerate hatasını göster — teşhis için daha anlamlı.
    }
  }

  throw lastError;
}
