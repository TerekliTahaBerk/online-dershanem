import assert from "node:assert/strict";
import test from "node:test";
import type { UserRole } from "@prisma/client";
import { LOGIN_PATH, PANEL_ROOT, PASSWORD_CHANGE_PATH, PRODUCT_SELECTOR_PATH, productLabel, productRolePath, rolePath, roleLabel, roleStudentsPath } from "./roles";

const ALL_ROLES: UserRole[] = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];

test("her rolün bir panel kökü var ve hepsi benzersiz", () => {
  const paths = ALL_ROLES.map(rolePath);
  for (const p of paths) {
    assert.equal(typeof p, "string");
    assert.equal(p.startsWith(`${PANEL_ROOT}/`), true, `panel altında olmalı: ${p}`);
  }
  assert.equal(new Set(paths).size, ALL_ROLES.length, "iki rol aynı panele düşüyor");
});

test("rol kökleri birbirinin ön eki değil", () => {
  // /panel/ogrenci ile /panel/ogrenciler gibi bir çift olsaydı, yol eşleme
  // mantığı (isActive, guard) sessizce yanlış panele izin verebilirdi.
  for (const a of ALL_ROLES) {
    for (const b of ALL_ROLES) {
      if (a === b) continue;
      assert.equal(
        rolePath(a).startsWith(`${rolePath(b)}/`),
        false,
        `${a} yolu ${b} yolunun altında kalıyor`,
      );
    }
  }
});

test("parola değiştirme yolu hiçbir rolün kökü değil", () => {
  // Aksi halde geçici parolayla giren kullanıcı sonsuz yönlendirme döngüsüne girer.
  for (const role of ALL_ROLES) {
    assert.notEqual(rolePath(role), PASSWORD_CHANGE_PATH);
  }
  assert.equal(PASSWORD_CHANGE_PATH.startsWith(`${PANEL_ROOT}/`), true);
});

test("giriş yolu panelin dışında", () => {
  // Giriş sayfası middleware matcher'ının (/panel/:path*) içine düşerse,
  // oturumu olmayan kullanıcı giriş sayfasından giriş sayfasına yönlendirilir
  // ve sonsuz döngüye girer.
  // (LOGIN_PATH === PANEL_ROOT eşitliğini TypeScript literal tipler üzerinden
  //  zaten derlemede imkânsız kılıyor; burada yalnızca alt yol olmadığını sınıyoruz.)
  assert.equal(LOGIN_PATH.startsWith(`${PANEL_ROOT}/`), false);
});

test("rol etiketleri dolu ve benzersiz", () => {
  const labels = ALL_ROLES.map(roleLabel);
  for (const l of labels) assert.equal(l.length > 0, true);
  assert.equal(new Set(labels).size, ALL_ROLES.length);
});

test("OD mevcut rol yollarını korur, ODK ayrı ve benzersiz rol kökleri kullanır", () => {
  const odkPaths = ALL_ROLES.map((role) => productRolePath("ODK", role));
  for (const role of ALL_ROLES) {
    assert.equal(productRolePath("OD", role), rolePath(role));
    assert.equal(productRolePath("ODK", role).startsWith(`${PANEL_ROOT}/odk/`), true);
  }
  assert.equal(new Set(odkPaths).size, ALL_ROLES.length);
  assert.equal(odkPaths.includes(PRODUCT_SELECTOR_PATH), false);
});

test("ürün etiketleri kullanıcıya gösterilecek kadar açık", () => {
  // Etiketler public sitedeki ticari adlarla birebir aynı olmalı; kullanıcı
  // panelde başka, sitede başka bir ürün adı görmemeli.
  assert.equal(productLabel("OD"), "Online Dershanem");
  assert.equal(productLabel("OK"), "Online Koçum");
  assert.equal(productLabel("ODK"), "Online Deneme Kulübüm");
});

test("öğrenciler menüsü rol bazında doğru hedefe gider", () => {
  assert.equal(roleStudentsPath("ADMIN"), "/panel/yonetim/ogrenciler");
  assert.equal(roleStudentsPath("TEACHER"), "/panel/ogretmen/gruplar");
  assert.equal(roleStudentsPath("STUDENT"), null);
  assert.equal(roleStudentsPath("PARENT"), null);
});
