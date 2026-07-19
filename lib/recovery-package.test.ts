import assert from "node:assert/strict";
import test from "node:test";
import { buildRecoveryDraft, recoveryDueAt } from "./recovery-package";

test("telafi hedefi ders bitişinden tam 72 saat sonradır", () => {
  assert.equal(recoveryDueAt(new Date("2026-07-19T10:00:00Z")).toISOString(), "2026-07-22T10:00:00.000Z");
});

test("paket en fazla üç materyal ve iki ödev taşır", () => {
  const draft = buildRecoveryDraft({ lessonTitle: "Ders", lessonEndsAt: new Date(), materials: Array.from({ length: 5 }, (_, index) => ({ id: `m${index}`, title: `Materyal ${index}` })), assignments: Array.from({ length: 4 }, (_, index) => ({ id: `a${index}`, title: `Ödev ${index}` })) });
  assert.equal(draft.items.length, 5);
  assert.deepEqual(draft.items.map((item) => item.position), [1, 2, 3, 4, 5]);
});

test("özet yalnız ortak alanlardan oluşur", () => {
  const draft = buildRecoveryDraft({ lessonTitle: "Ders", lessonEndsAt: new Date(), sharedTopic: "Ortak konu", sharedNextGoal: "Ortak hedef", sharedHomework: "Ortak çalışma", materials: [], assignments: [] });
  assert.equal(draft.summaryTopic, "Ortak konu");
  assert.equal(draft.summaryNextStep, "Ortak hedef");
  assert.equal(JSON.stringify(draft).includes("private"), false);
});
