import assert from "node:assert/strict";
import test from "node:test";
import { firstValueChecklist, firstValueComplete, nextFirstValueStep, type FirstValueInput } from "./first-value";

const base: FirstValueInput = {
  audience: "STUDENT",
  accountClaimed: false,
  relationship: null,
  baselinePreferencesSet: false,
  groupAssigned: false,
  firstLessonScheduled: false,
};

test("bağı olmayan öğrencide ilişki adımı hiç basılmaz", () => {
  const keys = firstValueChecklist(base).map((step) => step.key);
  assert.deepEqual(keys, ["ACCOUNT_CLAIMED", "BASELINE_PREFERENCES", "GROUP_ASSIGNED", "FIRST_LESSON_SCHEDULED"]);
  // Tamamlanamayacak bir kutucuk listeyi anlamsızlaştırır.
  assert.equal(keys.includes("RELATIONSHIP_CONFIRMED"), false);
});

test("veli onaylanmamış bağı kendisi kapatabilir, öğrenci kapatamaz", () => {
  const parentStep = firstValueChecklist({ ...base, audience: "PARENT", relationship: "UNCONFIRMED" })
    .find((step) => step.key === "RELATIONSHIP_CONFIRMED")!;
  assert.equal(parentStep.done, false);
  assert.equal(parentStep.actor, "USER");
  assert.ok(parentStep.href);

  const studentStep = firstValueChecklist({ ...base, relationship: "UNCONFIRMED" })
    .find((step) => step.key === "RELATIONSHIP_CONFIRMED")!;
  assert.equal(studentStep.actor, "TEAM", "öğrenciye veli onayı işi verildi");
  assert.equal(studentStep.href, null);
  assert.equal(studentStep.actionLabel, null);
});

test("ekibe ait adımlarda kullanıcıya eylem gösterilmez", () => {
  const steps = firstValueChecklist(base);
  for (const step of steps.filter((item) => item.actor === "TEAM")) {
    assert.equal(step.href, null, `${step.key} kullanıcıya yapamayacağı bir iş gösteriyor`);
    assert.equal(step.actionLabel, null);
  }
});

test("tamamlanan adımın eylem bağlantısı düşer", () => {
  const steps = firstValueChecklist({ ...base, accountClaimed: true, baselinePreferencesSet: true });
  const claimed = steps.find((step) => step.key === "ACCOUNT_CLAIMED")!;
  assert.equal(claimed.done, true);
  assert.equal(claimed.href, null);
  assert.equal(claimed.actionLabel, null);
});

test("sıradaki adım ilk tamamlanmamış adımdır", () => {
  const steps = firstValueChecklist({ ...base, accountClaimed: true });
  assert.equal(nextFirstValueStep(steps)?.key, "BASELINE_PREFERENCES");
  assert.equal(firstValueComplete(steps), false);
});

test("veli ve öğrenci farklı temel tercihe yönlendirilir", () => {
  const studentStep = firstValueChecklist(base).find((step) => step.key === "BASELINE_PREFERENCES")!;
  const parentStep = firstValueChecklist({ ...base, audience: "PARENT" }).find((step) => step.key === "BASELINE_PREFERENCES")!;
  assert.equal(studentStep.href, "/panel/ogrenci/plan");
  assert.equal(parentStep.href, "/panel/veli/bildirimler");
  assert.notEqual(studentStep.title, parentStep.title);
});

test("her şey bittiğinde liste tamamlanmış sayılır", () => {
  const steps = firstValueChecklist({
    audience: "PARENT",
    accountClaimed: true,
    relationship: "CONFIRMED",
    baselinePreferencesSet: true,
    groupAssigned: true,
    firstLessonScheduled: true,
  });
  assert.equal(firstValueComplete(steps), true);
  assert.equal(nextFirstValueStep(steps), null);
});
