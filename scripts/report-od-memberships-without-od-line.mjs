/**
 * P0-5 — SALT-OKUNUR RAPOR: OD satırı olmayan siparişten açılmış olabilecek OD üyelikleri.
 *
 * Kullanım:
 *   node --conditions react-server --import tsx scripts/report-od-memberships-without-od-line.mjs
 *   (npm run commerce:report:od-without-od-line)
 *
 * GÜVENLİK: bu betik HİÇBİR yazma yapmaz (yalnız `findMany` / `findUnique`).
 * Hiçbir üyeliği iptal etmez, siparişe veya ödemeye dokunmaz. Çıktı yönetimin
 * tek tek incelemesi içindir; belirsiz eski (satırsız) siparişler aday sayılmaz.
 *
 * Çıktı JSON: { checkedAt, totals: { scanned, byClassification }, candidates: [...] }
 * E-posta varsayılan olarak maskelenir; operasyonel inceleme için
 * `OD_AUDIT_INCLUDE_EMAIL=true` ile tam e-posta yazdırılabilir.
 */
import { runOdMembershipAudit } from "../lib/commerce/od-membership-audit-server.ts";
import { prisma } from "../lib/prisma.ts";

const includeEmail = process.env.OD_AUDIT_INCLUDE_EMAIL === "true";

try {
  const report = await runOdMembershipAudit({ includeEmail });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await prisma.$disconnect();
}
