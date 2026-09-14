import assert from "node:assert/strict";

import type { UserRole } from "@prisma/client";
import {
  getAccessibleProductCodes,
  getAccessibleProducts,
  hasProductAccess,
  hasProductCodeAccess,
} from "../../lib/auth/products";
import { isStudentUserVisibleToParents, listParentVisibleChildren } from "../../lib/panel/parent-product-policy";
import {
  authorizeCurriculumOutcomeWrite,
  hasProductContentPermission,
} from "../../lib/products/content-permissions";
import { grantProductMembership, revokeProductMembership } from "../../lib/products/membership-server";
import { resolveStudentScopeForViewer } from "../../lib/student-success/server/viewer-scope";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

/**
 * KPSS Görev 4 — RBAC ve roller.
 *
 * Route handler'lar doğrudan çağrılamadığı için (bkz. docs/integration-test-strategy.md)
 * sözleşme, guard'ların ve route'ların çağırdığı sunucu modülleri üzerinden test edilir:
 * `requireApiProductRole` → `hasProductAccess`, veli sayfaları → `resolveParentScope` →
 * `listParentVisibleChildren` (sayfa modülü `next/navigation` nedeniyle Node altında yüklenemez),
 * student-success API'leri → `resolveStudentScopeForViewer`, bağlantı/takvim API'leri →
 * `isStudentUserVisibleToParents`, kazanım API'si → `authorizeCurriculumOutcomeWrite`.
 */

const db = createIntegrationPrismaClient();
const PASSWORD_HASH = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function createFixture() {
  const runId = crypto.randomUUID().slice(0, 8);
  const kpss = await db.product.upsert({
    where: { code: "KPSS" },
    update: { isActive: true },
    create: { code: "KPSS", name: "KPSS", targetAudience: "adult" },
  });
  const kpssFamily = await db.examFamily.upsert({
    where: { code: "KPSS_EGITIM_BILIMLERI" },
    update: { productId: kpss.id, isActive: true },
    create: { code: "KPSS_EGITIM_BILIMLERI", name: "KPSS Eğitim Bilimleri", productId: kpss.id },
  });
  const odRegistry = await db.product.findUniqueOrThrow({ where: { code: "OD" } });

  const user = (label: string, role: UserRole) =>
    db.user.create({
      data: {
        email: `kpss-rbac-${label}-${runId}@example.com`,
        fullName: `KPSS RBAC ${label}`,
        passwordHash: PASSWORD_HASH,
        mustChangePassword: false,
        role,
        status: "ACTIVE",
      },
    });

  const [admin, parent, odTeacher, kpssEditor, kpssOnlyUser, kpssOdUser, odOnlyUser] = await Promise.all([
    user("admin", "ADMIN"),
    user("parent", "PARENT"),
    user("od-teacher", "TEACHER"),
    user("kpss-editor", "TEACHER"),
    user("kpss-only", "STUDENT"),
    user("kpss-od", "STUDENT"),
    user("od-only", "STUDENT"),
  ]);
  const [kpssOnly, kpssOd, odOnly] = await Promise.all(
    [kpssOnlyUser, kpssOdUser, odOnlyUser].map((student) => db.studentProfile.create({ data: { userId: student.id } })),
  );

  await grantProductMembership({ userId: kpssOnlyUser.id, productCode: "KPSS", source: "MANUAL", grantedById: admin.id });
  await grantProductMembership({ userId: kpssOdUser.id, productCode: "KPSS", source: "MANUAL", grantedById: admin.id });
  await grantProductMembership({ userId: kpssOdUser.id, productCode: "OD", source: "MANUAL", grantedById: admin.id });
  // Mevcut provizyon yolları gibi YALNIZ enum ile yazılan legacy satır.
  const legacyRow = await db.productMembership.create({ data: { userId: odOnlyUser.id, product: "OD", source: "PURCHASE" } });

  for (const student of [kpssOnly, kpssOd, odOnly]) {
    await db.parentStudent.create({ data: { parentId: parent.id, studentId: student.id, active: true } });
  }

  await db.productContentRoleAssignment.create({
    data: { userId: kpssEditor.id, productId: kpss.id, role: "CONTENT_EDITOR", grantedById: admin.id },
  });

  const kpssVersion = await db.curriculumVersion.create({
    data: { code: `KPSS-RBAC-${runId}`, title: "KPSS RBAC test", examFamilyRefId: kpssFamily.id, academicYear: 2026, createdById: admin.id },
  });
  const lgsFamily = await db.examFamily.findUnique({ where: { code: "LGS" } });
  const legacyVersion = await db.curriculumVersion.create({
    data: { code: `LGS-RBAC-${runId}`, title: "LGS RBAC test", exam: "LGS", examFamilyRefId: lgsFamily?.id ?? null, academicYear: 2026, createdById: admin.id },
  });

  return {
    kpss, odRegistry, admin, parent, odTeacher, kpssEditor,
    kpssOnlyUser, kpssOdUser, odOnlyUser, kpssOnly, kpssOd, odOnly,
    legacyRow, kpssVersion, legacyVersion,
    userIds: [admin, parent, odTeacher, kpssEditor, kpssOnlyUser, kpssOdUser, odOnlyUser].map((row) => row.id),
  };
}

