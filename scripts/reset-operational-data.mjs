/**
 * Operasyon verisini sıfırlar: tek bir hesap (`--keep`) dışındaki bütün
 * kullanıcıları ve onlara bağlı kayıtları, bütün sipariş / ödeme kayıtlarını,
 * başvuruları (Aktivasyon masası) ve e-posta kuyruğunu siler.
 *
 * KORUNANLAR: tutulan hesap ve kendi kayıtları; katalog ve içerik (paketler,
 * ürünler, müfredat, Deneme Ligi denemeleri, materyaller). Bu içerikleri başka
 * bir hesap oluşturduysa yazar alanı tutulan hesaba devredilir — silinmez.
 * `AuditLog` güvenlik kaydıdır ve kullanıcıya FK ile bağlı değildir; dokunulmaz.
 *
 * Silme sırası şemadan (pg_constraint) okunur: bir satır silinmeden önce ona
 * FK ile bağlı (CASCADE / RESTRICT / NO ACTION) satırlar özyinelemeli silinir;
 * SET NULL bağları veritabanına bırakılır. Her şey TEK transaction'dadır.
 *
 * Varsayılan KURU ÇALIŞTIRMA: aynı işlem yapılır, tablo başına silinecek satır
 * sayıları yazılır ve transaction geri alınır. Kalıcı silme için
 * `--execute` ve `CONFIRM_RESET=<tutulan e-posta>` birlikte gerekir.
 *
 * Kullanım (canlıda DATABASE_URL Accelerate olduğu için DIRECT_URL şart;
 * önce yedek alın):
 *   DATABASE_URL="<DIRECT_URL>" node scripts/reset-operational-data.mjs --keep=ad@ornek.com
 *   DATABASE_URL="<DIRECT_URL>" CONFIRM_RESET=ad@ornek.com node scripts/reset-operational-data.mjs --keep=ad@ornek.com --execute
 */
import { PrismaClient } from "@prisma/client";
import { cliLog } from "./lib/cli-logger.mjs";

/** Tamamı silinen operasyon tabloları (sipariş, ödeme, başvuru, kuyruk). */
const WIPE_TABLES = [
  "od_orders",
  "odk_orders",
  "od_payments",
  "odk_payments",
  "commerce_order_lines",
  "coupon_redemptions",
  "odk_entitlements",
  "PurchaseIntent",
  "PurchaseEvent",
  "od_onboardings",
  "LeadSubmission",
  "contact_form_submissions",
  "email_outbox",
];

/**
 * Katalog / içerik yazarı olan RESTRICT bağları: satır silinmez, yazar tutulan
 * hesaba devredilir. Diğer bütün bağlar silinen kullanıcıyla birlikte gider.
 */
const REASSIGN_AUTHOR_COLUMNS = [
  ["curriculum_versions", "created_by_id"],
  ["learning_materials", "created_by_id"],
  ["lesson_outcomes", "linked_by_id"],
  ["assignment_outcomes", "linked_by_id"],
  ["odk_exam_series", "created_by_id"],
  ["odk_exams", "created_by_id"],
  ["odk_exam_versions", "created_by_id"],
  ["odk_exam_files", "uploaded_by_id"],
  ["odk_answer_key_revisions", "changed_by_id"],
  ["odk_import_audits", "created_by_id"],
  ["odk_attempt_scores", "scored_by_id"],
  ["odk_exam_assignments", "assigned_by_id"],
  ["pilot_cohorts", "created_by_id"],
  ["odk_pilot_runs", "created_by_id"],
];

const args = process.argv.slice(2);
const keepArg = args.find((a) => a.startsWith("--keep="))?.slice("--keep=".length).trim().toLowerCase();
const execute = args.includes("--execute");
if (!keepArg) throw new Error("--keep=<e-posta> zorunludur.");
if (execute && process.env.CONFIRM_RESET?.trim().toLowerCase() !== keepArg) {
  throw new Error("Kalıcı silme için CONFIRM_RESET tutulan e-postayla aynı olmalıdır.");
}

class DryRunRollback extends Error {}
const ident = (name) => `"${name.replace(/"/g, '""')}"`;

const prisma = new PrismaClient();

