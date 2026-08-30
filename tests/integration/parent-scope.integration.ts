import assert from "node:assert/strict";
import test from "node:test";
import { resolveParentScope } from "../../lib/panel/parent-scope";
import { resolveTeacherStudent, teacherGroupIds } from "../../lib/panel/teacher-scope";
import { assertNotFound, assertUniqueViolation, integration, prisma } from "./support/harness";
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
 * OD-012 · VELİ VE ÖĞRETMEN KAPSAMI.
 *
 * Kapsam çözümü tamamen veritabanı ilişkisine dayanıyor: URL'den gelen kimlik
 * doğrudan kullanılmıyor, bağlı öğrenciler arasında ARANIYOR. Bu davranışın
 * sahtelenmiş bir Prisma ile testi hiçbir şey kanıtlamaz — ilişki tablosunun
 * kendisi test edilen şey.
 */

async function familyWithTwoChildren() {
  const parent = await createUser("PARENT", { fullName: "Veli" });
  const [first, second] = await Promise.all([
    createStudent({ fullName: "Ayşe Kaya" }),
    createStudent({ fullName: "Zeynep Kaya" }),
  ]);
  await Promise.all([linkParent(parent.id, first.profile.id), linkParent(parent.id, second.profile.id)]);
  return { parent, first, second };
}

integration("kimlik verilmezse ilk çocuk seçilir, verilirse tam o çocuk gelir", async () => {
  const { parent, first, second } = await familyWithTwoChildren();

  const defaultScope = await resolveParentScope(parent.id);
  assert.deepEqual(defaultScope.children.map((child) => child.name), ["Ayşe Kaya", "Zeynep Kaya"]);
  assert.equal(defaultScope.selected?.id, first.profile.id);

  const explicit = await resolveParentScope(parent.id, second.profile.id);
  assert.equal(explicit.selected?.id, second.profile.id);
  assert.equal(explicit.selected?.name, "Zeynep Kaya");
});

integration("bağlı olmayan kimlik sessizce öteki çocuğa düşmez, 404 olur", async () => {
  const { parent } = await familyWithTwoChildren();
  const { profile: stranger } = await createStudent({ fullName: "Başka Aile" });

  await assertNotFound(() => resolveParentScope(parent.id, stranger.id), "yabancı öğrenci kimliği kabul edildi");
  // Kimlik karışıklığı da reddedilir: profil kimliği beklenirken kullanıcı kimliği gelirse.
  await assertNotFound(() => resolveParentScope(parent.id, stranger.userId));
});

integration("kendi çocuğunun kullanıcı kimliği de profil kimliği yerine geçemez", async () => {
  const { parent, first } = await familyWithTwoChildren();
  // `StudentProfile.id` ile `User.id` karıştırılırsa kapsam sessizce başka bir
  // çocuğa düşmemeli; ikisi ayrı kimlik uzayı.
  assert.notEqual(first.profile.userId, first.profile.id);
  await assertNotFound(() => resolveParentScope(parent.id, first.profile.userId));
});

integration("ürün erişimi çocuğun kendi üyeliğinden gelir, velininkinden değil", async () => {
  const { parent, first, second } = await familyWithTwoChildren();
  await Promise.all([
    grantProduct(parent.id, "OD"),
    grantProduct(first.user.id, "OK"),
    // İkinci çocuğun üyeliği iptal edilmiş: erişim doğurmamalı.
    grantProduct(second.user.id, "OD", { revokedAt: new Date() }),
  ]);

  const scope = await resolveParentScope(parent.id);
  const byName = new Map(scope.children.map((child) => [child.name, child.products]));
  assert.deepEqual(byName.get("Ayşe Kaya"), ["OK"]);
  assert.deepEqual(byName.get("Zeynep Kaya"), []);
});

integration("bağ koptuğunda erişim aynı anda kaybolur", async () => {
  const { parent, first, second } = await familyWithTwoChildren();
  await prisma.parentStudent.delete({ where: { parentId_studentId: { parentId: parent.id, studentId: second.profile.id } } });

  const scope = await resolveParentScope(parent.id);
  assert.deepEqual(scope.children.map((child) => child.id), [first.profile.id]);
  await assertNotFound(() => resolveParentScope(parent.id, second.profile.id));

  // Aynı bağ iki kez kurulamaz.
  await assertUniqueViolation(() => linkParent(parent.id, first.profile.id));
});

integration("çocuğu olmayan veli boş kapsam alır, hata fırlatmaz", async () => {
  const parent = await createUser("PARENT");
  const scope = await resolveParentScope(parent.id);
  assert.deepEqual(scope.children, []);
  assert.equal(scope.selected, null);
});

integration("öğretmen kapsamı yalnız aktif kaydı olan kendi öğrencisini çözer", async () => {
  const { user: teacher } = await createTeacher();
  const { user: outsider } = await createTeacher();
  const activeGroup = await createGroup(teacher.id);
  const archivedGroup = await createGroup(teacher.id, { isActive: false });
  const { profile: current } = await createStudent({ fullName: "Aktif Öğrenci" });
  const { profile: former } = await createStudent({ fullName: "Ayrılan Öğrenci" });
  const { profile: archived } = await createStudent({ fullName: "Arşiv Öğrencisi" });
  await Promise.all([
    enroll(activeGroup.id, current.id),
    enroll(activeGroup.id, former.id, new Date("2026-01-01T00:00:00Z")),
    enroll(archivedGroup.id, archived.id),
  ]);

  assert.deepEqual(await teacherGroupIds(teacher.id), [activeGroup.id]);

  const resolved = await resolveTeacherStudent(teacher.id, current.id);
  assert.equal(resolved.id, current.id);
  assert.deepEqual(resolved.groups.map((group) => group.id), [activeGroup.id]);

  // Sona ermiş kayıt, pasif grup ve başka öğretmen: üçü de 404.
  await assertNotFound(() => resolveTeacherStudent(teacher.id, former.id));
  await assertNotFound(() => resolveTeacherStudent(teacher.id, archived.id));
  await assertNotFound(() => resolveTeacherStudent(outsider.id, current.id));
});

test.after(async () => {
  await cleanupFixtures();
  await prisma.$disconnect();
});
