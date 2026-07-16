import assert from "node:assert/strict";
import test from "node:test";
import {
  generateTemporaryPassword,
  hashPassword,
  needsRehash,
  verifyAgainstDummy,
  verifyPassword,
} from "./password";
import { PASSWORD_MAX_LENGTH, validatePasswordStrength } from "./password-policy";

test("hash doğrulanır, yanlış parola reddedilir", async () => {
  const hash = await hashPassword("dogru-parola-123");
  assert.equal(await verifyPassword("dogru-parola-123", hash), true);
  assert.equal(await verifyPassword("yanlis-parola-123", hash), false);
});

test("aynı parola her seferinde farklı hash üretir (salt rastgele)", async () => {
  const a = await hashPassword("ayni-parola-123");
  const b = await hashPassword("ayni-parola-123");
  assert.notEqual(a, b);
  // farklı salt olsa da ikisi de doğrulanmalı
  assert.equal(await verifyPassword("ayni-parola-123", a), true);
  assert.equal(await verifyPassword("ayni-parola-123", b), true);
});

test("hash saklama biçimi parametreleri taşır", async () => {
  const hash = await hashPassword("bicim-testi-123");
  const parts = hash.split("$");
  assert.equal(parts.length, 6);
  assert.equal(parts[0], "scrypt");
  assert.equal(Number.isInteger(Number(parts[1])), true); // N
  assert.equal(Number.isInteger(Number(parts[2])), true); // r
  assert.equal(Number.isInteger(Number(parts[3])), true); // p
});

test("bozuk hash kaydında atmaz, false döner", async () => {
  for (const bad of [
    "",
    "duz-metin",
    "scrypt$32768$8$1$sadece-bes-parca",
    "bcrypt$32768$8$1$c2FsdA==$aGFzaA==", // yanlış algoritma öneki
    "scrypt$abc$8$1$c2FsdA==$aGFzaA==", // sayı olmayan N
    "scrypt$0$8$1$c2FsdA==$aGFzaA==", // geçersiz N
    "scrypt$32768$8$1$$aGFzaA==", // boş salt
  ]) {
    assert.equal(await verifyPassword("herhangi", bad), false, `bozuk kayıt atmamalı: ${bad}`);
  }
});

test("kayıttaki parametreler bellek sınırını aşıyorsa reddedilir (DoS koruması)", async () => {
  // 128 * 2^30 * 8 = 1 TB — asla denenmemeli
  const hostile = `scrypt$${2 ** 30}$8$1$c2FsdA==$aGFzaA==`;
  assert.equal(await verifyPassword("herhangi", hostile), false);
});

test("needsRehash: güncel hash false, düşük parametreli hash true", async () => {
  const current = await hashPassword("guncel-parola-123");
  assert.equal(needsRehash(current), false);
  // N=1024 bugünkü maliyetin altında
  assert.equal(needsRehash("scrypt$1024$8$1$c2FsdA==$aGFzaA=="), true);
  assert.equal(needsRehash("bozuk"), true);
});

test("verifyAgainstDummy her zaman false döner ve atmaz", async () => {
  assert.equal(await verifyAgainstDummy("herhangi-bir-parola"), false);
});

test("geçici parola: biçim, alfabe ve benzersizlik", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const pw = generateTemporaryPassword();
    // H7KM-3PQF-9XRT
    assert.match(pw, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/, `biçim bozuk: ${pw}`);
    // Telefonda karışan karakterler ASLA çıkmamalı
    for (const ch of "ILOU") {
      assert.equal(pw.includes(ch), false, `karışan karakter üretildi (${ch}): ${pw}`);
    }
    seen.add(pw);
  }
  assert.equal(seen.size > 190, true, "geçici parolalar yeterince benzersiz değil");
});

test("üretilen geçici parola gerçekten hash'lenip doğrulanabiliyor", async () => {
  const pw = generateTemporaryPassword();
  const hash = await hashPassword(pw);
  assert.equal(await verifyPassword(pw, hash), true);
  assert.equal(await verifyPassword(pw.toLowerCase(), hash), false, "büyük/küçük harf duyarlı olmalı");
});

test("parola politikası: uzunluk sınırları", () => {
  assert.equal(validatePasswordStrength("kisa").ok, false);
  assert.equal(validatePasswordStrength("123456789").ok, false, "9 karakter reddedilmeli");
  assert.equal(validatePasswordStrength("1234567890x").ok, true, "11 karakter kabul edilmeli");
  assert.equal(validatePasswordStrength("x".repeat(PASSWORD_MAX_LENGTH + 1)).ok, false);
  assert.equal(validatePasswordStrength(" ".repeat(12)).ok, false, "sadece boşluk reddedilmeli");
});

test("parola politikası: yaygın parolalar reddedilir", () => {
  assert.equal(validatePasswordStrength("password123").ok, false);
  assert.equal(validatePasswordStrength("PAROLA123").ok, false, "büyük/küçük harften bağımsız yakalanmalı");
  assert.equal(validatePasswordStrength("matematik123").ok, false);
});

test("parola politikası: e-posta ve isimden türetilemez", () => {
  assert.equal(validatePasswordStrength("veli@ornek.com", { email: "veli@ornek.com" }).ok, false);
  assert.equal(validatePasswordStrength("VELI@ornek.com", { email: "veli@ornek.com" }).ok, false);
  assert.equal(validatePasswordStrength("ahmetyilmaz", { fullName: "Ahmet Yilmaz" }).ok, true, "isimle aynı değil, geçmeli");
  assert.equal(validatePasswordStrength("ahmet yilmaz", { fullName: "Ahmet Yilmaz" }).ok, false);
});

test("parola politikası: karmaşıklık kuralı YOK — uzun ve sade parola geçer", () => {
  assert.equal(validatePasswordStrength("bugun hava cok guzel").ok, true);
});

test("unicode parola normalize edilir (aynı görünen iki dizi eşleşir)", async () => {
  // "ö" tek kod noktası (U+00F6) vs. "o" + birleşen umlaut (U+006F U+0308).
  // Ekranda ikisi de "paröla" görünür; kullanıcı farkı göremez ve hangi biçimin
  // üretildiği klavyeye/işletim sistemine göre değişir. NFKC olmadan aynı görünen
  // parola sessizce reddedilir. Escape ile yazıldı: editör normalize edip testi
  // sessizce anlamsızlaştırmasın.
  const composed = "par\u00F6la-uzun-123";
  const decomposed = "paro\u0308la-uzun-123";

  assert.notEqual(composed, decomposed, "test kurulumu bozulmuş: iki dize bayt bayt aynı olmamalı");
  assert.equal(composed.normalize("NFKC"), decomposed.normalize("NFKC"));

  const hash = await hashPassword(composed);
  assert.equal(await verifyPassword(decomposed, hash), true);
});
