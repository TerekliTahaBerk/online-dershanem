import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTemplateToWeek,
  assignmentProgressStatusFor,
  buildAdaptiveSuggestionDrafts,
  buildParentKocumSummary,
  buildRevisionChangeSummary,
  buildTodaySummary,
  buildWeeklyKocumMetrics,
  canViewerSeeCoachNote,
  canViewerSeeTimelineEvent,
  completionFieldsForKind,
  formatMinutesAsHours,
  isDateWithinPlanWeek,
  parseTemplateTaskDefs,
  planWeekDateBounds,
  rankManagementSignals,
  separateWorkItems,
  shouldSyncAssignmentProgress,
  taskStatusLabel,
  validateTaskCompletion,
  workItemDomainLabel,
} from "./index";

test("görev durum etiketleri öğrenci diline uyar", () => {
  assert.equal(taskStatusLabel("PLANNED"), "Başlamadım");
  assert.equal(taskStatusLabel("PARTIAL"), "Kısmen tamamladım");
  assert.equal(taskStatusLabel("COULD_NOT"), "Yapamadım");
});

test("soru çözümü tamamlanırken soru alanları istenir", () => {
  const fields = completionFieldsForKind("QUESTION_PRACTICE");
  assert.ok(fields.includes("actualQuestions"));
  assert.ok(fields.includes("actualCorrect"));
  assert.ok(!completionFieldsForKind("VIDEO").includes("actualCorrect"));
});

test("kısmi tamamlanma ve soru tutarlılığı doğrulanır", () => {
  assert.equal(
    validateTaskCompletion({
      status: "PARTIAL",
      actualQuestions: 40,
      actualCorrect: 20,
      actualIncorrect: 8,
      actualBlank: 4,
      actualMinutes: 52,
      difficultyFelt: 3,
    }),
    null,
  );
  assert.match(
    validateTaskCompletion({
      status: "DONE",
      actualQuestions: 10,
      actualCorrect: 8,
      actualIncorrect: 3,
      actualBlank: 1,
    }) || "",
    /aşamaz/,
  );
});

test("öğretmen ödevi referansı DONE olunca Assignment progress senkronlanır", () => {
  assert.equal(shouldSyncAssignmentProgress("ASSIGNMENT", "a1", "DONE"), true);
  assert.equal(shouldSyncAssignmentProgress("MANUAL_COACH", "a1", "DONE"), false);
  assert.equal(assignmentProgressStatusFor("IN_PROGRESS"), "IN_PROGRESS");
  assert.equal(assignmentProgressStatusFor("DONE"), "DONE");
});

test("haftalık metrikler planlanan ve gerçekleşeni ayırır", () => {
  const metrics = buildWeeklyKocumMetrics(
    [
      {
        id: "1",
        status: "DONE",
        scheduledFor: "2026-09-01T10:00:00.000Z",
        durationMinutes: 45,
        actualMinutes: 52,
        targetType: "QUESTIONS",
        targetValue: 40,
        actualQuestions: 32,
        subject: "Matematik",
      },
      {
        id: "2",
        status: "PLANNED",
        scheduledFor: "2026-08-30T10:00:00.000Z",
        durationMinutes: 30,
        targetType: "QUESTIONS",
        targetValue: 20,
        subject: "Türkçe",
      },
      {
        id: "3",
        status: "SKIPPED",
        scheduledFor: "2026-09-02T10:00:00.000Z",
        durationMinutes: 20,
      },
    ],
    "2026-09-01",
    (d) => d.toISOString().slice(0, 10),
  );

  assert.equal(metrics.taskTotal, 2);
  assert.equal(metrics.taskCompleted, 1);
  assert.equal(metrics.taskOverdue, 1);
  assert.equal(metrics.planCompletionPct, 50);
  assert.equal(metrics.plannedMinutes, 75);
  assert.equal(metrics.completedMinutes, 52);
  assert.equal(metrics.questionTarget, 60);
  assert.equal(metrics.questionActual, 32);
  assert.equal(metrics.subjectDistribution[0]?.subject, "Matematik");
});

test("bugün özeti sıradaki görevi ve gecikmeyi gösterir", () => {
  const summary = buildTodaySummary(
    [
      {
        id: "later",
        status: "PLANNED",
        scheduledFor: "2026-09-01T15:00:00.000Z",
        durationMinutes: 40,
      },
      {
        id: "next",
        status: "PLANNED",
        scheduledFor: "2026-09-01T12:00:00.000Z",
        durationMinutes: 30,
      },
      {
        id: "done",
        status: "DONE",
        scheduledFor: "2026-09-01T09:00:00.000Z",
        durationMinutes: 20,
        actualMinutes: 18,
      },
    ],
    [{ id: "over", status: "PLANNED", scheduledFor: "2026-08-31T10:00:00.000Z", durationMinutes: 20 }],
  );
  assert.equal(summary.totalTasks, 3);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.estimatedMinutes, 70);
  assert.equal(summary.nextTaskId, "next");
  assert.equal(summary.overdueCount, 1);
  assert.equal(formatMinutesAsHours(860), "14s 20dk");
});

