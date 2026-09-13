import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("öğretmen güvenli offboarding route'u devir ve askıya alma adımlarını içerir", () => {
  const source = readFileSync("app/api/panel/users/[id]/offboarding/route.ts", "utf8");
  assert.match(source, /transferTeacherId/);
  assert.match(source, /group\.updateMany/);
  assert.match(source, /lesson\.updateMany/);
  assert.match(source, /coachAssignment\.updateMany/);
  assert.match(source, /interventionCase\.updateMany/);
  assert.match(source, /status:\s*"SUSPENDED"/);
});

test("ilişki mutasyonları history tablosuna yazar", () => {
  const createRoute = readFileSync("app/api/panel/relationships/route.ts", "utf8");
  const mutateRoute = readFileSync("app/api/panel/relationships/[id]/route.ts", "utf8");
  assert.match(createRoute, /parentStudentHistory\.create/);
  assert.match(createRoute, /action:\s*existing\s*\?\s*"UPDATED"\s*:\s*"LINKED"/);
  assert.match(mutateRoute, /export async function PATCH/);
  assert.match(mutateRoute, /action:\s*"UPDATED"/);
  assert.match(mutateRoute, /export async function DELETE/);
  assert.match(mutateRoute, /action:\s*"UNLINKED"/);
});

test("veli operasyonları kişilerden veliler ekranına taşınır", () => {
  const usersPage = readFileSync("app/panel/yonetim/kullanicilar/page.tsx", "utf8");
  const parentsPage = readFileSync("app/panel/yonetim/veliler/page.tsx", "utf8");
  assert.match(usersPage, /Veliler ekranını aç/);
  assert.doesNotMatch(usersPage, /Veli–öğrenci bağlantıları \(\{relationships\.length\}\)/);
  assert.match(parentsPage, /İlişki işlemleri/);
  assert.match(parentsPage, /İlişki geçmişi/);
});
