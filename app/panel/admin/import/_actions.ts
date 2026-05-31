"use server";

/**
 * Phase 3 / Session 10 — Import wizard server actions.
 *
 * - All callers must be admins (`requirePanelRole("admin")` enforces).
 * - `dryRunImportAction` never writes data.
 * - `commitImportAction` writes; respects `allowWarnings`. It always
 *   re-parses + re-validates server-side (never trusts client status).
 * - Both actions write to AuditLog.
 */
import { requirePanelRole } from "@/lib/panel-access";
import { logAudit } from "@/lib/audit";
import {
  dryRunImport,
  commitImport,
  type DryRunResult,
  type CommitResult,
  type ImportEntity,
} from "@/lib/panel/imports";

const ENTITIES: ReadonlySet<ImportEntity> = new Set(["students", "parents", "teachers"]);

function assertEntity(raw: string): ImportEntity {
  if (!ENTITIES.has(raw as ImportEntity)) {
    throw new Error(`Geçersiz varlık: ${raw}`);
  }
  return raw as ImportEntity;
}

export async function dryRunImportAction(
  entityRaw: string,
  csv: string,
): Promise<DryRunResult> {
  const ctx = await requirePanelRole("admin");
  const entity = assertEntity(entityRaw);
  if (typeof csv !== "string" || csv.trim() === "") {
    return {
      entity,
      columns: [],
      rows: [],
      summary: { total: 0, ready: 0, warning: 0, error: 0, skipped: 0 },
      fatalErrors: ["CSV boş"],
    };
  }
  const result = await dryRunImport(entity, csv);
  await logAudit({
    actorUserId: ctx.userId,
    actorType: "USER",
    entityType: "ImportBatch",
    entityId: entity,
    action: "IMPORT_DRY_RUN",
    summary: `Dry-run ${entity}: ${result.summary.ready} hazır / ${result.summary.warning} uyarı / ${result.summary.error} hata / ${result.summary.skipped} atlandı`,
    payload: {
      entity,
      summary: result.summary,
      fatalErrors: result.fatalErrors,
      total: result.rows.length,
    },
  });
  return result;
}

export async function commitImportAction(
  entityRaw: string,
  csv: string,
  allowWarnings: boolean,
): Promise<CommitResult> {
  const ctx = await requirePanelRole("admin");
  const entity = assertEntity(entityRaw);
  if (typeof csv !== "string" || csv.trim() === "") {
    return {
      entity,
      rows: [],
      summary: { attempted: 0, created: 0, skipped: 0, failed: 0 },
    };
  }
  const result = await commitImport(entity, csv, { allowWarnings: !!allowWarnings });
  await logAudit({
    actorUserId: ctx.userId,
    actorType: "USER",
    entityType: "ImportBatch",
    entityId: entity,
    action: "IMPORT_COMMIT",
    summary: `Commit ${entity}: ${result.summary.created} oluşturuldu / ${result.summary.failed} hata / ${result.summary.skipped} atlandı (allowWarnings=${allowWarnings ? "evet" : "hayır"})`,
    payload: {
      entity,
      summary: result.summary,
      allowWarnings,
      createdIds: result.rows.filter((r) => r.ok).map((r) => ({
        rowNumber: r.rowNumber,
        entityId: r.entityId ?? null,
        userId: r.userId ?? null,
      })),
      failed: result.rows.filter((r) => !r.ok).map((r) => ({
        rowNumber: r.rowNumber,
        error: r.error ?? null,
      })),
    },
  });
  return result;
}
