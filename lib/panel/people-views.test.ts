import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PEOPLE_VIEWS,
  pageWindow,
  parsePeopleView,
  peopleHref,
  peopleViewWhere,
  responsibilityBadges,
  viewAllowsRoleFilter,
} from "./people-views";

test("görünüm ayrıştırma eski sekme değerlerini korur", () => {
  assert.equal(parsePeopleView(undefined), "ogrenciler");
  assert.equal(parsePeopleView("STUDENT"), "ogrenciler");
  assert.equal(parsePeopleView("TEACHER"), "ogretmenler");
  assert.equal(parsePeopleView("PARENT"), "veliler");
  assert.equal(parsePeopleView("veliler"), "veliler");
  assert.equal(parsePeopleView("koclar"), "koclar");
  assert.equal(parsePeopleView("bilinmeyen"), "ogrenciler");
  assert.equal(PEOPLE_VIEWS.length, 6);
  // `kullanicilar?rol=…` yönlendirmesi sekmesiz gelir.
  assert.equal(parsePeopleView(undefined, "TEACHER"), "ogretmenler");
  assert.equal(parsePeopleView(undefined, "ADMIN"), "tumu");
  assert.equal(parsePeopleView("veliler", "TEACHER"), "veliler", "sekme rolü ezer");
});

test("görünüm süzgeçleri rol ve sorumluluktan kurulur", () => {
  assert.deepEqual(peopleViewWhere("tumu"), {});
  assert.deepEqual(peopleViewWhere("ogrenciler"), { role: "STUDENT" });
  assert.deepEqual(peopleViewWhere("veliler"), { role: "PARENT" });
  assert.deepEqual(peopleViewWhere("ogretmenler"), { role: "TEACHER" });
  const coaches = peopleViewWhere("koclar");
  assert.equal(coaches.role, "TEACHER");
  assert.equal(coaches.OR?.length, 2);
  const staff = JSON.stringify(peopleViewWhere("personel"));
  assert.match(staff, /"ADMIN"/);
  assert.match(staff, /EXAM_EDITOR/);
  assert.doesNotMatch(staff, /"COACH"/);
  assert.equal(viewAllowsRoleFilter("tumu"), true);
  assert.equal(viewAllowsRoleFilter("koclar"), false);
});

test("sorumluluk rozetleri tekrarsız ve sabit sırada", () => {
  assert.deepEqual(responsibilityBadges(["REPORT_VIEWER", "TEACHER", "COACH", "TEACHER", "BILINMEYEN"]), ["Öğretmen", "Koç", "Rapor"]);
  assert.deepEqual(responsibilityBadges([]), []);
});

test("liste bağlantıları boş süzgeçleri yazmaz; rol yalnız Tümü'de", () => {
  const base = { view: "tumu" as const, q: "ada", rol: "TEACHER", urun: "OK", durum: "", sayfa: 1 };
  assert.equal(peopleHref(base), "/panel/yonetim/kisiler?sekme=tumu&q=ada&rol=TEACHER&urun=OK");
  assert.equal(peopleHref(base, { view: "koclar" }), "/panel/yonetim/kisiler?sekme=koclar&q=ada&urun=OK");
  assert.equal(peopleHref(base, { sayfa: 3, durum: "davet" }), "/panel/yonetim/kisiler?sekme=tumu&q=ada&rol=TEACHER&urun=OK&durum=davet&sayfa=3");
});

test("sayfalama penceresi uçları ve komşuları gösterir", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(5, 10), [1, null, 4, 5, 6, null, 10]);
  assert.deepEqual(pageWindow(10, 10), [1, null, 9, 10]);
});
