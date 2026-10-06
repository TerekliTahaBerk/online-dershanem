import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach } from "node:test";

import { Prisma } from "@prisma/client";
import { prisma as db } from "@/lib/prisma";
import { defaultOdkPackagePolicy } from "@/lib/odk/product-contract";
import { grantStaffRole, listStaffAssignmentHistory, revokeStaffRole } from "@/lib/products/staff-assignment-server";
import { runStaffAssignmentBackfill } from "@/lib/products/staff-assignment-backfill-server";
import { hasStaffPermission, staffAccessibleProducts, staffProductRelationshipEvidence, userRequiresMfa } from "@/lib/products/staff-permissions";
import { integration } from "./integration-utils";

/**
 * PHASE 1 — ürün personel ataması değişmezleri (gerçek Postgres).
 *  - kısmi tekil indeks: aynı (kullanıcı, ürün, rol) için tek AKTİF satır,
 *  - iptal + yeniden verme yeni satır açar; geçmiş korunur,
 *  - geçiş (R1–R3) idempotenttir ve R3 dışındakilere rapor rolü vermez,
 *  - enforce modunda karar atamalardır; ADMIN satırsız da yetkilidir.
 */

const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";
const created = { userIds: [] as string[], packageIds: [] as string[] };
const ORIGINAL_MODE = process.env.STAFF_PRODUCT_ASSIGNMENTS;

afterEach(() => {
  if (ORIGINAL_MODE === undefined) delete process.env.STAFF_PRODUCT_ASSIGNMENTS;
  else process.env.STAFF_PRODUCT_ASSIGNMENTS = ORIGINAL_MODE;
});

