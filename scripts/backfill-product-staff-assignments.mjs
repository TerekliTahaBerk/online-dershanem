/**
 * Phase 1 — ürün personel ataması geçişi (R1–R3).
 *
 * Kullanım:
 *   npm run staff:backfill               # dry-run (varsayılan): HİÇBİR yazma yapmaz
 *   npm run staff:backfill -- --apply    # eksik atamaları yazar
 *
 * Kurallar `lib/products/staff-assignment-backfill.ts` içindedir:
 *   R1 TEACHER@OD (her öğretmen), R2 COACH@OK (isCoach),
 *   R3 REPORT_VIEWER@ODK (yalnız güncel Deneme Ligi rapor ilişkisi).
 * Yazılan her satır: source=LEGACY_BACKFILL, grantedBy=null, gerekçe=kural,
 * audit `product_staff.granted`. İki kez çalıştırmak güvenlidir (idempotent).
 *
 * E-posta varsayılan olarak maskelenir; tam e-posta için
 * `STAFF_BACKFILL_INCLUDE_EMAIL=true`.
 */
import { runStaffAssignmentBackfill } from "../lib/products/staff-assignment-backfill-server.ts";
import { prisma } from "../lib/prisma.ts";

const args = new Set(process.argv.slice(2));
const unknown = [...args].filter((arg) => arg !== "--apply" && arg !== "--dry-run");
if (unknown.length || (args.has("--apply") && args.has("--dry-run"))) {
  console.error(`Kullanım: backfill-product-staff-assignments.mjs [--dry-run | --apply] (bilinmeyen: ${unknown.join(" ")})`);
  process.exit(2);
}

try {
  const report = await runStaffAssignmentBackfill({
    apply: args.has("--apply"),
    includeEmail: process.env.STAFF_BACKFILL_INCLUDE_EMAIL === "true",
  });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await prisma.$disconnect();
}
