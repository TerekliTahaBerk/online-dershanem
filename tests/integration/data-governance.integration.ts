import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { after } from "node:test";
import type { PrismaClient } from "@prisma/client";

import { ApprovalError, assertApprovalShape, resolveApproval } from "../../lib/data-governance/approval";
import {
  DsrError,
  applyErasure,
  cancelErasure,
  collectSubjectExport,
  exportTombstoneLedger,
  reapplyTombstones,
  requestErasure,
} from "../../lib/data-governance/dsr";
import { enforceRetention } from "../../lib/data-governance/enforce-retention";
import { PENDING_LEGAL_APPROVAL, type RetentionCategory } from "../../lib/data-governance/retention-policy";
import { assertIntegrationSchemaReady, createIntegrationPrismaClient, integration, integrationEnabled } from "./integration-utils";

// Yalnız sentetik veri: her kayıt bu koşuya özgü e-posta ekiyle yaratılır ve sonunda silinir.
const db: PrismaClient | null = integrationEnabled ? createIntegrationPrismaClient() : null;
const run = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DAY = 86_400_000;
const createdUserIds: string[] = [];
const createdTombstoneIds: string[] = [];
const createdLeadIds: string[] = [];

after(async () => {
  if (!db) return;
  await db.auditLog.deleteMany({ where: { OR: [{ actorUserId: { in: createdUserIds } }, { entityId: { in: [...createdTombstoneIds, ...createdUserIds] } }] } });
  await db.dataSubjectTombstone.deleteMany({ where: { id: { in: createdTombstoneIds } } });
  await db.retentionMark.deleteMany({ where: { category: { startsWith: `it-${run}` } } });
  await db.businessLead.deleteMany({ where: { id: { in: createdLeadIds } } });
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await db.$disconnect();
});

