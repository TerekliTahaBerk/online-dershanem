import type { PrismaClient } from "@prisma/client";
import {
  PENDING_LEGAL_APPROVAL,
  RETENTION_GRACE_PERIOD_DAYS,
  RETENTION_POLICY,
  prismaDelegateName,
  validateRetentionCategory,
  type RetentionCategory,
  type RetentionTarget,
} from "./retention-policy";
import type { ResolvedApproval } from "./approval";

const DAY_MS = 86_400_000;

/**
 * Saklama motoru. İki fazlıdır ve hiçbir fazda onaysız süre kullanmaz:
 *   1. İşaretle: süresi dolan kayıt `RetentionMark` alır (kayıt yerinde kalır).
 *   2. Temizle: bekleme süresi dolan işaretli kayıt tekrar doğrulanır, sonra silinir.
 * Bekleme içinde `RetentionMark.releasedAt` doldurulursa kayıt silinmez.
 */

type Row = Record<string, unknown> & { id: string };
type Delegate = {
  count(args: { where?: Record<string, unknown> }): Promise<number>;
  findMany(args: { where?: Record<string, unknown>; select?: Record<string, boolean>; take?: number; orderBy?: Record<string, string> }): Promise<Row[]>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
};

export type TargetReport = {
  model: string;
  eligible: number;
  newlyMarked: number;
  dueForPurge: number;
  purged: number;
  released: number;
};

export type CategoryReport =
  | { category: string; status: "PENDING_LEGAL_APPROVAL"; recordCount: number; message: string }
  | { category: string; status: "OUTSIDE_ENGINE"; enforcement: RetentionCategory["enforcement"]; note?: string }
  | { category: string; status: "INVALID_POLICY"; errors: string[] }
  | { category: string; status: "ENFORCED"; retentionDays: number; cutoff: string; targets: TargetReport[]; errors: string[] };

export type RetentionReport = {
  checkedAt: string;
  dryRun: boolean;
  graceDays: number;
  categories: CategoryReport[];
};

export type RetentionRunOptions = {
  db: PrismaClient;
  dryRun: boolean;
  /** Gerçek (dryRun=false) çalıştırmada zorunlu. */
  approval?: ResolvedApproval;
  policy?: readonly RetentionCategory[];
  now?: Date;
  graceDays?: number;
  batchSize?: number;
  deleteBlob?: (pathname: string) => Promise<void>;
};

function delegate(db: PrismaClient, model: string): Delegate {
  const found = (db as unknown as Record<string, Delegate | undefined>)[prismaDelegateName(model)];
  if (!found || typeof found.findMany !== "function") throw new Error(`Prisma modeli bulunamadı: ${model}`);
  return found;
}

async function enforceTarget(
  options: Required<Pick<RetentionRunOptions, "db" | "dryRun" | "graceDays" | "batchSize">> & Pick<RetentionRunOptions, "deleteBlob">,
  category: RetentionCategory,
  target: RetentionTarget,
  now: Date,
  cutoff: Date,
): Promise<TargetReport> {
  const { db, dryRun, graceDays, batchSize, deleteBlob } = options;
  const records = delegate(db, target.model);
  const expiredWhere = { ...target.where, [target.dateField]: { lt: cutoff } };
  const report: TargetReport = { model: target.model, eligible: await records.count({ where: expiredWhere }), newlyMarked: 0, dueForPurge: 0, purged: 0, released: 0 };

  // Faz 1 — işaretle.
  const candidates = await records.findMany({ where: expiredWhere, select: { id: true }, take: batchSize, orderBy: { [target.dateField]: "asc" } });
  const candidateIds = candidates.map((row) => row.id);
  const alreadyMarked = new Set((await db.retentionMark.findMany({
    where: { model: target.model, recordId: { in: candidateIds } },
    select: { recordId: true },
  })).map((mark) => mark.recordId));
  const toMark = candidateIds.filter((id) => !alreadyMarked.has(id));
  if (!dryRun && toMark.length > 0) {
    const purgeAfter = new Date(now.getTime() + graceDays * DAY_MS);
    const created = await db.retentionMark.createMany({
      data: toMark.map((recordId) => ({ category: category.category, model: target.model, recordId, markedAt: now, purgeAfter })),
      skipDuplicates: true,
    });
    report.newlyMarked = created.count;
  } else {
    report.newlyMarked = dryRun ? toMark.length : 0;
  }

  // Faz 2 — bekleme süresi dolan işaretleri temizle.
  const due = await db.retentionMark.findMany({
    where: { model: target.model, purgedAt: null, releasedAt: null, purgeAfter: { lte: now } },
    select: { id: true, recordId: true },
    take: batchSize,
  });
  report.dueForPurge = due.length;
  if (dryRun || due.length === 0) return report;

  const dueIds = due.map((mark) => mark.recordId);
  const select: Record<string, boolean> = { id: true };
  if (target.blobField) select[target.blobField] = true;
  // Politika veya kayıt bekleme süresince değiştiyse (ör. materyal yeniden
  // etkinleştirildi) silme yapılmaz, işaret serbest bırakılır.
  const stillExpired = await records.findMany({ where: { ...expiredWhere, id: { in: dueIds } }, select });
  const stillExpiredIds = new Set(stillExpired.map((row) => row.id));
  const existing = new Set((await records.findMany({ where: { id: { in: dueIds } }, select: { id: true } })).map((row) => row.id));
  const toRelease = dueIds.filter((id) => existing.has(id) && !stillExpiredIds.has(id));

  if (target.blobField) {
    if (!deleteBlob) throw new Error(`${target.model}: Blob silici tanımlı değil; kayıt silinmedi (yetim Blob bırakılmaz)`);
    for (const row of stillExpired) {
      const pathname = row[target.blobField];
      if (typeof pathname === "string" && pathname) await deleteBlob(pathname);
    }
  }

  await db.$transaction(async (tx) => {
    const deleted = await delegate(tx as unknown as PrismaClient, target.model).deleteMany({ where: { id: { in: [...stillExpiredIds] } } });
    report.purged = deleted.count;
    // Silinen ve zaten başka yoldan kaybolmuş kayıtların işaretleri kapanır.
    await tx.retentionMark.updateMany({
      where: { model: target.model, recordId: { in: dueIds.filter((id) => !toRelease.includes(id)) } },
      data: { purgedAt: now },
    });
    if (toRelease.length > 0) {
      await tx.retentionMark.updateMany({ where: { model: target.model, recordId: { in: toRelease } }, data: { releasedAt: now } });
    }
    report.released = toRelease.length;
    if (report.purged > 0 || report.released > 0) {
      await tx.auditLog.create({
        data: {
          actorType: "SYSTEM",
          entityType: "RetentionCategory",
          entityId: category.category,
          action: "retention.records_purged",
          summary: `Saklama süresi dolan ${target.model} kayıtları temizlendi`,
          payload: { model: target.model, purged: report.purged, released: report.released, retentionDays: category.retentionDays, approvedAt: category.approvedAt ?? null },
        },
      });
    }
  });
  return report;
}

