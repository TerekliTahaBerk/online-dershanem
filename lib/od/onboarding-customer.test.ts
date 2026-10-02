import assert from "node:assert/strict";
import test from "node:test";
import { buildOdCustomerStart, OD_START_STEPS, odTimePreferenceLabels } from "./onboarding-customer";
import { OD_ONBOARDING_STATES } from "./onboarding-state";
import { readFileSync } from "node:fs";

test("tüm başlangıç durumları müşteri diliyle sonraki adımı açıklar", () => {
  for (const state of OD_ONBOARDING_STATES) {
    const view = buildOdCustomerStart({ state, paidAt: null, role: "STUDENT" });
    assert.ok(view.title && view.nextStep && view.estimatedTime);
    assert.doesNotMatch(JSON.stringify(view), /MANUAL_REVIEW|BLOCKED|SLA|onboarding|[Mm]anuel|[Bb]loke|bayrak|kapalı/);
  }
});

test("24/48 saatlik tahmin ödeme onayından itibaren hesaplanır; geçince yeni süre uydurulmaz", () => {
  const paidAt = new Date("2026-10-01T07:00:00Z");
  const now = new Date("2026-10-01T08:00:00Z");
  const contact = buildOdCustomerStart({ state: "PAID", paidAt, role: "STUDENT", now });
  const placement = buildOdCustomerStart({ state: "PARENT_LINKED", paidAt, role: "PARENT", now });
  assert.match(contact.estimatedTime, /2 Eki 2026 10:00/);
  assert.match(placement.estimatedTime, /3 Eki 2026 10:00/);
  assert.equal(buildOdCustomerStart({ state: "PARENT_LINKED", paidAt, role: "STUDENT", now: new Date("2026-10-05T00:00:00Z") }).estimatedTime, "Ekibimiz güncel zamanı sizinle paylaşacak.");
});

test("ilk dersin gerçek tarihi ve rolün takvim bağlantısı kullanılır", () => {
  for (const role of ["STUDENT", "PARENT"] as const) {
    const view = buildOdCustomerStart({ state: "FIRST_LESSON_SCHEDULED", paidAt: null, firstLessonAt: new Date("2026-10-04T15:00:00Z"), now: new Date("2026-10-02T00:00:00Z"), role });
    assert.match(view.estimatedTime, /4 Eki 2026 18:00/);
    assert.equal(view.href, role === "STUDENT" ? "/panel/ogrenci/takvim" : "/panel/veli/takvim");
  }
});

test("saat özeti yalnız kayıtlı kontrollü seçenekleri taşır", () => {
  const info = { email: "private@example.com", fullName: "Gizli", notes: "özel", placementPreferences: { timeRanges: ["WEEKDAY_EVENING", "WEEKDAY_EVENING", "serbest metin", "WEEKEND_MORNING"] } };
  assert.deepEqual(odTimePreferenceLabels(info), ["Hafta içi 17.00–21.00", "Hafta sonu 09.00–13.00"]);
  for (const invalid of [null, "x", [], { placementPreferences: { timeRanges: "x" } }]) assert.deepEqual(odTimePreferenceLabels(invalid), []);
});

test("sonuç ekranının adımları mevcut iade ve satın alma sözüyle uyumludur", () => {
  const refund = readFileSync(new URL("../../app/iade/page.tsx", import.meta.url), "utf8");
  const buyer = readFileSync(new URL("../../components/checkout/buyer-info-form.tsx", import.meta.url), "utf8");
  for (const source of [refund, buyer]) {
    assert.match(source, /24 saat içinde/);
    assert.match(source, /48 saat/);
  }
  assert.equal(OD_START_STEPS.length, 3);
  assert.match(OD_START_STEPS[1].body, /alternatif, bekleme listesi.*iade/);
  assert.match(OD_START_STEPS[2].body, /grup ve ders saati kesinleştikten sonra/);
});