async function cleanupFixture(fixture: Fixture) {
  await db.parentStudent.deleteMany({ where: { parentId: fixture.parent.id } });
  await db.productContentRoleAssignment.deleteMany({ where: { userId: { in: fixture.userIds } } });
  await db.curriculumVersion.deleteMany({ where: { id: { in: [fixture.kpssVersion.id, fixture.legacyVersion.id] } } });
  await db.productMembership.deleteMany({ where: { userId: { in: fixture.userIds } } });
  await db.studentProfile.deleteMany({ where: { userId: { in: fixture.userIds } } });
  await db.user.deleteMany({ where: { id: { in: fixture.userIds } } });
}

async function withFixture(fn: (fixture: Fixture) => Promise<void>) {
  const fixture = await createFixture();
  try {
    await fn(fixture);
  } finally {
    await cleanupFixture(fixture);
  }
}

integration("Adım 2 köprü: legacy yazım registry'ye bağlanır, KPSS product=NULL ile tekil kalır", async () => {
  await withFixture(async (f) => {
    const legacy = await db.productMembership.findUniqueOrThrow({ where: { id: f.legacyRow.id } });
    assert.equal(legacy.productRefId, f.odRegistry.id, "0106 trigger'ı enum ile yazılan satıra product_ref_id yazmalı");

    const kpssRow = await db.productMembership.findUniqueOrThrow({
      where: { userId_productRefId: { userId: f.kpssOnlyUser.id, productRefId: f.kpss.id } },
    });
    assert.equal(kpssRow.product, null);

    const again = await grantProductMembership({ userId: f.kpssOnlyUser.id, productCode: "KPSS", source: "MANUAL" });
    assert.equal(again.id, kpssRow.id, "adapter idempotent upsert yapmalı");
    await assert.rejects(
      db.productMembership.create({ data: { userId: f.kpssOnlyUser.id, productRefId: f.kpss.id } }),
      /Unique constraint|P2002/,
    );
    await assert.rejects(
      db.productMembership.create({ data: { userId: f.kpssOnlyUser.id } }),
      /product_ref_required|check constraint|23514/i,
      "ürünsüz satır CHECK ile reddedilmeli",
    );
  });
});

integration("Adım 2 regresyon: OD/OK/ODK erişim kararları değişmez, öğretmen KPSS'ye otomatik erişmez", async () => {
  await withFixture(async (f) => {
    assert.deepEqual(await getAccessibleProducts(f.odOnlyUser.id, "STUDENT"), ["OD"]);
    assert.equal(await hasProductAccess(f.odOnlyUser.id, "STUDENT", "OD"), true);
    assert.equal(await hasProductAccess(f.odOnlyUser.id, "STUDENT", "ODK"), false);
    assert.equal(await hasProductAccess(f.odOnlyUser.id, "STUDENT", "OK"), false);
    assert.deepEqual(await getAccessibleProductCodes(f.odOnlyUser.id, "STUDENT"), ["OD"]);

    assert.deepEqual(await getAccessibleProducts(f.odTeacher.id, "TEACHER"), ["OD", "OK", "ODK"]);
    assert.equal(await hasProductCodeAccess(f.odTeacher.id, "TEACHER", "KPSS"), false);
    assert.equal(await hasProductCodeAccess(f.admin.id, "ADMIN", "KPSS"), true);
  });
});

