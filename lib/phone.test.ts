import assert from "node:assert/strict";
import test from "node:test";
import { toWhatsAppNumber, whatsAppLink } from "./phone";

const BEKLENEN = "905377954434";

test("Türkiye biçimlerinin hepsi aynı uluslararası numaraya iner", () => {
  // Admin bunlardan HERHANGİ birini yazabilir; hepsi çalışmalı.
  for (const girdi of [
    "0537 795 44 34",
    "05377954434",
    "0537-795-44-34",
    "537 795 44 34",
    "5377954434",
    "+90 537 795 44 34",
    "+905377954434",
    "90 537 795 44 34",
    "0090 537 795 44 34",
    "  0537 795 44 34  ",
  ]) {
    assert.equal(toWhatsAppNumber(girdi), BEKLENEN, `çevrilemedi: ${girdi}`);
  }
});

test("baştaki 0 ASLA korunmaz — wa.me onu geçersiz sayar", () => {
  const sonuc = toWhatsAppNumber("0537 795 44 34");
  assert.equal(sonuc?.startsWith("0"), false, "baştaki 0 kaldı, link kırılırdı");
  assert.equal(sonuc?.startsWith("90"), true);
});

test("boş / anlamsız girdi null döner", () => {
  for (const girdi of [null, undefined, "", "   ", "abc", "-", "12"]) {
    assert.equal(toWhatsAppNumber(girdi), null, `null beklenirdi: ${JSON.stringify(girdi)}`);
  }
});

test("tanınmayan uzunluktaki yerel numara null döner (yanlış kişiye açmaktansa)", () => {
  assert.equal(toWhatsAppNumber("1234"), null);
  assert.equal(toWhatsAppNumber("05377954434123"), null);
  assert.equal(toWhatsAppNumber("0212 555 44 33"), null, "sabit hat WhatsApp için tanınmıyor");
});

test("+ ile yazılan yabancı numara olduğu gibi kabul edilir", () => {
  assert.equal(toWhatsAppNumber("+49 151 12345678"), "4915112345678");
  assert.equal(toWhatsAppNumber("+1 202 555 0134"), "12025550134");
});

test("whatsAppLink: numara varsa doğrudan kişiye açar", () => {
  const url = new URL(whatsAppLink("0537 795 44 34", "Merhaba"));
  assert.equal(url.host, "wa.me");
  assert.equal(url.pathname, `/${BEKLENEN}`);
  assert.equal(url.searchParams.get("text"), "Merhaba");
});

test("whatsAppLink: numara tanınmazsa kişi seçtiren linke düşer", () => {
  const url = new URL(whatsAppLink("abc", "Merhaba"));
  assert.equal(url.pathname, "/", "numarasız link olmalı");
  assert.equal(url.searchParams.get("text"), "Merhaba");
});

test("whatsAppLink: çok satırlı mesaj ve Türkçe karakter bozulmaz", () => {
  const mesaj = "Merhaba Ayşe Yılmaz,\n\nGeçici parola: 14PJ-ZC6K-832S";
  const url = new URL(whatsAppLink("05377954434", mesaj));
  assert.equal(url.searchParams.get("text"), mesaj);
});

test("sitenin kendi kayıtlı numarası da doğru çevriliyor", () => {
  // lib/content.ts → contact.whatsapp
  assert.equal(toWhatsAppNumber("+90 537 795 44 34"), BEKLENEN);
});
