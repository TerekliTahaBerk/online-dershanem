import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseAssignmentList,
  parseAssignmentProgressResult,
  parseInsights,
  parseLessonList,
  parseMaterialList,
  parseMockExams,
  parseRecovery,
  parseRecoveryCheckpointResult,
  parseRecoveryItemResult,
  parseReviewQueue,
  parseReviewResponse,
  parseSubmissionResult,
  parseWeeklyDigest,
  parseWeeklyGoalResult,
} from "@/lib/mobile-contracts/student";
import type { ProgressInsightBundle } from "@/lib/progress-insights/types";

import { toMobileInsights, toMobileRecovery, toMobileReviewQueue, toMobileWeeklyDigest } from "./student-views";

const json = <T>(value: T) => JSON.parse(JSON.stringify(value)) as unknown;

const bundle: ProgressInsightBundle = {
  studentId: "sp",
  studentName: "Ada",
  period: { label: "Son 30 gün · son 6 deneme", fromIso: "2026-09-08T00:00:00.000Z", toIso: "2026-10-08T00:00:00.000Z" },
  academic: {
    examCount: 2,
    netTrend: [{ label: "D1", net: 10, takenAt: "2026-09-10T00:00:00.000Z" }, { label: "D2", net: 12 }],
    netDelta: 2,
    subjectSeries: [{ name: "Matematik", color: "#000", nets: [5, null], direction: "up" }],
    labels: ["D1", "D2"],
    strengths: [{ subject: "Matematik", direction: "up", sentence: "Matematikte yükseliş var." }],
    supportAreas: [],
    subjectCaption: undefined,
  },
  behavioral: {
    attendance: { percent: 90, numerator: 9, denominator: 10 },
    assignments: { percent: null, numerator: 0, denominator: 0 },
    plan: { percent: 50, numerator: 1, denominator: 2 },
  },
  narrative: ["Derslere düzenli katılıyorsun."],
  isEmpty: false,
  riskHint: "iç sinyal",
};

test("gidişat → mobil: web bundle alanları korunur; Yön plan oranı ve iç risk sinyali çıkmaz", () => {
  const mobile = toMobileInsights({ bundle, periodRange: "2026-09-08 – 2026-10-08", weeklyGoal: "Hedef", weeklyGoalUpdatedAt: new Date("2026-10-07T00:00:00.000Z"), mockExamAnalysis: true });
  const parsed = parseInsights(json(mobile));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  assert.ok(mobile.state === "READY");
  assert.deepEqual(mobile.narrative, bundle.narrative);
  assert.equal(mobile.academic.subjectCaption, null);
  assert.deepEqual(mobile.academic.netTrend, [{ label: "D1", net: 10 }, { label: "D2", net: 12 }]);
  assert.ok(!("plan" in mobile.behavioral));
  assert.ok(!JSON.stringify(mobile).includes("iç sinyal"));
  assert.equal(parseInsights({ contractVersion: 1, state: "NO_PROFILE" }).ok, true);
  assert.equal(parseInsights({ ...json(mobile) as object, state: "BOZUK" }).ok, false);
});

