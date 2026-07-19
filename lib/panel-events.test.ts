import assert from "node:assert/strict";
import test from "node:test";
import { isClientPanelEvent, panelEventSchema } from "./panel-events";

test("izin verilen ders kapanışı eventini kabul eder", () => {
  const result = panelEventSchema.safeParse({
    name: "lesson_close_started",
    properties: { groupSize: 4, initialStatus: "PLANNED" },
  });
  assert.equal(result.success, true);
});

test("kimlik veya serbest metin gibi fazladan alanları reddeder", () => {
  const result = panelEventSchema.safeParse({
    name: "lesson_close_completed",
    properties: {
      durationMs: 90_000,
      groupSize: 4,
      changedStudentCount: 1,
      privateNoteCount: 1,
      filledSharedFieldCount: 4,
      draftSaveCount: 2,
      interactionCount: 8,
      templateApplied: false,
      previousGoalUsed: true,
      studentId: "sensitive-id",
    },
  });
  assert.equal(result.success, false);
});

test("makul olmayan süre ve sayaçları reddeder", () => {
  const result = panelEventSchema.safeParse({
    name: "lesson_close_completed",
    properties: {
      durationMs: -1,
      groupSize: 4,
      changedStudentCount: 1,
      privateNoteCount: 0,
      filledSharedFieldCount: 2,
      draftSaveCount: 0,
      interactionCount: 2,
      templateApplied: false,
      previousGoalUsed: false,
    },
  });
  assert.equal(result.success, false);
});

test("dört rolün operasyon eventleri yalnız toplu ve sınırlı alanları kabul eder", () => {
  const events = [
    { name: "lesson_notes_finished", properties: { durationMs: 850, outcome: "success", completionAttempt: true, groupSize: 4, privateNoteCount: 2, filledSharedFieldCount: 4 } },
    { name: "admin_setup_finished", properties: { durationMs: 1200, outcome: "success", studentCount: 4, parentLinkCount: 2, lessonCount: 4 } },
    { name: "student_assignment_progress_finished", properties: { durationMs: 320, outcome: "success", targetStatus: "DONE" } },
    { name: "parent_dashboard_loaded", properties: { durationMs: 410, childCountBand: "1", hasActiveEnrollment: true } },
  ];
  for (const event of events) assert.equal(panelEventSchema.safeParse(event).success, true);
});

test("operasyon eventine kullanıcı veya kaynak kimliği eklenemez", () => {
  assert.equal(panelEventSchema.safeParse({
    name: "student_assignment_progress_finished",
    properties: { durationMs: 320, outcome: "success", targetStatus: "DONE", assignmentId: "secret" },
  }).success, false);
});

test("istemci sunucuya ait iş sonucu eventini taklit edemez", () => {
  const parsed = panelEventSchema.parse({
    name: "admin_setup_finished",
    properties: { durationMs: 1200, outcome: "success", studentCount: 4, parentLinkCount: 2, lessonCount: 4 },
  });
  assert.equal(isClientPanelEvent(parsed), false);
});

test("kazanım bağlantısı kimliksiz sayaç ve kontrollü gerekçe taşır", () => {
  const parsed = panelEventSchema.safeParse({ name: "curriculum_link_saved", properties: { targetType: "LESSON", outcomeCount: 2, needsReviewCount: 1, skipReason: "NONE" } });
  assert.equal(parsed.success, true);
  assert.equal(panelEventSchema.safeParse({ name: "curriculum_link_saved", properties: { targetType: "LESSON", outcomeCount: 2, needsReviewCount: 1, skipReason: "NONE", lessonId: "secret" } }).success, false);
});

test("deneme eventleri soru metni ve öğrenci kimliği taşımadan ölçülür", () => {
  const event = { name: "mock_exam_entry_completed", properties: { examType: "LGS", entryDurationMs: 120_000, sectionCount: 6, reasonCount: 2, source: "MANUAL" } };
  assert.equal(panelEventSchema.safeParse(event).success, true);
  assert.equal(panelEventSchema.safeParse({ ...event, properties: { ...event.properties, studentId: "secret", questionText: "telifli soru" } }).success, false);
});

test("tekrar eventleri yalnız zamanlama basamağı ve kontrollü yanıt taşır", () => {
  const event = { name: "review_item_answered", properties: { response: "UNSURE", stageBefore: 2, stageAfter: 1, nextIntervalDays: 3, ageBand: "8-30", mastered: false } };
  assert.equal(panelEventSchema.safeParse(event).success, true);
  assert.equal(panelEventSchema.safeParse({ ...event, properties: { ...event.properties, reviewItemId: "secret", solutionNote: "özel not" } }).success, false);
});

test("hızlı kapanış kalite eventleri yalnız toplu sayaç taşır", () => {
  const event = { name: "lesson_close_quality", properties: { missingFieldCount: 0, exceptionCount: 1, assignmentRecipientCount: 2, outcomeLinked: true } };
  assert.equal(panelEventSchema.safeParse(event).success, true);
  assert.equal(panelEventSchema.safeParse({ ...event, properties: { ...event.properties, lessonId: "secret", studentIds: ["secret"] } }).success, false);
  assert.equal(isClientPanelEvent(panelEventSchema.parse(event)), false);
});

test("plan eventleri kimlik ve görev başlığı taşımadan ölçülür", () => {
  const generated = { name: "plan_generated", properties: { ruleVersion: "adaptive-v1", taskCount: 6, capacityMinutes: 135, reasonCount: 3, rebalanced: false } };
  assert.equal(panelEventSchema.safeParse(generated).success, true);
  assert.equal(panelEventSchema.safeParse({ ...generated, properties: { ...generated.properties, studentId: "secret", taskTitle: "özel içerik" } }).success, false);
  const review = panelEventSchema.parse({ name: "plan_review_completed", properties: { durationMs: 42_000, taskCount: 6, approved: true } });
  assert.equal(isClientPanelEvent(review), true);
});

test("sakin özet eventleri içerik veya öğrenci kimliği taşımaz", () => {
  const event = { name: "weekly_digest_feedback", properties: { actorRole: "PARENT", helpful: true, anxietyPulse: 2 } };
  assert.equal(panelEventSchema.safeParse(event).success, true);
  assert.equal(panelEventSchema.safeParse({ ...event, properties: { ...event.properties, studentId: "secret", digestText: "özel içerik" } }).success, false);
});

test("müdahale eventleri kimlik, açıklama veya iç not taşımaz", () => {
  assert.equal(panelEventSchema.safeParse({ name: "intervention_logged", properties: { action: "START", reasonCode: "REPEATED_REVIEW_DIFFICULTY", timeToActionMs: 1200, withinSla: true, noteProvided: false } }).success, true);
  assert.equal(panelEventSchema.safeParse({ name: "intervention_logged", properties: { action: "START", reasonCode: "REPEATED_REVIEW_DIFFICULTY", timeToActionMs: 1200, withinSla: true, noteProvided: false, studentId: "secret", note: "özel" } }).success, false);
});

test("telafi eventleri özel not veya kaynak kimliği taşımaz", () => {
  const event = { name: "recovery_package_completed", properties: { completionDurationMs: 12_000, within72h: true, itemCount: 2 } };
  assert.equal(panelEventSchema.safeParse(event).success, true);
  assert.equal(panelEventSchema.safeParse({ ...event, properties: { ...event.properties, studentId: "secret", privateNote: "özel", materialId: "secret" } }).success, false);
});
