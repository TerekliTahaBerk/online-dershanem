import assert from "node:assert/strict";
import test from "node:test";
import {
  buildParentHomeHero,
  buildParentSecondaryMetrics,
  withParentStudentContext,
} from "./parent-home-summary";

test("digest healthy: no action hero is shown", () => {
  const hero = buildParentHomeHero({
    digest: {
      trendBand: "STEADY",
      goodThingOne: "Ders katılımı düzenli.",
      goodThingTwo: "Plan adımları sürdürüldü.",
      supportArea: "Destek alanı",
      homeQuestion: "Soru",
    },
    digestEnabled: true,
    hasCoaching: true,
    coachingHref: "/panel/veli/kocluk?studentId=child-1",
  });

  assert.equal(hero.title, "Genel olarak yolunda");
  assert.equal(hero.actionText, "Sizden aksiyon beklenmiyor.");
});

test("digest support area: support hero uses supportArea and homeQuestion", () => {
  const hero = buildParentHomeHero({
    digest: {
      trendBand: "BUILDING",
      goodThingOne: "İyi giden 1",
      goodThingTwo: "İyi giden 2",
      supportArea: "Kesirlerde işlem sırası için kısa tekrar yararlı olur.",
      homeQuestion: "Bugün en çok hangi örnek zorladı?",
    },
    digestEnabled: true,
    hasCoaching: true,
    coachingHref: "/panel/veli/kocluk?studentId=child-1",
  });

  assert.equal(hero.title, "Küçük bir destek iyi olabilir");
  assert.equal(hero.description, "Kesirlerde işlem sırası için kısa tekrar yararlı olur.");
  assert.equal(hero.actionText, "Bugün en çok hangi örnek zorladı?");
});

test("no digest: single coaching action is used", () => {
  const hero = buildParentHomeHero({
    digest: null,
    digestEnabled: true,
    hasCoaching: true,
    coachingHref: "/panel/veli/kocluk?studentId=child-1",
  });

  assert.equal(hero.title, "Haftalık özet henüz yayınlanmadı");
  assert.equal(hero.ctaLabel, "Koçluğu aç");
  assert.equal(hero.ctaHref, "/panel/veli/kocluk?studentId=child-1");
});

test("secondary metrics: OD only, OK and ODK combinations degrade safely", () => {
  const odOnly = buildParentSecondaryMetrics({
    attendanceTotal: 8,
    attendanceAttended: 7,
    planDone: 0,
    planTotal: 0,
    latestExamNet: 42.25,
  });
  assert.deepEqual(odOnly, {
    attendance: "7 / 8",
    planCompletion: "—",
    lastExam: "42.25 net",
  });

  const okOnly = buildParentSecondaryMetrics({
    attendanceTotal: 0,
    attendanceAttended: 0,
    planDone: 4,
    planTotal: 6,
    latestExamNet: null,
  });
  assert.deepEqual(okOnly, {
    attendance: "—",
    planCompletion: "4 / 6",
    lastExam: "—",
  });
});

test("parent deep-link context is preserved for child switches", () => {
  assert.equal(
    withParentStudentContext("/panel/veli/kocluk", "student-1"),
    "/panel/veli/kocluk?studentId=student-1",
  );
  assert.equal(
    withParentStudentContext("/panel/odk/veli/raporlar?ogrenci=u1", "student-1"),
    "/panel/odk/veli/raporlar?ogrenci=u1&studentId=student-1",
  );
});

test("privacy regression: hero text never leaks private-note wording", () => {
  const hero = buildParentHomeHero({
    digest: {
      trendBand: "BUILDING",
      goodThingOne: "İyi giden 1",
      goodThingTwo: "İyi giden 2",
      supportArea: "Kısa tekrar faydalı olabilir.",
      homeQuestion: "Bu akşam hangi örneği birlikte çözelim?",
    },
    digestEnabled: true,
    hasCoaching: false,
    coachingHref: "/panel/veli/kocluk?studentId=child-1",
  });
  const joined = `${hero.title} ${hero.description} ${hero.actionText}`.toLowerCase();
  assert.equal(joined.includes("private"), false);
  assert.equal(joined.includes("özel not"), false);
  assert.equal(joined.includes("check-in"), false);
});