test("şablon task setine dönüşür", () => {
  const defs = parseTemplateTaskDefs([
    { dayOffset: 1, title: "Matematik", durationMinutes: 45, targetType: "QUESTIONS", targetValue: 40 },
    { dayOffset: 99, title: "bad", durationMinutes: 10 },
  ]);
  assert.equal(defs.length, 1);
  const applied = applyTemplateToWeek({
    weekStart: new Date("2026-08-31T00:00:00.000Z"),
    taskDefs: defs,
    addDays: (start, offset) => new Date(start.getTime() + offset * 86_400_000),
  });
  assert.equal(applied[0]?.sourceType, "TEMPLATE");
  assert.equal(applied[0]?.position, 1);
  assert.equal(applied[0]?.targetValue, 40);
});

test("veli not ve timeline görünürlüğü sızdırmaz", () => {
  assert.equal(canViewerSeeCoachNote("INTERNAL", "PARENT"), false);
  assert.equal(canViewerSeeCoachNote("PARENT_VISIBLE", "PARENT"), true);
  assert.equal(canViewerSeeCoachNote("INTERNAL", "STUDENT"), false);
  assert.equal(canViewerSeeCoachNote("STUDENT_VISIBLE", "STUDENT"), true);
  assert.equal(canViewerSeeTimelineEvent("INTERNAL", "TEACHER"), false);
  assert.equal(canViewerSeeTimelineEvent("INTERNAL", "ADMIN"), true);
  assert.equal(canViewerSeeTimelineEvent("PARENT", "PARENT"), true);
  assert.equal(canViewerSeeTimelineEvent("STAFF", "PARENT"), false);
});

test("veli özeti operasyonel mikro görev içermez", () => {
  const summary = buildParentKocumSummary({
    planCompletionPct: 83,
    completedMinutes: 560,
    plannedMinutes: 600,
    overdueCount: 1,
    previousOverdueCount: 3,
    goalLabel: "TYT Matematik",
    goalPercent: 70,
    publishedParentText: "Bu hafta paragraf düzeni iyi ilerledi.",
    strengths: "Türkçe paragraf",
    focusAreas: "Matematik problemleri",
    nextWeekFocus: "Deneme yanlış analizi",
  });
  assert.equal(summary.planCompletionPct, 83);
  assert.match(summary.studyRhythm || "", /yakın/);
  assert.match(summary.overdueTrend || "", /azaldı/);
  assert.equal(summary.nextWeekFocus, "Deneme yanlış analizi");
});

test("adaptif öneriler koç onayı için taslak üretir, otomatik publish etmez", () => {
  const drafts = buildAdaptiveSuggestionDrafts({
    completionPct: 40,
    overdueCount: 2,
    plannedMinutes: 300,
    actualMinutes: 200,
    openReviewCount: 4,
    openAssignmentCount: 1,
    mockExamFollowups: [{ title: "TYT Matematik yanlışlarını incele", subject: "Matematik" }],
  });
  assert.ok(drafts.some((d) => d.kind === "ADAPTIVE_NEXT_WEEK"));
  assert.ok(drafts.some((d) => d.kind === "CARRY_OVER"));
  assert.ok(drafts.some((d) => d.kind === "REVIEW_QUEUE"));
  assert.ok(drafts.some((d) => d.kind === "MOCK_EXAM_FOLLOWUP"));
  assert.match(buildRevisionChangeSummary({ previousVersion: 1, nextVersion: 2, actorLabel: "Ayşe Öğretmen" }), /v1 → v2/);
});

test("management sinyalleri öncelik sırasına girer", () => {
  const ranked = rankManagementSignals([
    { code: "LOW_COMPLETION", studentId: "1", studentName: "B", detail: "x" },
    { code: "NO_COACH", studentId: "2", studentName: "A", detail: "y" },
    { code: "NO_PLAN", studentId: "3", studentName: "C", detail: "z" },
  ]);
  assert.deepEqual(
    ranked.map((r) => r.code),
    ["NO_COACH", "NO_PLAN", "LOW_COMPLETION"],
  );
});

test("plan haftası dışında tarih reddedilir", () => {
  const weekStart = new Date("2026-08-31T00:00:00.000+03:00");
  assert.equal(isDateWithinPlanWeek(new Date("2026-09-02T12:00:00.000+03:00"), weekStart), true);
  assert.equal(isDateWithinPlanWeek(new Date("2026-09-07T12:00:00.000+03:00"), weekStart), false);
  const bounds = planWeekDateBounds(weekStart);
  assert.equal(bounds.min, "2026-08-31");
  assert.equal(bounds.max, "2026-09-06");
});

test("boş hafta metrikleri sıfırlanır", () => {
  const metrics = buildWeeklyKocumMetrics([], "2026-09-01", (d) => d.toISOString().slice(0, 10));
  assert.equal(metrics.taskTotal, 0);
  assert.equal(metrics.planCompletionPct, 0);
  assert.equal(metrics.subjectDistribution.length, 0);
});

test("Dershanem ödevi ile Koçum plan görevi domain olarak ayrılır", () => {
  const separated = separateWorkItems([
    { domain: "DERSANEM_ASSIGNMENT", id: "a", title: "Sayfa 120", meta: "Ayşe" },
    { domain: "KOCUM_PLAN_TASK", id: "t", title: "40 soru", meta: "Plan" },
  ]);
  assert.equal(separated.assignments.length, 1);
  assert.equal(separated.planTasks.length, 1);
  assert.equal(workItemDomainLabel("KOCUM_PLAN_TASK"), "Koçum plan görevi");
});
