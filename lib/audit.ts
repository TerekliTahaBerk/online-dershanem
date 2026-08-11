/**
 * Audit log helper.
 *
 * Ödeme ve webhook olaylarını AuditLog tablosuna yazar. Bu helper her zaman
 * non-throwing — audit yazımı asla iş akışını bozmaz.
 *
 */
import "server-only";
import type { AuditActorType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reportOperationalAlert } from "@/lib/error-capture";
import { log } from "@/lib/logger";
import { sanitizeAuditPayload, writeWithRetry } from "@/lib/audit-policy";

export type LogAuditInput = {
  actorUserId?: string | null;
  actorType?: AuditActorType;
  entityType: string;
  entityId: string;
  action: string;
  summary?: string | null;
  payload?: Prisma.InputJsonValue | null;
  /** Aynı mantıksal olayın callback retry'larında tek satır kalmasını sağlar. */
  idempotencyKey?: string;
};

export type AuditWriteResult = { ok: true; attempts: number } | { ok: false; attempts: number };

function auditData(input: LogAuditInput) {
  const actorUserId = input.actorUserId ?? null;
  return {
    actorUserId,
    actorType: input.actorType ?? (actorUserId ? "USER" : "SYSTEM"),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    summary: input.summary ?? null,
    payload: input.payload == null
      ? undefined
      : sanitizeAuditPayload(input.payload) as Prisma.InputJsonValue,
    idempotencyKey: input.idempotencyKey,
  } satisfies Prisma.AuditLogUncheckedCreateInput;
}

async function writeAudit(input: LogAuditInput): Promise<void> {
  const data = auditData(input);
  if (input.idempotencyKey) {
    await prisma.auditLog.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: data,
      // İlk callback kanıtı değişmez; sonraki PayTR retry'ları no-op'tur.
      update: {},
    });
    return;
  }
  await prisma.auditLog.create({ data });
}

async function observeAuditFailure(input: LogAuditInput, err: unknown, attempts: number): Promise<void> {
  const context = {
    metric: "audit_write_failure_total",
    count: 1,
    entityType: input.entityType,
    action: input.action,
    attempts,
  };
  log.error("audit.write_failed", err, context);
  await reportOperationalAlert({
    event: "audit.write_failed",
    severity: "critical",
    summary: `Kritik audit yazımı başarısız: ${input.entityType}/${input.action}`,
    context,
  });
}

export async function logAudit(input: LogAuditInput): Promise<AuditWriteResult> {
  try {
    await writeAudit(input);
    return { ok: true, attempts: 1 };
  } catch (err) {
    await observeAuditFailure(input, err, 1);
    return { ok: false, attempts: 1 };
  }
}

/** Finans/security callback'leri için response öncesi, retry'lı ve non-throwing yazım. */
export async function logCriticalAudit(input: LogAuditInput): Promise<AuditWriteResult> {
  const maxAttempts = 3;
  try {
    const attempts = await writeWithRetry(() => writeAudit(input), { maxAttempts });
    return { ok: true, attempts };
  } catch (err) {
    // Ödeme state'i korunur; kayıp riski metric + alert ile görünür kalır.
    await observeAuditFailure(input, err, maxAttempts);
    return { ok: false, attempts: maxAttempts };
  }
}

/** Birden fazla entity tek seferde — örn. bulk grant CSV. */
export async function logAuditMany(
  rows: LogAuditInput[],
): Promise<void> {
  if (rows.length === 0) return;
  try {
    await prisma.auditLog.createMany({
      data: rows.map((r) => ({
        actorUserId: r.actorUserId ?? null,
        actorType: r.actorType ?? (r.actorUserId ? "USER" : "SYSTEM"),
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        summary: r.summary ?? null,
        payload: r.payload == null
          ? undefined
          : sanitizeAuditPayload(r.payload) as Prisma.InputJsonValue,
        idempotencyKey: r.idempotencyKey,
      })),
    });
  } catch (err) {
    log.error("audit.bulk_write_failed", err, { metric: "audit_write_failure_total", count: rows.length });
  }
}