async function syntheticUser(role: "ADMIN" | "STUDENT", label: string) {
  const user = await db!.user.create({
    data: {
      email: `it-${label}-${run}@example.invalid`,
      passwordHash: "scrypt$synthetic",
      role,
      status: "ACTIVE",
      fullName: role === "STUDENT" ? `Sentetik ${label}` : null,
      phone: role === "STUDENT" ? "+905550000000" : null,
      ...(role === "STUDENT" ? { studentProfile: { create: { schoolName: "Sentetik Okul", targetGoal: "Sentetik hedef" } } } : {}),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

integration("saklama motoru: onaylı süre işaretler, bekleme sonrası siler; onay bekleyen kategoriye dokunmaz", async () => {
  await assertIntegrationSchemaReady(db!);
  const student = await syntheticUser("STUDENT", "retention");
  const admin = await syntheticUser("ADMIN", "retention-admin");
  const now = new Date();
  const old = await db!.notification.create({ data: { userId: student.id, type: "SYSTEM", title: "eski", body: "sentetik", createdAt: new Date(now.getTime() - 400 * DAY) } });
  const fresh = await db!.notification.create({ data: { userId: student.id, type: "SYSTEM", title: "yeni", body: "sentetik", createdAt: now } });
  const untouched = await db!.notification.create({ data: { userId: admin.id, type: "SYSTEM", title: "eski-pending", body: "sentetik", createdAt: new Date(now.getTime() - 4000 * DAY) } });

  const policy: RetentionCategory[] = [
    {
      category: `it-${run}-approved`, description: "sentetik", enforcement: "RETENTION_ENGINE", childData: false,
      targets: [{ model: "Notification", dateField: "createdAt", where: { userId: student.id } }],
      retentionDays: 365, approvedBy: "Entegrasyon testi (sentetik)", approvedAt: "2026-09-14",
    },
    {
      category: `it-${run}-pending`, description: "sentetik", enforcement: "RETENTION_ENGINE", childData: false,
      targets: [{ model: "Notification", dateField: "createdAt", where: { userId: admin.id } }],
      retentionDays: PENDING_LEGAL_APPROVAL,
    },
  ];

  const dry = await enforceRetention({ db: db!, dryRun: true, policy, now });
  assert.equal(await db!.retentionMark.count({ where: { recordId: old.id } }), 0, "dry-run işaret yazmaz");
  const dryApproved = dry.categories[0];
  assert.ok(dryApproved.status === "ENFORCED" && dryApproved.targets[0].eligible === 1 && dryApproved.targets[0].newlyMarked === 1);
  assert.deepEqual(dry.categories[1], { category: `it-${run}-pending`, status: "PENDING_LEGAL_APPROVAL", recordCount: 1, message: `it-${run}-pending için 1 kayıt hukuki onay bekliyor, silinmedi` });

  await assert.rejects(() => enforceRetention({ db: db!, dryRun: false, policy, now }), /onay/);
  const approval = await resolveApproval(db!, { approvedBy: admin.email, ticket: `IT-${run}` });

  const marked = await enforceRetention({ db: db!, dryRun: false, policy, now, approval, graceDays: 30 });
  assert.ok(marked.categories[0].status === "ENFORCED" && marked.categories[0].targets[0].newlyMarked === 1 && marked.categories[0].targets[0].purged === 0);
  assert.ok(await db!.notification.findUnique({ where: { id: old.id } }), "bekleme süresinde kayıt yerinde (geri alınabilir)");
  assert.equal(await db!.auditLog.count({ where: { action: "retention.enforcement_approved", actorUserId: admin.id } }), 1);

  const purged = await enforceRetention({ db: db!, dryRun: false, policy, now: new Date(now.getTime() + 31 * DAY), approval, graceDays: 30 });
  assert.ok(purged.categories[0].status === "ENFORCED" && purged.categories[0].targets[0].purged === 1);
  assert.equal(await db!.notification.findUnique({ where: { id: old.id } }), null, "süresi dolan kayıt silindi");
  assert.ok(await db!.notification.findUnique({ where: { id: fresh.id } }), "süresi dolmayan kayıt korundu");
  assert.ok(await db!.notification.findUnique({ where: { id: untouched.id } }), "PENDING kategori kaydı korundu");
  assert.ok((await db!.retentionMark.findFirst({ where: { recordId: old.id } }))?.purgedAt);
});

integration("DSR: export tüm kategorileri içerir, onaysız silme reddedilir, onaylı akış tombstone ve audit bırakır", async () => {
  await assertIntegrationSchemaReady(db!);
  const admin = await syntheticUser("ADMIN", "dsr-admin");
  const student = await syntheticUser("STUDENT", "dsr-student");
  await db!.session.create({ data: { userId: student.id, tokenHash: `it-${run}-token`, expiresAt: new Date(Date.now() + DAY) } });
  await db!.notification.create({ data: { userId: student.id, type: "SYSTEM", title: "sentetik", body: "sentetik" } });
  const unit = await db!.businessUnit.findFirst({ select: { id: true } });
  if (unit) {
    const lead = await db!.businessLead.create({ data: { businessUnitId: unit.id, source: "MANUAL", relatedOdUserId: student.id, firstName: "Sentetik", phone: "+905550000000" } });
    createdLeadIds.push(lead.id);
  }
  await db!.auditLog.create({ data: { actorType: "SYSTEM", entityType: "User", entityId: student.id, action: "it.synthetic" } });

  const exported = await collectSubjectExport(db!, student.id, { ticketRef: `IT-${run}` });
  const models = new Set(exported.tables.map((table) => table.model));
  for (const model of ["User", "StudentProfile", "Session", "Notification", "AuditLog", ...(unit ? ["BusinessLead"] : [])]) assert.ok(models.has(model), `export ${model} içermeli`);
  const serialized = JSON.stringify(exported);
  assert.ok(!serialized.includes("scrypt$synthetic") && !serialized.includes(`it-${run}-token`), "kimlik doğrulama sırları dışa aktarılmaz");
  assert.equal(exported.meta.humanReviewRequired, true);

  // Onaysız reddetme: hem kütüphane kapısı hem CLI.
  assert.throws(() => assertApprovalShape({ approvedBy: null, ticket: null }), ApprovalError);
  await assert.rejects(() => resolveApproval(db!, { approvedBy: student.email, ticket: `IT-${run}` }), /ADMIN/);
  const cli = await promisify(execFile)(process.execPath, ["--conditions", "react-server", "--import", "tsx", "scripts/dsr-request.mjs", "--action", "delete", "--user-id", student.id], { env: process.env })
    .then(() => ({ code: 0, stderr: "" }), (error: { code: number; stderr: string }) => ({ code: error.code, stderr: error.stderr }));
  assert.equal(cli.code, 2);
  assert.match(cli.stderr, /Onay parametreleri eksik/);
  assert.equal((await db!.user.findUniqueOrThrow({ where: { id: student.id } })).status, "ACTIVE", "reddedilen komut veriye dokunmadı");

  const approval = await resolveApproval(db!, { approvedBy: admin.email, ticket: `IT-${run}` });
  const t0 = new Date();
  const first = await requestErasure(db!, { subjectUserId: student.id, action: "ANONYMIZE", approval, now: t0 });
  createdTombstoneIds.push(first.id);
  assert.equal((await db!.user.findUniqueOrThrow({ where: { id: student.id } })).status, "SUSPENDED");
  assert.equal(await db!.session.count({ where: { userId: student.id, revokedAt: null } }), 0);
  await assert.rejects(() => requestErasure(db!, { subjectUserId: student.id, action: "DELETE", approval }), (error: unknown) => error instanceof DsrError && error.code === "duplicate_request");
  await assert.rejects(() => applyErasure(db!, { requestId: first.id, approval, now: t0 }), (error: unknown) => error instanceof DsrError && error.code === "grace_not_elapsed");

  await cancelErasure(db!, { requestId: first.id, approval });
  assert.equal((await db!.user.findUniqueOrThrow({ where: { id: student.id } })).status, "ACTIVE", "iptal hesabı geri yükler");

  const second = await requestErasure(db!, { subjectUserId: student.id, action: "ANONYMIZE", approval, now: t0 });
  createdTombstoneIds.push(second.id);
  const applied = await applyErasure(db!, { requestId: second.id, approval, now: new Date(t0.getTime() + 8 * DAY) });
  assert.equal(applied.outcome.outcome, "APPLIED");
  const anonymized = await db!.user.findUniqueOrThrow({ where: { id: student.id }, include: { studentProfile: true } });
  assert.match(anonymized.email, /@anonymized\.invalid$/);
  assert.equal(anonymized.fullName, null);
  assert.equal(anonymized.phone, null);
  assert.equal(anonymized.studentProfile?.schoolName, null);
  assert.equal(await db!.notification.count({ where: { userId: student.id } }), 0);
  assert.equal(await db!.session.count({ where: { userId: student.id } }), 0);
  if (unit) assert.equal((await db!.businessLead.findUniqueOrThrow({ where: { id: createdLeadIds[0] } })).firstName, null);
  const actions = (await db!.auditLog.findMany({ where: { entityId: second.id }, select: { action: true, actorUserId: true } }));
  assert.deepEqual(actions.map((row) => row.action).sort(), ["dsr.erasure_applied", "dsr.erasure_apply_approved", "dsr.erasure_requested"]);
  assert.ok(actions.every((row) => row.actorUserId === admin.id), "audit kim sorusunu onaylayan admin ile yanıtlar");

  // DELETE akışı ayrı bir sentetik öğrenciyle.
  const deletable = await syntheticUser("STUDENT", "dsr-delete");
  const deletion = await requestErasure(db!, { subjectUserId: deletable.id, action: "DELETE", approval, now: t0 });
  createdTombstoneIds.push(deletion.id);
  const deleted = await applyErasure(db!, { requestId: deletion.id, approval, now: new Date(t0.getTime() + 8 * DAY) });
  assert.equal(deleted.outcome.outcome, "APPLIED");
  assert.equal(await db!.user.findUnique({ where: { id: deletable.id } }), null);
  assert.equal((await db!.dataSubjectTombstone.findUniqueOrThrow({ where: { id: deletion.id } })).status, "APPLIED");

  // Defter idempotent: canlı DB'de yeniden uygulama hiçbir şeyi değiştirmez.
  const ledger = await exportTombstoneLedger(db!);
  const mine = { ...ledger, entries: ledger.entries.filter((entry) => createdTombstoneIds.includes(entry.id)) };
  const reapplied = await reapplyTombstones(db!, mine);
  assert.equal(reapplied.reapplied, 0);
  assert.equal(reapplied.alreadyClean, 2);
});
