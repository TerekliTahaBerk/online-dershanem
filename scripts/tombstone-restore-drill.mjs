/**
 * Uçtan uca restore + tombstone tatbikatı — YALNIZ SENTETİK VERİ.
 *
 *   1. Sentetik admin + öğrenci oluştur
 *   2. pg_dump ile "eski yedek" al (silmeden önce)
 *   3. DSR delete talebi + uygula → öğrenci silinir
 *   4. Tombstone defterini dışa aktar (yedekten bağımsız)
 *   5. Eski yedeği restore et → öğrenci GERİ GELİR (önce)
 *   6. Defteri yeniden uygula → öğrenci YOK (sonra)
 *
 * Koruma: DRILL_DATABASE_URL yerel olmalı ve veritabanı adı "drill" veya
 * "test" içermeli. Canlı veritabanında asla çalışmaz.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { applyErasure, exportTombstoneLedger, reapplyTombstones, requestErasure } from "../lib/data-governance/dsr.ts";

const url = process.env.DRILL_DATABASE_URL;
if (!url) throw new Error("DRILL_DATABASE_URL zorunlu");
const parsed = new URL(url);
const databaseName = parsed.pathname.replace(/^\//, "");
if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || !/(drill|test)/i.test(databaseName)) {
  throw new Error("Tatbikat yalnız yerel ve adı drill/test içeren tek kullanımlık veritabanında çalışır");
}
// pg_dump/pg_restore Prisma'nın ?schema= parametresini tanımaz.
const pgUrl = `${parsed.protocol}//${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@${parsed.host}/${databaseName}`;
const pgBin = (name) => (process.env.PG_BIN_DIR ? join(process.env.PG_BIN_DIR, name) : name);

const workdir = mkdtempSync(join(tmpdir(), "tombstone-drill-"));
const dumpFile = join(workdir, "before-deletion.dump");
const suffix = `${Date.now()}`;
const connect = () => new PrismaClient({ datasourceUrl: url });

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

let db = connect();
try {
  const admin = await db.user.create({ data: { email: `drill-admin-${suffix}@example.invalid`, passwordHash: "drill", role: "ADMIN", status: "ACTIVE", mustChangePassword: false } });
  const student = await db.user.create({
    data: {
      email: `drill-student-${suffix}@example.invalid`,
      passwordHash: "drill",
      role: "STUDENT",
      fullName: "Sentetik Öğrenci",
      studentProfile: { create: { schoolName: "Sentetik Okul" } },
      notifications: { create: { type: "SYSTEM", title: "Sentetik", body: "Sentetik bildirim" } },
    },
  });
  check("sentetik öğrenci oluşturuldu", Boolean(await db.user.findUnique({ where: { id: student.id } })));

  await db.$disconnect();
  execFileSync(pgBin("pg_dump"), [pgUrl, "--format=custom", "--no-owner", "--no-acl", `--file=${dumpFile}`], { stdio: "inherit" });
  db = connect();

  const approval = { approverUserId: admin.id, ticketRef: `DRILL-${suffix}` };
  const requestedAt = new Date();
  const tombstone = await requestErasure(db, { subjectUserId: student.id, action: "DELETE", approval, now: requestedAt, graceDays: 0 });
  const applied = await applyErasure(db, { requestId: tombstone.id, approval, now: new Date(requestedAt.getTime() + 1000) });
  check("DSR delete uygulandı", applied.outcome.outcome === "APPLIED", JSON.stringify(applied.outcome));
  check("silme sonrası öğrenci yok", !(await db.user.findUnique({ where: { id: student.id } })));

  const ledger = await exportTombstoneLedger(db);
  check("defter dışa aktarıldı", ledger.entries.some((entry) => entry.id === tombstone.id && entry.status === "APPLIED"));

  await db.$disconnect();
  execFileSync(pgBin("pg_restore"), ["--clean", "--if-exists", "--no-owner", "--no-acl", "--exit-on-error", `--dbname=${pgUrl}`, dumpFile], { stdio: "inherit" });
  db = connect();

  const resurrected = await db.user.findUnique({ where: { id: student.id }, include: { studentProfile: true } });
  const restoredTombstone = await db.dataSubjectTombstone.findUnique({ where: { id: tombstone.id } });
  check("ÖNCE: eski yedek restore edilince silinen öğrenci geri geldi", Boolean(resurrected), resurrected ? "veri yeniden görünür" : "beklenmedik");
  check("ÖNCE: eski yedekte tombstone kaydı yok (defter neden ayrı tutulmalı)", restoredTombstone === null);

  const report = await reapplyTombstones(db, ledger);
  check("tombstone yeniden uygulandı", report.reapplied === 1 && report.blocked.length === 0, JSON.stringify(report));
  check("SONRA: öğrenci restore sonrası yine silinmiş", !(await db.user.findUnique({ where: { id: student.id } })));
  check("SONRA: öğrenci profili ve bildirimi de yok",
    (await db.studentProfile.count({ where: { userId: student.id } })) === 0 && (await db.notification.count({ where: { userId: student.id } })) === 0);
  check("SONRA: tombstone restore edilen DB'ye geri yazıldı", (await db.dataSubjectTombstone.findUnique({ where: { id: tombstone.id } }))?.status === "APPLIED");

  const second = await reapplyTombstones(db, ledger);
  check("yeniden uygulama idempotent", second.reapplied === 0 && second.alreadyClean === 1, JSON.stringify(second));

  await db.auditLog.deleteMany({ where: { OR: [{ entityId: tombstone.id }, { actorUserId: admin.id }] } });
  await db.dataSubjectTombstone.deleteMany({ where: { id: tombstone.id } });
  await db.user.deleteMany({ where: { id: admin.id } });
} finally {
  await db.$disconnect();
  rmSync(workdir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length }, null, 2));
if (failed.length > 0) process.exitCode = 1;
