import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveStudent360Issues,
  pickNearestUpcomingExam,
  pickNearestUpcomingLesson,
} from "./panel/student-360";

test("en yakın yaklaşan dersi seçer", () => {
  const now = new Date("2026-08-31T09:00:00.000Z");
  const lesson = pickNearestUpcomingLesson(
    [
      { id: "lesson-1", title: "Geçmiş", startsAt: new Date("2026-08-31T08:00:00.000Z") },
      { id: "lesson-2", title: "Yakın", startsAt: new Date("2026-08-31T09:30:00.000Z") },
      { id: "lesson-3", title: "Uzak", startsAt: new Date("2026-08-31T12:00:00.000Z") },
    ],
    now,
  );
  assert.equal(lesson?.id, "lesson-2");
});

test("canlı denemeyi yaklaşan planlı denemeye tercih eder", () => {
  const now = new Date("2026-08-31T09:00:00.000Z");
  const exam = pickNearestUpcomingExam(
    [
      {
        id: "exam-1",
        title: "Planlı deneme",
        status: "SCHEDULED",
        startsAt: new Date("2026-08-31T10:00:00.000Z"),
        endsAt: new Date("2026-08-31T12:00:00.000Z"),
      },
      {
        id: "exam-2",
        title: "Canlı deneme",
        status: "LIVE",
        startsAt: new Date("2026-08-31T08:30:00.000Z"),
        endsAt: new Date("2026-08-31T11:00:00.000Z"),
      },
    ],
    now,
  );
  assert.equal(exam?.id, "exam-2");
});

test("erişim sinyallerini ürün ve atama durumuna göre üretir", () => {
  const issues = deriveStudent360Issues({
    products: ["OD", "OK"],
    blockedProvisioningCount: 1,
    hasActiveGroup: false,
    hasParentLink: false,
    hasCoachAssignment: false,
  });
  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["PROVISIONING_BLOCKED", "GROUP_MISSING", "PARENT_MISSING", "COACH_MISSING"],
  );
});