async function main() {
  const report = await prisma.$transaction(async (tx) => {
    const keep = await tx.$queryRawUnsafe(`SELECT id, role::text AS role FROM users WHERE lower(email) = $1`, keepArg);
    if (keep.length !== 1) throw new Error(`Tutulacak hesap bulunamadı: ${keepArg}`);
    if (keep[0].role !== "ADMIN") throw new Error(`Tutulacak hesap ADMIN değil (${keep[0].role}); işlem durduruldu.`);
    const keepId = keep[0].id;

    const tables = (await tx.$queryRawUnsafe(
      `SELECT c.relname AS name FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'`,
    )).map((row) => row.name);
    const countAll = async () => {
      const counts = {};
      for (const table of tables) counts[table] = Number((await tx.$queryRawUnsafe(`SELECT count(*)::bigint AS n FROM ${ident(table)}`))[0].n);
      return counts;
    };
    const before = await countAll();

    // Hedef tablo → ona bağlı FK'ler (SET NULL / SET DEFAULT hariç).
    const fks = await tx.$queryRawUnsafe(`
      SELECT con.conname AS name, src.relname AS child, dst.relname AS parent,
             array(SELECT a.attname::text FROM unnest(con.conkey) WITH ORDINALITY k(n, i) JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.n ORDER BY k.i) AS child_cols,
             array(SELECT a.attname::text FROM unnest(con.confkey) WITH ORDINALITY k(n, i) JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.n ORDER BY k.i) AS parent_cols
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      JOIN pg_class dst ON dst.oid = con.confrelid
      WHERE con.contype = 'f' AND con.connamespace = 'public'::regnamespace AND con.confdeltype IN ('c', 'r', 'a')`);
    const referencing = new Map();
    for (const fk of fks) {
      if (!referencing.has(fk.parent)) referencing.set(fk.parent, []);
      referencing.get(fk.parent).push(fk);
    }

    /** `table` içinde `where` koşulunu sağlayan satırları, onlara bağlı satırlarla birlikte siler. */
    async function deleteWhere(table, where, params, path = []) {
      if (path.length > 40) throw new Error(`FK zinciri çok derin: ${[...path, table].join(" → ")}`);
      for (const fk of referencing.get(table) ?? []) {
        // Kendine dönen bağ (ör. üst kayıt) aynı DELETE içinde çözülür.
        if (fk.child === table) continue;
        const childCols = `(${fk.child_cols.map(ident).join(", ")})`;
        const parentCols = fk.parent_cols.map(ident).join(", ");
        await deleteWhere(fk.child, `${childCols} IN (SELECT ${parentCols} FROM ${ident(table)} WHERE ${where})`, params, [...path, table]);
      }
      await tx.$executeRawUnsafe(`DELETE FROM ${ident(table)} WHERE ${where}`, ...params);
    }

    for (const [table, column] of REASSIGN_AUTHOR_COLUMNS) {
      if (!tables.includes(table)) continue;
      await tx.$executeRawUnsafe(`UPDATE ${ident(table)} SET ${ident(column)} = $1 WHERE ${ident(column)} <> $1`, keepId);
    }
    for (const table of WIPE_TABLES) {
      if (!tables.includes(table)) throw new Error(`Beklenen tablo yok: ${table} (şema değişmiş olabilir).`);
      await deleteWhere(table, "TRUE", []);
    }
    await deleteWhere("users", `id <> $1`, [keepId]);

    const after = await countAll();
    const deleted = Object.fromEntries(
      tables.map((t) => [t, before[t] - after[t]]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]),
    );
    const remainingUsers = after.users;
    if (remainingUsers !== 1) throw new Error(`Silme sonrası ${remainingUsers} kullanıcı kaldı; beklenen 1.`);
    const result = { keepId, deleted, totalDeleted: Object.values(deleted).reduce((a, b) => a + b, 0) };
    if (!execute) throw Object.assign(new DryRunRollback("dry-run"), { result });
    return result;
  }, { timeout: 10 * 60_000, maxWait: 60_000 });
  return report;
}

try {
  const result = await main();
  cliLog.info("Silme TAMAMLANDI (kalıcı).", { kept: keepArg, totalDeleted: result.totalDeleted });
  cliLog.info("Tablo başına silinen satır:", result.deleted);
} catch (error) {
  if (error instanceof DryRunRollback) {
    cliLog.info("KURU ÇALIŞTIRMA: hiçbir şey silinmedi, transaction geri alındı.", { kept: keepArg, wouldDelete: error.result.totalDeleted });
    cliLog.info("Tablo başına silinecek satır:", error.result.deleted);
  } else {
    cliLog.error("Durduruldu; hiçbir değişiklik kalıcı olmadı.", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