integration("Adım 5 uçtan uca: yalnızca KPSS üyesi KPSS'ye erişir, OD/OK/ODK'ye ve veli akışlarına kapalıdır", async () => {
  await withFixture(async (f) => {
    // KPSS'ye özel erişim
    assert.deepEqual(await getAccessibleProductCodes(f.kpssOnlyUser.id, "STUDENT"), ["KPSS"]);
    assert.equal(await hasProductCodeAccess(f.kpssOnlyUser.id, "STUDENT", "KPSS"), true);

    // OD/OK/ODK'ye özel API'ler (`requireApiProductRole` → `hasProductAccess`) 404 verir
    assert.deepEqual(await getAccessibleProducts(f.kpssOnlyUser.id, "STUDENT"), []);
    for (const product of ["OD", "OK", "ODK"] as const) {
      assert.equal(await hasProductAccess(f.kpssOnlyUser.id, "STUDENT", product), false, product);
      assert.equal(await hasProductCodeAccess(f.kpssOnlyUser.id, "STUDENT", product), false, product);
    }

    // Veli akışları backend'de kapalı
    assert.equal(await isStudentUserVisibleToParents(f.kpssOnlyUser.id), false);
    const children = await listParentVisibleChildren(f.parent.id);
    // resolveParentScope, listede olmayan studentId için notFound() (404) verir.
    assert.ok(!children.some((child) => child.id === f.kpssOnly.id), "veli kapsamına girmemeli");
    assert.equal(await resolveStudentScopeForViewer(f.kpssOnly.id, "PARENT", f.parent.id), null);
    assert.ok(await resolveStudentScopeForViewer(f.kpssOnly.id, "ADMIN", f.admin.id), "admin görmeye devam eder");

    // Üyelik geri alınınca KPSS erişimi düşer; öğrenci "ürünsüz" duruma döner (mevcut davranış)
    await revokeProductMembership({ userId: f.kpssOnlyUser.id, productCode: "KPSS" });
    assert.equal(await hasProductCodeAccess(f.kpssOnlyUser.id, "STUDENT", "KPSS"), false);
  });
});

integration("Adım 3: kural ürün bağlamıdır — KPSS + OD öğrencisinin velisi OD bağlamında görmeye devam eder", async () => {
  await withFixture(async (f) => {
    assert.deepEqual(await getAccessibleProductCodes(f.kpssOdUser.id, "STUDENT"), ["OD", "KPSS"]);
    assert.equal(await isStudentUserVisibleToParents(f.kpssOdUser.id), true);

    const children = await listParentVisibleChildren(f.parent.id);
    const kpssOdChild = children.find((child) => child.id === f.kpssOd.id);
    assert.deepEqual(kpssOdChild?.products, ["OD"], "KPSS veli bağlamına sızmamalı");
    assert.ok(await resolveStudentScopeForViewer(f.kpssOd.id, "PARENT", f.parent.id));

    // Salt OD öğrencisi için veli davranışı değişmedi
    assert.deepEqual(children.find((child) => child.id === f.odOnly.id)?.products, ["OD"]);
    assert.deepEqual(
      new Set(children.map((child) => child.id)),
      new Set([f.kpssOd.id, f.odOnly.id]),
    );
  });
});

integration("Adım 4: kpss:content:write ayrı atamadır — OD öğretmeni KPSS yazamaz, KPSS editörü OD yazamaz", async () => {
  await withFixture(async (f) => {
    assert.equal(await hasProductContentPermission(f.odTeacher.id, "KPSS", "content:write"), false);
    assert.equal(await hasProductContentPermission(f.kpssEditor.id, "KPSS", "content:write"), true);
    assert.equal(await hasProductContentPermission(f.kpssEditor.id, "OD", "content:write"), false);
    assert.equal(await hasProductContentPermission(f.kpssOnlyUser.id, "KPSS", "content:write"), false);

    // Tüketim üyeliği içerik yetkisi vermez
    await grantProductMembership({ userId: f.odTeacher.id, productCode: "KPSS", source: "MANUAL" });
    assert.equal(await hasProductCodeAccess(f.odTeacher.id, "TEACHER", "KPSS"), true);
    assert.equal(await hasProductContentPermission(f.odTeacher.id, "KPSS", "content:write"), false);

    // Kazanım API kararı
    const kpssVersion = { versionId: f.kpssVersion.id };
    const legacyVersion = { versionId: f.legacyVersion.id };
    assert.deepEqual(await authorizeCurriculumOutcomeWrite({ ...kpssVersion, userId: f.odTeacher.id, role: "TEACHER" }), { ok: false });
    assert.deepEqual(
      await authorizeCurriculumOutcomeWrite({ ...kpssVersion, userId: f.kpssEditor.id, role: "TEACHER" }),
      { ok: true, versionId: f.kpssVersion.id, productCode: "KPSS", legacy: false },
    );
    assert.deepEqual(await authorizeCurriculumOutcomeWrite({ ...legacyVersion, userId: f.kpssEditor.id, role: "TEACHER" }), { ok: false });
    assert.equal((await authorizeCurriculumOutcomeWrite({ ...legacyVersion, userId: f.admin.id, role: "ADMIN" })).ok, true);
    assert.equal((await authorizeCurriculumOutcomeWrite({ ...kpssVersion, userId: f.admin.id, role: "ADMIN" })).ok, true);

    // Atama geri alınınca yetki düşer
    await db.productContentRoleAssignment.updateMany({ where: { userId: f.kpssEditor.id }, data: { revokedAt: new Date() } });
    assert.equal(await hasProductContentPermission(f.kpssEditor.id, "KPSS", "content:write"), false);
  });
});
