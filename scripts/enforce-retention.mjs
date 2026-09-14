/**
 * Günlük saklama motoru.
 *
 *   DRY_RUN=true  (varsayılan) → yalnız raporlar, hiçbir kayda yazmaz.
 *   DRY_RUN=false               → onaylı kategorilerde işaretler/siler;
 *                                 RETENTION_APPROVED_BY + RETENTION_TICKET zorunlu.
 *
 * `PENDING_LEGAL_APPROVAL` kategoriler her iki modda da dokunulmadan raporlanır.
 * Gerçek silmeyi açmadan önce dry-run raporlarını hukuk/veri sorumlusuyla gözden geçirin.
 */
import { appendFile } from "node:fs/promises";
import { resolveApproval } from "../lib/data-governance/approval.ts";
import { enforceRetention, resolveDryRun } from "../lib/data-governance/enforce-retention.ts";
import { summarizeRetentionPolicy } from "../lib/data-governance/retention-policy.ts";
import { prisma } from "../lib/prisma.ts";

const dryRun = resolveDryRun(process.env.DRY_RUN);

try {
  const approval = dryRun
    ? undefined
    : await resolveApproval(prisma, { approvedBy: process.env.RETENTION_APPROVED_BY, ticket: process.env.RETENTION_TICKET });
  const deleteBlob = async (pathname) => {
    const { del } = await import("@vercel/blob");
    await del(pathname);
  };
  const report = await enforceRetention({ db: prisma, dryRun, approval, deleteBlob });
  console.log(JSON.stringify({ policy: summarizeRetentionPolicy(), ...report }, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = summarizeRetentionPolicy();
    const lines = [
      `## Data retention ${dryRun ? "(DRY RUN — hiçbir kayıt değişmedi)" : "(ENFORCED)"}`,
      "",
      `- Motor kategorisi: ${summary.engineCategories} (onaylı ${summary.approvedEngineCategories}, onay bekleyen ${summary.pendingEngineCategories})`,
      `- Motor dışı kategori: ${summary.outsideEngineCategories}`,
      "",
      "| Kategori | Durum | Ayrıntı |",
      "|---|---|---|",
      ...report.categories.map((category) => {
        if (category.status === "PENDING_LEGAL_APPROVAL") return `| ${category.category} | onay bekliyor | ${category.recordCount} kayıt, silinmedi |`;
        if (category.status === "OUTSIDE_ENGINE") return `| ${category.category} | ${category.enforcement} | ${category.note ?? ""} |`;
        if (category.status === "INVALID_POLICY") return `| ${category.category} | GEÇERSİZ POLİTİKA | ${category.errors.join("; ")} |`;
        const detail = category.targets.map((target) => `${target.model}: süresi dolan ${target.eligible}, işaret ${target.newlyMarked}, silinecek ${target.dueForPurge}, silinen ${target.purged}`).join("<br>");
        return `| ${category.category} | ${category.retentionDays} gün | ${detail}${category.errors.length ? `<br>HATA: ${category.errors.join("; ")}` : ""} |`;
      }),
      "",
    ];
    await appendFile(process.env.GITHUB_STEP_SUMMARY, lines.join("\n"));
  }

  const failed = report.categories.some((category) => category.status === "INVALID_POLICY" || (category.status === "ENFORCED" && category.errors.length > 0));
  if (failed) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