test("tekrar / telafi / haftalık özet → mobil: profil / özet yoksa açık durum", () => {
  assert.deepEqual(toMobileReviewQueue(null), { contractVersion: 1, state: "NO_PROFILE" });
  assert.deepEqual(toMobileRecovery(null), { contractVersion: 1, state: "NO_PROFILE" });
  assert.deepEqual(toMobileWeeklyDigest(null), { contractVersion: 1, state: "NONE" });

  const review = toMobileReviewQueue({ profileId: "sp", dailyLimit: 5, activeCount: 1, masteredCount: 0, items: [{ id: "r", title: "T", sourceReference: "S", solutionNote: "", stage: 0, dueAt: new Date("2026-10-08T00:00:00.000Z"), sourceType: "TEACHER_REFERENCE" }] });
  assert.ok(parseReviewQueue(json(review)).ok);
  assert.ok(review.state === "READY" && review.items[0].solutionNote === null);

  const recovery = toMobileRecovery([
    {
      id: "p",
      lessonId: "l",
      status: "PUBLISHED",
      lessonTitle: "Ders",
      lessonDate: new Date("2026-10-07T00:00:00.000Z"),
      summaryTopic: "Konu",
      sharedNote: null,
      summaryNextStep: "Adım",
      checkpointPrompt: "Soru",
      checkpointResponse: null,
      dueAt: new Date("2026-10-10T00:00:00.000Z"),
      outcomeTitles: [],
      items: [
        { id: "i1", kind: "MATERIAL", title: "Dosya", completed: false, material: { id: "m1", url: "https://blob/x", hasFile: true }, assignmentActive: false },
        { id: "i2", kind: "MATERIAL", title: "Bağlantı", completed: false, material: { id: "m2", url: "https://example.com/v", hasFile: false }, assignmentActive: false },
        { id: "i3", kind: "MATERIAL", title: "Pasif", completed: true, material: null, assignmentActive: false },
        { id: "i4", kind: "ASSIGNMENT", title: "Ödev", completed: false, material: null, assignmentActive: true },
        { id: "i5", kind: "ASSIGNMENT", title: "Pasif ödev", completed: false, material: null, assignmentActive: false },
      ],
    },
  ]);
  assert.ok(parseRecovery(json(recovery)).ok);
  assert.ok(recovery.state === "READY");
  assert.deepEqual(recovery.packages[0].items.map((item) => item.target), [
    { type: "material", materialId: "m1", hasFile: true, url: null },
    { type: "material", materialId: "m2", hasFile: false, url: "https://example.com/v" },
    { type: "none" },
    { type: "assignments" },
    { type: "none" },
  ]);

  const digest = toMobileWeeklyDigest({ id: "d", goodThingOne: "1", goodThingTwo: "2", supportArea: "S", homeQuestion: "Q", dataThrough: new Date("2026-10-05T00:00:00.000Z"), trendBand: "STEADY", publishedAt: null, feedback: null });
  assert.ok(parseWeeklyDigest(json(digest)).ok);
});

test("mutasyon yanıt sözleşmeleri: başarı yalnız beklenen biçimde kabul edilir", () => {
  assert.equal(parseAssignmentProgressResult({ ok: true, version: 2, replayed: false }).ok, true);
  assert.equal(parseAssignmentProgressResult({ ok: false, version: 2, replayed: false }).ok, false);
  assert.equal(parseSubmissionResult({ id: "s", attemptNumber: 1, replayed: false }).ok, true);
  assert.equal(parseSubmissionResult({ id: "s", attemptNumber: 0, replayed: false }).ok, false);
  assert.equal(parseReviewResponse({ nextDueAt: null, stage: 3, status: "MASTERED", replayed: true }).ok, true);
  assert.equal(parseReviewResponse({ nextDueAt: null, stage: 3, status: "DONE", replayed: true }).ok, false);
  assert.equal(parseRecoveryItemResult({ completed: true, replayed: false }).ok, true);
  assert.equal(parseRecoveryCheckpointResult({ completed: "yes" }).ok, false);
  assert.equal(parseWeeklyGoalResult({ goal: "Hedef" }).ok, true);
  assert.equal(parseWeeklyGoalResult({}).ok, false);
});

test("liste sözleşmeleri: eski sunucu yanıtı kabul, bozuk yanıt ret", () => {
  const assignment = { id: "a", title: "T", description: "", dueAt: "2026-10-08T00:00:00.000Z", groupName: "G", subject: "M", status: "TODO", version: 0, evidenceRequired: false, criteria: [], submissions: [] };
  const legacy = parseAssignmentList({ profile: { id: "sp" }, assignments: [assignment], planTasks: [{ id: "t" }] });
  assert.ok(legacy.ok && legacy.value.evidenceEnabled === false && legacy.value.assignments[0].teacherName === null);
  assert.ok(legacy.ok && !("planTasks" in legacy.value), "Yön plan görevleri istemci modeline girmez");
  assert.equal(parseAssignmentList({ profile: null, assignments: [{ ...assignment, status: "BITTI" }] }).ok, false);
  assert.equal(parseLessonList({ profile: null, groupNames: "", lessons: [] }).ok, true);
  assert.equal(parseMaterialList({ profile: null, lowDataMode: false, materials: [] }).ok, true);
  assert.equal(parseMaterialList({ profile: null, lowDataMode: "no", materials: [] }).ok, false);
  assert.equal(parseMockExams({ profile: null, exams: [] }).ok, true);
  assert.equal(parseMockExams({ profile: null, exams: [{ id: "e", title: "T", takenAt: "dün" }] }).ok, false);
});
