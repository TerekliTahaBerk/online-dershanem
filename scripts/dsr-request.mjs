/**
 * Veri sahibi talebi (DSR) tek komutu.
 *
 *   export     --user-id <id> [--ticket <ref>] [--out <dosya.json>]
 *   anonymize  --user-id <id> --approved-by <admin-email> --ticket <ref>   → hesap askıya, bekleme başlar
 *   delete     --user-id <id> --approved-by <admin-email> --ticket <ref>   → hesap askıya, bekleme başlar
 *   apply      --request-id <id> --approved-by <admin-email> --ticket <ref> → bekleme dolunca geri alınamaz adım
 *   cancel     --request-id <id> --approved-by <admin-email> --ticket <ref> → bekleme içinde geri al
 *
 * ÖNKOŞUL (bu komutun dışında, insan tarafından): talep edenin kimliği ve çocuk
 * adına işlem yetkisi ikinci kanaldan doğrulanmış ve ticket'a kaydedilmiş olmalı.
 */
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { ApprovalError, assertApprovalShape, resolveApproval } from "../lib/data-governance/approval.ts";
import { applyErasure, cancelErasure, collectSubjectExport, requestErasure } from "../lib/data-governance/dsr.ts";
import { prisma } from "../lib/prisma.ts";

const ACTIONS = new Set(["export", "anonymize", "delete", "apply", "cancel"]);

const { values } = parseArgs({
  options: {
    "user-id": { type: "string" },
    "request-id": { type: "string" },
    action: { type: "string" },
    "approved-by": { type: "string" },
    ticket: { type: "string" },
    out: { type: "string" },
  },
  strict: true,
});

const jsonReplacer = (_key, value) => (typeof value === "bigint" ? value.toString() : value);

function fail(message, code = 2) {
  console.error(`dsr-request: ${message}`);
  process.exitCode = code;
}

const action = values.action;
if (!ACTIONS.has(action ?? "")) {
  fail(`--action export|anonymize|delete|apply|cancel zorunlu`);
} else {
  try {
    if (action !== "export") {
      // Veritabanına bağlanmadan önce reddet: onaysız geri alınamaz işlem yok.
      assertApprovalShape({ approvedBy: values["approved-by"], ticket: values.ticket });
    }
    if (action === "export") {
      if (!values["user-id"]) throw new ApprovalError("--user-id zorunlu");
      const result = await collectSubjectExport(prisma, values["user-id"], { ticketRef: values.ticket ?? null });
      const out = values.out ?? `dsr-export-${values["user-id"]}.json`;
      await writeFile(out, JSON.stringify(result, jsonReplacer, 2), { mode: 0o600 });
      console.log(JSON.stringify({ written: out, ...result.meta, tables: result.tables.map((table) => ({ model: table.model, relation: table.relation, rows: table.rowCount, thirdPartyReviewRows: table.thirdPartyReviewRows })) }, null, 2));
    } else {
      const approval = await resolveApproval(prisma, { approvedBy: values["approved-by"], ticket: values.ticket });
      if (action === "anonymize" || action === "delete") {
        if (!values["user-id"]) throw new ApprovalError("--user-id zorunlu");
        const tombstone = await requestErasure(prisma, { subjectUserId: values["user-id"], action: action === "delete" ? "DELETE" : "ANONYMIZE", approval });
        console.log(JSON.stringify({ requestId: tombstone.id, status: tombstone.status, graceUntil: tombstone.graceUntil, next: `Bekleme sonunda: --action apply --request-id ${tombstone.id}` }, null, 2));
      } else {
        if (!values["request-id"]) throw new ApprovalError("--request-id zorunlu");
        const result = action === "apply"
          ? await applyErasure(prisma, { requestId: values["request-id"], approval })
          : { tombstone: await cancelErasure(prisma, { requestId: values["request-id"], approval }) };
        console.log(JSON.stringify(result, jsonReplacer, 2));
        if (result.outcome?.outcome === "BLOCKED") process.exitCode = 3;
      }
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), error instanceof ApprovalError ? 2 : 1);
  } finally {
    await prisma.$disconnect();
  }
}
