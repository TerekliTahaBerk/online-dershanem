import assert from "node:assert/strict";
import test from "node:test";
import { getAccessibleProducts, hasProductAccess } from "../../lib/auth/products";
import { learningMaterialAccessScope } from "../../lib/auth/resource-scopes";
import { assertUniqueViolation, integration, prisma } from "./support/harness";
import {
  cleanupFixtures,
  createGroup,
  createStudent,
  createTeacher,
  createUser,
  enroll,
  grantProduct,
  linkParent,
} from "./support/fixtures";

/**
 * OD-012 · ÜRÜN YETKİ MATRİSİ.
 *
 * Unit test (`lib/auth/product-entitlement-matrix.test.ts`) saf fonksiyonu
 * doğruluyor. Buradaki soru başka: ÜYELİK SATIRI gerçek veritabanında hangi
 * hâldeyken erişim doğuyor? İleri tarihli, süresi geçmiş ve iptal edilmiş
 * satırlar sessizce erişim vermemeli — bu kural tek bir Prisma `where`
 * bloğunda yaşıyor ve saf fonksiyon testiyle hiç ölçülmüyordu.
 */

const ALL_PRODUCTS = ["OD", "OK", "ODK"] as const;

integration("personel ürün erişimi üyelik satırına bağlı değildir", async () => {
  const admin = await createUser("ADMIN");
  const { user: teacher } = await createTeacher();

  for (const staff of [admin, teacher]) {
    assert.equal(await prisma.productMembership.count({ where: { userId: staff.id } }), 0);
    assert.deepEqual(await getAccessibleProducts(staff.id, staff.role), ["OD", "OK", "ODK"]);
    for (const product of ALL_PRODUCTS) {
      assert.equal(await hasProductAccess(staff.id, staff.role, product), true);
    }
  }
});

integration("öğrenci yalnız aldığı ürünü görür; diğerleri kapalı kalır", async () => {
  const { user } = await createStudent();
  await grantProduct(user.id, "OK");

  assert.deepEqual(await getAccessibleProducts(user.id, "STUDENT"), ["OK"]);
  assert.equal(await hasProductAccess(user.id, "STUDENT", "OK"), true);
  assert.equal(await hasProductAccess(user.id, "STUDENT", "OD"), false);
  assert.equal(await hasProductAccess(user.id, "STUDENT", "ODK"), false);
});

integration("üyelik satırının zaman ve iptal alanları erişimi gerçekten kapatır", async () => {
  const now = new Date("2026-06-15T12:00:00Z");
  const cases: { label: string; data: Parameters<typeof grantProduct>[2]; expected: boolean }[] = [
    { label: "aktif", data: { startsAt: new Date("2026-06-01T00:00:00Z") }, expected: true },
    { label: "ileri tarihli", data: { startsAt: new Date("2026-07-01T00:00:00Z") }, expected: false },
    { label: "süresi geçmiş", data: { startsAt: new Date("2026-01-01T00:00:00Z"), expiresAt: new Date("2026-06-01T00:00:00Z") }, expected: false },
    { label: "iptal edilmiş", data: { startsAt: new Date("2026-01-01T00:00:00Z"), revokedAt: new Date("2026-06-10T00:00:00Z") }, expected: false },
    // `expiresAt` sınırı KESİN: `gt now`, yani tam bitiş anında erişim yoktur.
    { label: "tam bitiş anında", data: { startsAt: new Date("2026-01-01T00:00:00Z"), expiresAt: now }, expected: false },
    { label: "bitişe bir saniye kala", data: { startsAt: new Date("2026-01-01T00:00:00Z"), expiresAt: new Date(now.getTime() + 1_000) }, expected: true },
  ];

  for (const row of cases) {
    const { user } = await createStudent();
    await grantProduct(user.id, "OD", row.data);
    assert.deepEqual(
      await getAccessibleProducts(user.id, "STUDENT", now),
      row.expected ? ["OD"] : [],
      `${row.label} üyelik yanlış değerlendirildi`,
    );
  }
});

integration("aynı ürün için ikinci üyelik satırı veritabanı düzeyinde reddedilir", async () => {
  const { user } = await createStudent();
  await grantProduct(user.id, "OD", { revokedAt: new Date() });
  assert.deepEqual(await getAccessibleProducts(user.id, "STUDENT"), []);

  // İptalden sonra "yeniden ver" akışı YENİ SATIR AÇAMAZ; tek satır güncellenir.
  await assertUniqueViolation(() => grantProduct(user.id, "OD"));
  await prisma.productMembership.update({
    where: { userId_product: { userId: user.id, product: "OD" } },
    data: { revokedAt: null, startsAt: new Date(Date.now() - 60_000) },
  });
  assert.deepEqual(await getAccessibleProducts(user.id, "STUDENT"), ["OD"]);
});

integration("materyal kapsamı rol başına gerçek sorguda daralır", async () => {
  const { user: teacher } = await createTeacher();
  const { user: otherTeacher } = await createTeacher();
  const group = await createGroup(teacher.id);
  const foreignGroup = await createGroup(otherTeacher.id);
  const { profile: student } = await createStudent();
  const { profile: formerStudent } = await createStudent();
  const parent = await createUser("PARENT");
  const admin = await createUser("ADMIN");

  await Promise.all([
    enroll(group.id, student.id),
    enroll(group.id, formerStudent.id, new Date("2026-01-01T00:00:00Z")),
    linkParent(parent.id, student.id),
  ]);

  const [material, foreignMaterial] = await Promise.all([
    prisma.learningMaterial.create({ data: { groupId: group.id, createdById: teacher.id, title: "Kapsam içi", url: "https://example.invalid/a" } }),
    prisma.learningMaterial.create({ data: { groupId: foreignGroup.id, createdById: otherTeacher.id, title: "Kapsam dışı", url: "https://example.invalid/b" } }),
  ]);

  const visible = async (role: Parameters<typeof learningMaterialAccessScope>[0], userId: string) =>
    (await prisma.learningMaterial.findMany({
      where: { AND: [learningMaterialAccessScope(role, userId), { id: { in: [material.id, foreignMaterial.id] } }] },
      select: { id: true },
    })).map((row) => row.id);

  assert.deepEqual((await visible("ADMIN", admin.id)).sort(), [material.id, foreignMaterial.id].sort());
  assert.deepEqual(await visible("TEACHER", teacher.id), [material.id]);
  assert.deepEqual(await visible("STUDENT", student.userId), [material.id]);
  assert.deepEqual(await visible("PARENT", parent.id), [material.id]);

  // Kaydı sona ermiş öğrenci ve bağlı olmayan veli hiçbir şey görmez.
  assert.deepEqual(await visible("STUDENT", formerStudent.userId), []);
  const unlinkedParent = await createUser("PARENT");
  assert.deepEqual(await visible("PARENT", unlinkedParent.id), []);
});

test.after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});
