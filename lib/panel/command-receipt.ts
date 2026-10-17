import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { operationDigest } from "@/lib/panel/group-mutation-core";

/**
 * KOMUT MAKBUZU — işletme (P2.7) ve hesap ayarları (P5.2) komutlarının ortak
 * çalıştırıcısı.
 *
 *  - İşlem anahtarı aktöre bağlıdır: makbuz `AuditLog.idempotencyKey`
 *    (`<ad alanı>:<aktör>:<anahtar>`). Aynı anahtar aynı komutla ilk
 *    sonucu döndürür; farklı komutta 409 `IDEMPOTENCY_REUSE`.
 *  - `transactional`: kayıt + audit makbuzu tek Serializable transaction.
 *  - `outside`: dış servis veya kendi transaction'ı olan mevcut iş kuralı
 *    (ör. Meta senkronu, mutabakat taraması, yaşam döngüsü bağı); makbuz iş
 *    bittikten sonra yazılır.
 *  - `after`: commit sonrası yan etki (otomasyon olayı, AI önerisi); tekrarda
 *    çalışmaz.
 */
export class CommandError extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409 | 422 | 502,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export type CommandExecution<R> = {
  entityType: string;
  entityId: string;
  action: string;
  summary?: string;
  payload?: Prisma.InputJsonObject;
  result: R;
  after?: () => Promise<void>;
};

const isRetryable = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code);

function readReceipt<R>(payload: unknown, digest: string): R {
  const saved = payload as { operationDigest?: string; result?: R } | null;
  if (saved?.operationDigest !== digest || saved.result === undefined) throw new CommandError(409, "IDEMPOTENCY_REUSE", "İşlem anahtarı farklı bir istek için kullanılamaz.");
  return saved.result;
}

export async function runWithReceipt<R>(input: {
  actorUserId: string;
  namespace: string;
  idempotencyKey?: string;
  digestOf: unknown;
  transactional?: (tx: Prisma.TransactionClient) => Promise<CommandExecution<R>>;
  outside?: () => Promise<CommandExecution<R>>;
  /** `after` başarısız olursa hatayı dönüştürür (ör. AI önerisi → 502). */
  afterError?: (error: unknown) => never;
}): Promise<{ result: R; replayed: boolean }> {
  const key = `${input.namespace}:${input.actorUserId}:${input.idempotencyKey ?? randomUUID()}`;
  const digest = operationDigest(input.digestOf);
  const receiptData = (run: CommandExecution<R>) => ({ actorUserId: input.actorUserId, actorType: "USER" as const, idempotencyKey: key, entityType: run.entityType, entityId: run.entityId, action: run.action, summary: run.summary ?? null, payload: { operationDigest: digest, ...(run.payload ?? {}), result: run.result as unknown as Prisma.InputJsonValue } });
  const replay = async () => {
    const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: key }, select: { payload: true } });
    return receipt ? { result: readReceipt<R>(receipt.payload, digest), replayed: true } : null;
  };
  const prior = await replay();
  if (prior) return prior;

  let executed: CommandExecution<R>;
  if (input.outside) {
    executed = await input.outside();
    try {
      await prisma.auditLog.create({ data: receiptData(executed) });
    } catch (error) {
      // Eşzamanlı aynı anahtar: iş kuralları zaten idempotent; ilk makbuz geçerli.
      if (isRetryable(error)) {
        const saved = await replay();
        if (saved) return saved;
      }
      throw error;
    }
  } else {
    try {
      executed = await prisma.$transaction(
        async (tx) => {
          const run = await input.transactional!(tx);
          await tx.auditLog.create({ data: receiptData(run) });
          return run;
        },
        { isolationLevel: "Serializable", timeout: 15_000 },
      );
    } catch (error) {
      if (isRetryable(error)) {
        const saved = await replay();
        if (saved) return saved;
        throw new CommandError(409, "CONFLICT", "Kayıt eşzamanlı değişti. Sayfayı yenileyip tekrar deneyebilirsiniz.");
      }
      throw error;
    }
  }
  if (executed.after) {
    try {
      await executed.after();
    } catch (error) {
      if (input.afterError) input.afterError(error);
      throw error;
    }
  }
  return { result: executed.result, replayed: false };
}
