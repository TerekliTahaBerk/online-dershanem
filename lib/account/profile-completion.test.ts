import assert from "node:assert/strict";
import { test } from "node:test";
import { computeProfileCompletion } from "./profile-completion";

const now = new Date("2026-10-01T00:00:00Z");

test("eksiksiz öğrenci profili yüzde 100", () => {
  const result = computeProfileCompletion({
    role: "STUDENT",
    fullName: "Ali",
    phone: "+905321234567",
    kvkkAcceptedAt: now,
    city: "Ankara",
    district: "Çankaya",
    student: { classLevel: "12", examType: "TYT", schoolName: "Lise", birthDate: now },
  });
  assert.equal(result.percent, 100);
  assert.equal(result.complete, true);
  assert.equal(result.missing.length, 0);
});

test("velide çocuk bilgisi eksikse ayarların çocuklarım bölümüne yönlendirir", () => {
  const result = computeProfileCompletion({
    role: "PARENT",
    fullName: "Veli",
    phone: "+905321234567",
    kvkkAcceptedAt: now,
    city: "Ankara",
    district: "Çankaya",
    parent: { relationship: "ANNE", childCount: 0 },
  });
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing.map((item) => item.key), ["children"]);
  assert.equal(result.missing[0].href, "/panel/ayarlar/cocuklarim");
});

test("admin hesap üzerinde yalnız ad ve telefon istenir", () => {
  const result = computeProfileCompletion({ role: "ADMIN", fullName: "Yönetici", phone: null, kvkkAcceptedAt: null, city: null, district: null });
  assert.deepEqual(result.requirements.map((item) => item.key), ["fullName", "phone"]);
  assert.equal(result.percent, 50);
});