after(async () => {
  const ids = created.userIds;
  const assignments = await db.productStaffAssignment.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  await db.auditLog.deleteMany({
    where: { OR: [{ actorUserId: { in: ids } }, { entityId: { in: [...ids, ...assignments.map((row) => row.id)] } }] },
  });
  await db.productStaffAssignment.deleteMany({ where: { userId: { in: ids } } });
  await db.odkEntitlement.deleteMany({ where: { userId: { in: ids } } });
  await db.productMembership.deleteMany({ where: { userId: { in: ids } } });
  await db.odkPackage.deleteMany({ where: { id: { in: created.packageIds } } });
  await db.enrollment.deleteMany({ where: { student: { userId: { in: ids } } } });
  await db.group.deleteMany({ where: { teacherId: { in: ids } } });
  await db.teacherProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.studentProfile.deleteMany({ where: { userId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
});

async function user(role: "ADMIN" | "TEACHER" | "STUDENT", label: string, status: "ACTIVE" | "ARCHIVED" = "ACTIVE") {
  const row = await db.user.create({
    data: {
      email: `phase1-${label}-${randomUUID().slice(0, 8)}@example.com`,
      passwordHash: PASSWORD_HASH,
      mustChangePassword: false,
      inviteAcceptedAt: new Date(),
      role,
      status,
      fullName: `Phase1 ${label}`,
    },
  });
  created.userIds.push(row.id);
  return row;
}

async function productId(code: "OD" | "OK" | "ODK") {
  return (await db.product.findUniqueOrThrow({ where: { code }, select: { id: true } })).id;
}

/** ODK öğrencisi: aktif üyelik + verilen `teacherReports` hakkıyla aktif sözleşme. */
async function odkStudentInGroupOf(teacherId: string, teacherReports: boolean) {
  const student = await user("STUDENT", "odk-student");
  const profile = await db.studentProfile.create({ data: { userId: student.id } });
  await db.productMembership.create({ data: { userId: student.id, product: "ODK", startsAt: new Date(0) } });
  const policy = { ...defaultOdkPackagePolicy, rights: { ...defaultOdkPackagePolicy.rights, teacherReports } };
  const pkg = await db.odkPackage.create({
    data: { title: "phase1 ODK", slug: `phase1-odk-${randomUUID().slice(0, 8)}`, priceCents: 1000, contractPolicy: policy as unknown as Prisma.InputJsonValue },
  });
  created.packageIds.push(pkg.id);
  const snapshot = {
    schemaVersion: 1,
    catalogVersion: 1,
    capturedAt: new Date().toISOString(),
    package: { id: pkg.id, slug: pkg.slug, title: pkg.title, description: null, priceCents: 1000, originalPriceCents: null },
    policy: { ...policy, sales: { state: "AVAILABLE" } },
    exams: [],
  };
  await db.odkEntitlement.create({ data: { userId: student.id, packageId: pkg.id, startsAt: new Date(0), contractSnapshot: snapshot as Prisma.InputJsonValue } });
  const group = await db.group.create({ data: { name: "phase1 grup", subject: "Matematik", teacherId } });
  await db.enrollment.create({ data: { groupId: group.id, studentId: profile.id } });
  return student;
}

integration("kısmi tekil indeks ikinci AKTİF satırı reddeder; iptal + yeniden verme geçmişi korur", async () => {
  const admin = await user("ADMIN", "admin");
  const teacher = await user("TEACHER", "teacher");
  const odk = await productId("ODK");

  const first = await grantStaffRole({ userId: teacher.id, productCode: "ODK", role: "EXAM_EDITOR", actorUserId: admin.id, reason: "test" });
  assert.equal(first.created, true);

  await assert.rejects(
    db.productStaffAssignment.create({ data: { userId: teacher.id, productId: odk, role: "EXAM_EDITOR" } }),
    (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002",
    "SQL kısmi tekil indeks ikinci aktif satırı reddetmeli",
  );

  const again = await grantStaffRole({ userId: teacher.id, productCode: "ODK", role: "EXAM_EDITOR", actorUserId: admin.id, reason: "tekrar" });
  assert.deepEqual(again, { assignmentId: first.assignmentId, created: false }, "verme idempotent");

  const revoked = await revokeStaffRole({ assignmentId: first.assignmentId, userId: teacher.id, actorUserId: admin.id, reason: "görev değişti" });
  assert.equal(revoked.revoked, true);
  const regrant = await grantStaffRole({ userId: teacher.id, productCode: "ODK", role: "EXAM_EDITOR", actorUserId: admin.id, reason: "geri döndü" });
  assert.equal(regrant.created, true);
  assert.notEqual(regrant.assignmentId, first.assignmentId, "yeniden verme YENİ satır açar");

  const history = await listStaffAssignmentHistory(teacher.id);
  assert.equal(history.length, 2, "iki satır da korunur");
  const closed = history.find((row) => row.id === first.assignmentId);
  assert.ok(closed?.revokedAt, "ilk satır kapalı");
  assert.equal(closed?.revokeReason, "görev değişti");

  const audits = await db.auditLog.count({ where: { entityId: { in: [first.assignmentId, regrant.assignmentId] }, action: { in: ["product_staff.granted", "product_staff.revoked"] } } });
  assert.equal(audits, 3, "iki verme + bir iptal denetlenir");
});

integration("COACH ataması isCoach ile çift yazılır; yalnız TEACHER hesabına verilir", async () => {
  const admin = await user("ADMIN", "admin");
  const teacher = await user("TEACHER", "coach");
  const grant = await grantStaffRole({ userId: teacher.id, productCode: "OK", role: "COACH", actorUserId: admin.id, reason: "koç" });
  assert.equal((await db.teacherProfile.findUnique({ where: { userId: teacher.id } }))?.isCoach, true);
  await revokeStaffRole({ assignmentId: grant.assignmentId, userId: teacher.id, actorUserId: admin.id, reason: "bıraktı" });
  assert.equal((await db.teacherProfile.findUnique({ where: { userId: teacher.id } }))?.isCoach, false);

  const student = await user("STUDENT", "not-staff");
  await assert.rejects(grantStaffRole({ userId: student.id, productCode: "OD", role: "TEACHER", actorUserId: admin.id, reason: "x" }), /yalnız personel/);
  await assert.rejects(grantStaffRole({ userId: admin.id, productCode: "ODK", role: "RESULT_PUBLISHER", actorUserId: admin.id, reason: "x" }), /Yönetici/);
  await assert.rejects(grantStaffRole({ userId: teacher.id, productCode: "OD", role: "EXAM_EDITOR", actorUserId: admin.id, reason: "x" }), /geçerli değil/);
});

integration("geçiş R1–R3: idempotent, R3 yalnız teacherReports ilişkisi olana, arşiv atlanır", async () => {
  const plain = await user("TEACHER", "plain");
  const coach = await user("TEACHER", "isCoach");
  await db.teacherProfile.create({ data: { userId: coach.id, isCoach: true } });
  const reporter = await user("TEACHER", "r3");
  await odkStudentInGroupOf(reporter.id, true);
  const noRights = await user("TEACHER", "r3-negative");
  await odkStudentInGroupOf(noRights.id, false);
  const archived = await user("TEACHER", "archived", "ARCHIVED");
  const mine = new Set([plain.id, coach.id, reporter.id, noRights.id, archived.id]);

  const dry = await runStaffAssignmentBackfill({ apply: false });
  assert.equal(await db.productStaffAssignment.count({ where: { userId: { in: [...mine] } } }), 0, "dry-run yazmaz");
  assert.ok(dry.grants.filter((g) => mine.has(g.userId)).every((g) => g.result === "planned"));

  const first = await runStaffAssignmentBackfill({ apply: true });
  const mineGrants = first.grants.filter((g) => mine.has(g.userId));
  const key = (g: { userId: string; product: string; role: string }) => `${g.userId}:${g.product}:${g.role}`;
  assert.deepEqual(
    new Set(mineGrants.map(key)),
    new Set([
      `${plain.id}:OD:TEACHER`,
      `${coach.id}:OD:TEACHER`,
      `${coach.id}:OK:COACH`,
      `${reporter.id}:OD:TEACHER`,
      `${reporter.id}:ODK:REPORT_VIEWER`,
      `${noRights.id}:OD:TEACHER`,
    ]),
  );
  assert.ok(mineGrants.every((g) => g.result === "created"));
  const rows = await db.productStaffAssignment.findMany({ where: { userId: { in: [...mine] } } });
  assert.ok(rows.every((row) => row.source === "LEGACY_BACKFILL" && row.grantedById === null && row.grantReason?.startsWith("Geçiş R")));
  assert.equal(rows.some((row) => row.userId === archived.id), false, "arşivlenmiş hesaba satır yok");

  const second = await runStaffAssignmentBackfill({ apply: true });
  assert.equal(second.grants.filter((g) => mine.has(g.userId)).length, 0, "ikinci çalıştırma hiçbir şey planlamaz");
  assert.equal(await db.productStaffAssignment.count({ where: { userId: { in: [...mine] } } }), rows.length);

  // Shadow sınıflandırması R3 ile aynı ilişkiyi kullanır.
  assert.equal(await staffProductRelationshipEvidence(reporter.id, "ODK"), true);
  assert.equal(await staffProductRelationshipEvidence(noRights.id, "ODK"), false, "teacherReports yoksa EXPECTED_NARROWING");
});

integration("shadow eski kararı döndürür; enforce atamaları uygular; ADMIN satırsız yetkili", async () => {
  const admin = await user("ADMIN", "admin");
  const teacher = await user("TEACHER", "od-only");
  await grantStaffRole({ userId: teacher.id, productCode: "OD", role: "TEACHER", actorUserId: admin.id, reason: "test" });

  process.env.STAFF_PRODUCT_ASSIGNMENTS = "shadow";
  assert.deepEqual(await staffAccessibleProducts(teacher.id, "TEACHER"), ["OD", "OK", "ODK"], "shadow: erişim değişmez");
  assert.equal(await hasStaffPermission(teacher.id, "ok:coaching:write"), true, "shadow: eski izin");
  assert.equal(await hasStaffPermission(teacher.id, "odk:exam:edit"), false, "eski kural da öğretmene deneme düzenletmez");

  process.env.STAFF_PRODUCT_ASSIGNMENTS = "enforce";
  assert.deepEqual(await staffAccessibleProducts(teacher.id, "TEACHER"), ["OD"]);
  assert.equal(await hasStaffPermission(teacher.id, "od:lesson:teach"), true);
  assert.equal(await hasStaffPermission(teacher.id, "ok:coaching:write"), false, "koç olmayan öğretmen Yön yazamaz");
  assert.equal(await hasStaffPermission(teacher.id, "odk:report:read_related"), false);
  assert.equal(await userRequiresMfa(teacher.id, "TEACHER"), false);

  // Break-glass: hiç yayıncı satırı olmasa da ADMIN yayınlar.
  const publisher = await user("TEACHER", "publisher");
  const grant = await grantStaffRole({ userId: publisher.id, productCode: "ODK", role: "RESULT_PUBLISHER", actorUserId: admin.id, reason: "yayın" });
  assert.equal(await hasStaffPermission(publisher.id, "odk:result:release"), true);
  assert.equal(await userRequiresMfa(publisher.id, "TEACHER"), true, "ayrıcalıklı personel MFA ister");
  await revokeStaffRole({ assignmentId: grant.assignmentId, userId: publisher.id, actorUserId: admin.id, reason: "ayrıldı" });
  assert.equal(await hasStaffPermission(publisher.id, "odk:result:release"), false);
  assert.equal(await hasStaffPermission(admin.id, "odk:result:release"), true, "ADMIN her zaman yayınlar");
  assert.deepEqual(await staffAccessibleProducts(admin.id, "ADMIN"), ["OD", "OK", "ODK"]);
});
