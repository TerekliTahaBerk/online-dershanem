import assert from "node:assert/strict";
import test from "node:test";
import { isPlausibleEmail, normalizeEmail } from "./email";

test("TÜRKÇE TUZAĞI: büyük I küçük i olur, ı OLMAZ", () => {
  // Bu testin varlık sebebi: toLocaleLowerCase("tr") kullanılırsa "I" → "ı"
  // olur ve e-posta kalıcı olarak bozulur. Aşağıdakiler kırmızıya dönerse
  // biri normalizeEmail'e locale eklemiş demektir.
  assert.equal(normalizeEmail("IEVE@ornek.com"), "ieve@ornek.com");
  assert.equal(normalizeEmail("ILKNUR@ornek.com"), "ilknur@ornek.com");
  assert.equal(normalizeEmail("IBRAHIM@ORNEK.COM"), "ibrahim@ornek.com");
  assert.equal(normalizeEmail("ISIL@ornek.com"), "isil@ornek.com");

  // Doğrudan kanıt: Türkçe locale bu adresi bozardı.
  assert.equal("IEVE@ornek.com".toLocaleLowerCase("tr"), "ıeve@ornek.com");
  assert.notEqual(normalizeEmail("IEVE@ornek.com"), "IEVE@ornek.com".toLocaleLowerCase("tr"));
});

test("normalizeEmail: boşluk kırpar, küçük harfe çevirir", () => {
  assert.equal(normalizeEmail("  Veli@Ornek.Com  "), "veli@ornek.com");
  assert.equal(normalizeEmail("\tADMIN@ornek.com\n"), "admin@ornek.com");
  assert.equal(normalizeEmail("zaten@kucuk.com"), "zaten@kucuk.com");
});

test("normalizeEmail idempotent — iki kez uygulamak değiştirmez", () => {
  for (const raw of ["IEVE@ornek.com", "  Veli@Ornek.Com ", "ogretmen@ornek.com"]) {
    const once = normalizeEmail(raw);
    assert.equal(normalizeEmail(once), once, `idempotent değil: ${raw}`);
  }
});

test("aynı adresin farklı yazımları TEK kayda düşer", () => {
  // users.email @unique — bu olmadan "Veli@x.com" ve "veli@x.com" iki hesap olurdu.
  const yazimlar = ["veli@ornek.com", "Veli@Ornek.com", "VELI@ORNEK.COM", "  veli@ornek.com  "];
  const set = new Set(yazimlar.map(normalizeEmail));
  assert.equal(set.size, 1, `tek biçime inmedi: ${[...set].join(" | ")}`);
});

test("isPlausibleEmail: geçerli adresler", () => {
  for (const ok of [
    "veli@ornek.com",
    "ogretmen.matematik@alt.ornek.com.tr",
    "a+etiket@ornek.co",
    "x@a.io",
  ]) {
    assert.equal(isPlausibleEmail(ok), true, `reddedilmemeliydi: ${ok}`);
  }
});

test("isPlausibleEmail: bozuk adresler", () => {
  for (const bad of [
    "",
    "at-yok",
    "@ornek.com",
    "veli@",
    "veli@ornek",          // TLD yok
    "veli@@ornek.com",     // iki @
    "veli@ornek..com",     // arka arkaya nokta
    "veli@.ornek.com",
    "veli@ornek.com.",
    "bosluk var@ornek.com",
    "veli@ornek.com ",     // normalize edilmemiş boşluk
    "a".repeat(250) + "@ornek.com",
  ]) {
    assert.equal(isPlausibleEmail(bad), false, `kabul edilmemeliydi: ${JSON.stringify(bad)}`);
  }
});

test("normalize + doğrulama birlikte çalışır", () => {
  const raw = "  VELI@Ornek.Com  ";
  const normalized = normalizeEmail(raw);
  assert.equal(isPlausibleEmail(raw), false, "kırpılmamış girdi reddedilmeli");
  assert.equal(isPlausibleEmail(normalized), true, "normalize edilmiş girdi geçmeli");
});