export async function enforceRetention(options: RetentionRunOptions): Promise<RetentionReport> {
  const now = options.now ?? new Date();
  const policy = options.policy ?? RETENTION_POLICY;
  const graceDays = options.graceDays ?? RETENTION_GRACE_PERIOD_DAYS;
  const batchSize = options.batchSize ?? 1000;
  if (!Number.isInteger(graceDays) || graceDays < 0) throw new Error("graceDays negatif olmayan tam sayı olmalı");

  const hasEnforceable = policy.some((category) => category.enforcement === "RETENTION_ENGINE"
    && category.retentionDays !== PENDING_LEGAL_APPROVAL && validateRetentionCategory(category).length === 0);
  if (!options.dryRun && hasEnforceable) {
    if (!options.approval) throw new Error("Gerçek saklama çalıştırması onay (--approved-by, --ticket) olmadan başlatılamaz");
    // Silmeden ÖNCE kim/ne zaman/hangi talep kaydı diske yazılır.
    await options.db.auditLog.create({
      data: {
        actorUserId: options.approval.approverUserId,
        actorType: "USER",
        entityType: "RetentionRun",
        entityId: options.approval.ticketRef,
        action: "retention.enforcement_approved",
        summary: "Saklama motoru gerçek silme modunda başlatıldı",
        payload: { ticketRef: options.approval.ticketRef, graceDays, startedAt: now.toISOString() },
      },
    });
  }

  const categories: CategoryReport[] = [];
  for (const category of policy) {
    if (category.enforcement !== "RETENTION_ENGINE") {
      categories.push({ category: category.category, status: "OUTSIDE_ENGINE", enforcement: category.enforcement, note: category.documentedSuggestion });
      continue;
    }
    const errors = validateRetentionCategory(category);
    if (errors.length > 0) {
      categories.push({ category: category.category, status: "INVALID_POLICY", errors });
      continue;
    }
    if (category.retentionDays === PENDING_LEGAL_APPROVAL) {
      let recordCount = 0;
      for (const target of category.targets) recordCount += await delegate(options.db, target.model).count({ where: target.where ?? {} });
      categories.push({
        category: category.category,
        status: "PENDING_LEGAL_APPROVAL",
        recordCount,
        message: `${category.category} için ${recordCount} kayıt hukuki onay bekliyor, silinmedi`,
      });
      continue;
    }
    const cutoff = new Date(now.getTime() - category.retentionDays * DAY_MS);
    const report: CategoryReport = { category: category.category, status: "ENFORCED", retentionDays: category.retentionDays, cutoff: cutoff.toISOString(), targets: [], errors: [] };
    for (const target of category.targets) {
      try {
        report.targets.push(await enforceTarget({ db: options.db, dryRun: options.dryRun, graceDays, batchSize, deleteBlob: options.deleteBlob }, category, target, now, cutoff));
      } catch (error) {
        report.errors.push(`${target.model}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    categories.push(report);
  }
  return { checkedAt: now.toISOString(), dryRun: options.dryRun, graceDays, categories };
}

/** `DRY_RUN` yalnız tam olarak "false" ise gerçek silme açılır. */
export function resolveDryRun(value: string | undefined): boolean {
  return value?.trim().toLowerCase() !== "false";
}
