import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTrMobile, registerSchema } from "./register-schema";

const common = {
  fullName: "Ayşe Yılmaz",
  email: "ayse@example.com",
  phone: "0532 123 45 67",
  password: "uzun-bir-parola-123",
  city: "İstanbul",
  district: "Kadıköy",
  interestedProducts: ["OD", "ODK"],
  purchaseStatus: "WANTS_TO_PURCHASE",
  preferredChannel: "WHATSAPP",
  preferredContactTime: "EVENING",
  kvkkConsent: true,
  termsConsent: true,
  marketingConsent: false,
};

test("TR cep telefonu biçimleri +90 5xx olarak normalize edilir", () => {
  assert.equal(normalizeTrMobile("0532 123 45 67"), "+905321234567");
  assert.equal(normalizeTrMobile("+90 (532) 123-45-67"), "+905321234567");
  assert.equal(normalizeTrMobile("5321234567"), "+905321234567");
  assert.equal(normalizeTrMobile("0212 123 45 67"), null);
  assert.equal(normalizeTrMobile("123"), null);
});

test("öğrenci kaydı eğitim alanlarıyla kabul edilir", () => {
  const parsed = registerSchema.safeParse({ ...common, accountType: "STUDENT", classLevel: "11", examType: "TYT_AYT", fieldTrack: "SAY", weakSubjects: ["MATEMATIK"] });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.accountType, "STUDENT");
    assert.equal(parsed.data.phone, "+905321234567");
  }
});

test("veli kaydı en az bir çocuk ister", () => {
  assert.equal(registerSchema.safeParse({ ...common, accountType: "PARENT", relationship: "ANNE", children: [] }).success, false);
  const parsed = registerSchema.safeParse({
    ...common,
    accountType: "PARENT",
    relationship: "ANNE",
    children: [{ fullName: "Can Yılmaz", classLevel: "8", examType: "LGS", email: "", phone: "" }],
  });
  assert.equal(parsed.success, true);
  if (parsed.success && parsed.data.accountType === "PARENT") {
    assert.equal(parsed.data.children[0].email, null);
    assert.equal(parsed.data.children[0].phone, null);
  }
});

test("rol yükseltme: ADMIN ya da TEACHER hesap türü reddedilir", () => {
  for (const accountType of ["ADMIN", "TEACHER", "admin", ""]) {
    assert.equal(registerSchema.safeParse({ ...common, accountType, classLevel: "11", examType: "TYT" }).success, false, accountType);
  }
});

test("KVKK ve koşul onayı zorunludur", () => {
  const base = { ...common, accountType: "STUDENT", classLevel: "11", examType: "TYT" };
  assert.equal(registerSchema.safeParse({ ...base, kvkkConsent: false }).success, false);
  assert.equal(registerSchema.safeParse({ ...base, termsConsent: false }).success, false);
});

test("ilgilenilen ürün en az bir tane olmalı ve yalnız OD/OK/ODK", () => {
  const base = { ...common, accountType: "STUDENT", classLevel: "11", examType: "TYT" };
  assert.equal(registerSchema.safeParse({ ...base, interestedProducts: [] }).success, false);
  assert.equal(registerSchema.safeParse({ ...base, interestedProducts: ["KPSS"] }).success, false);
});
