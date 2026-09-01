import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDeduplicationKey, validateEventPayload } from "./events";
import { computeOutcomeMastery, evidenceToSignal } from "./mastery";
import { buildTodayItems, sortCalendarEvents } from "./calendar";
import { generateRecommendations, canTransitionRecommendation } from "./recommendations";
import { presentForParent } from "./presenters";
import { unifiedEventsToIcal } from "./ical-bridge";
import type { UnifiedCalendarEvent } from "./types";

describe("student-success events", () => {
  it("builds deterministic deduplication keys", () => {
    const key = buildDeduplicationKey({
      eventType: "ASSIGNMENT_CREATED",
      studentId: "s1",
      entityType: "Assignment",
      entityId: "a1",
    });
    assert.equal(key, "ASSIGNMENT_CREATED:s1:Assignment:a1");
  });

  it("validates assignment created payload", () => {
    const payload = validateEventPayload("ASSIGNMENT_CREATED", {
      eventVersion: 1,
      assignmentId: "a1",
      groupId: "g1",
      dueAt: "2026-09-01T12:00:00.000Z",
      outcomeIds: [],
    });
    assert.equal(payload.assignmentId, "a1");
  });
});

describe("outcome mastery", () => {
  it("returns NOT_STARTED without evidence", () => {
    const result = computeOutcomeMastery([]);
    assert.equal(result.status, "NOT_STARTED");
  });

  it("returns NEEDS_REVIEW when mock exam weak and lesson flagged", () => {
    const now = new Date("2026-09-01T12:00:00.000Z");
    const result = computeOutcomeMastery(
      [
        evidenceToSignal({
          studentId: "s1",
          outcomeId: "o1",
          sourceType: "LESSON",
          sourceId: "l1",
          productCode: "OD",
          summary: "Ders",
          metrics: { evidenceType: "NEEDS_REVIEW" },
          occurredAt: new Date("2026-08-28T12:00:00.000Z"),
        }),
        evidenceToSignal({
          studentId: "s1",
          outcomeId: "o1",
          sourceType: "MOCK_EXAM",
          sourceId: "m1",
          productCode: "ODK",
          summary: "Deneme",
          metrics: { questionCount: 3, correctCount: 1 },
          occurredAt: new Date("2026-08-30T12:00:00.000Z"),
        }),
      ],
      now,
    );
    assert.equal(result.status, "NEEDS_REVIEW");
    assert.ok(result.explanation.length >= 1);
  });
});

describe("unified calendar", () => {
  it("sorts events by start time", () => {
    const events: UnifiedCalendarEvent[] = [
      {
        id: "2",
        type: "LESSON",
        product: "OD",
        productLabel: "Dershanem",
        title: "B",
        description: null,
        startsAt: new Date("2026-09-02T10:00:00Z"),
        endsAt: null,
        href: null,
        sourceId: "2",
        sourceType: "Lesson",
      },
      {
        id: "1",
        type: "LESSON",
        product: "OD",
        productLabel: "Dershanem",
        title: "A",
        description: null,
        startsAt: new Date("2026-09-01T10:00:00Z"),
        endsAt: null,
        href: null,
        sourceId: "1",
        sourceType: "Lesson",
      },
    ];
    const sorted = sortCalendarEvents(events);
    assert.equal(sorted[0]?.title, "A");
  });

  it("builds today items with priority", () => {
    const dayStart = new Date("2026-09-01T00:00:00+03:00");
    const dayEnd = new Date("2026-09-02T00:00:00+03:00");
    const items = buildTodayItems(
      [
        {
          id: "a1",
          type: "ASSIGNMENT_DUE",
          product: "OD",
          productLabel: "Dershanem",
          title: "Ödev",
          description: null,
          startsAt: new Date("2026-09-01T21:00:00+03:00"),
          endsAt: null,
          href: null,
          sourceId: "a1",
          sourceType: "Assignment",
        },
        {
          id: "m1",
          type: "MOCK_EXAM",
          product: "ODK",
          productLabel: "Deneme Kulübü",
          title: "TYT Deneme",
          description: null,
          startsAt: new Date("2026-09-01T10:00:00+03:00"),
          endsAt: null,
          href: null,
          sourceId: "m1",
          sourceType: "OdkExam",
        },
      ],
      new Date("2026-09-01T08:00:00+03:00"),
      dayStart,
      dayEnd,
    );
    assert.equal(items[0]?.kind, "MOCK_EXAM");
  });
});

describe("recommendations", () => {
  it("suggests outcome repeat after weak mock exam", () => {
    const drafts = generateRecommendations({
      mockExamAccuracy: 0.33,
      mockExamQuestionCount: 3,
      hasOkEntitlement: true,
      hasOdEntitlement: true,
      outcomeTitle: "Yüzde Problemleri",
      examTitle: "TYT Genel",
      sourceId: "exam-1",
    });
    assert.ok(drafts.some((d) => d.kind === "OUTCOME_REPEAT"));
  });

  it("does not suggest coaching when OK missing", () => {
    const drafts = generateRecommendations({
      planCompletionPercent: 30,
      hasOkEntitlement: false,
      hasOdEntitlement: true,
      sourceId: "x",
    });
    assert.equal(drafts.some((d) => d.kind === "COACH_REVIEW"), false);
  });

  it("enforces recommendation lifecycle transitions", () => {
    assert.equal(canTransitionRecommendation("SUGGESTED", "ACCEPTED"), true);
    assert.equal(canTransitionRecommendation("SUGGESTED", "APPLIED"), false);
  });
});

describe("presenters", () => {
  it("strips admin fields from parent summary", () => {
    const parent = presentForParent({
      summary: {
        studentId: "s1",
        computedAt: new Date(),
        products: ["OD", "OK"],
        attendance: { percent: 100, numerator: 3, denominator: 3 },
        assignmentCompletion: { percent: 80, numerator: 4, denominator: 5 },
        coachingPlanCompletion: { percent: 84, numerator: 21, denominator: 25 },
        latestExamTrend: { netDelta: 4.25, examTitle: "TYT" },
        outcomeSummary: { needsReview: 1, mastered: 2, total: 10 },
        risks: [],
        nextActions: [],
      },
      focusAreas: ["Problemler"],
      nextWeek: ["Paragraf hız"],
    });
    assert.match(parent.weekSummary.lessonAttendance, /100/);
    assert.ok(!("internalRiskScore" in parent));
  });
});

describe("ical bridge", () => {
  it("prefixes product label in ical title", () => {
    const events = unifiedEventsToIcal([
      {
        id: "mock-exam:1",
        type: "MOCK_EXAM",
        product: "ODK",
        productLabel: "Deneme Kulübü",
        title: "TYT Genel",
        description: null,
        startsAt: new Date("2026-09-01T10:00:00Z"),
        endsAt: new Date("2026-09-01T12:00:00Z"),
        href: "/panel/odk/sinavlar/1",
        sourceId: "1",
        sourceType: "OdkExam",
      },
    ]);
    assert.match(events[0]?.title ?? "", /Deneme/);
  });
});
