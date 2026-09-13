import assert from "node:assert/strict";
import test from "node:test";

import {
  STALE_GROUP_DAYS,
  buildTransferPreviewSummary,
  classifyLessonConflict,
  deriveGroup360Issues,
  deriveMemberRisk,
  parseGroup360Tab,
  rangesOverlap,
  summarizeGroup360Ops,
  visibleGroup360Actions,
  weeklyLessonCount,
} from "./panel/group-360";

test("sekme parse güvenli varsayılana düşer", () => {
  assert.equal(parseGroup360Tab("program"), "program");
  assert.equal(parseGroup360Tab("yok"), "genel");
  assert.equal(parseGroup360Tab(undefined), "genel");
});

test("dolu grup ve öğretmen eksikliği kritik/uyarı üretir", () => {
  const issues = deriveGroup360Issues({
    isActive: true,
    teacherActive: false,
    activeStudentCount: 4,
    capacity: 4,
    upcomingPlannedCount: 0,
    daysSinceLastCompletedLesson: STALE_GROUP_DAYS + 1,
    openScheduleConflictCount: 2,
  });
  assert.deepEqual(
    issues.map((issue) => issue.code),
    [
      "TEACHER_MISSING",
      "CAPACITY_FULL",
      "NO_SCHEDULED_LESSON",
      "STALE_GROUP",
      "SCHEDULE_CONFLICT",
    ],
  );
  const summary = summarizeGroup360Ops(issues);
  assert.equal(summary.status, "critical");
  assert.ok(summary.whyAttention.length > 0);
});

test("arşiv grup yalnız GROUP_INACTIVE döner", () => {
  const issues = deriveGroup360Issues({
    isActive: false,
    teacherActive: false,
    activeStudentCount: 4,
    capacity: 4,
    upcomingPlannedCount: 0,
    daysSinceLastCompletedLesson: 100,
    openScheduleConflictCount: 5,
  });
  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["GROUP_INACTIVE"],
  );
  assert.equal(summarizeGroup360Ops(issues).status, "archived");
});

test("boş aktif grup info sinyali üretir", () => {
  const issues = deriveGroup360Issues({
    isActive: true,
    teacherActive: true,
    activeStudentCount: 0,
    capacity: 4,
    upcomingPlannedCount: 2,
    daysSinceLastCompletedLesson: null,
    openScheduleConflictCount: 0,
  });
  assert.ok(issues.some((issue) => issue.code === "EMPTY_ACTIVE_GROUP"));
  assert.equal(summarizeGroup360Ops(issues).status, "ok");
});

test("üye risk skoru devamsızlık ve girişe göre yükselir", () => {
  assert.equal(
    deriveMemberRisk({
      attendanceAbsentCount14d: 0,
      attendanceTotalCount14d: 0,
      daysSinceLastLogin: 2,
      openHelpRequestCount: 0,
    }).level,
    "none",
  );
  assert.equal(
    deriveMemberRisk({
      attendanceAbsentCount14d: 3,
      attendanceTotalCount14d: 4,
      daysSinceLastLogin: 21,
      openHelpRequestCount: 1,
    }).level,
    "high",
  );
});

test("çakışma sınıflandırması öğretmen ve grup ayırır", () => {
  assert.deepEqual(
    classifyLessonConflict({
      teacherId: "t1",
      groupId: "g1",
      otherTeacherId: "t1",
      otherGroupId: "g2",
    }),
    ["TEACHER"],
  );
  assert.deepEqual(
    classifyLessonConflict({
      teacherId: "t1",
      groupId: "g1",
      otherTeacherId: "t2",
      otherGroupId: "g1",
    }),
    ["GROUP"],
  );
});

test("aralık örtüşmesi doğru çalışır", () => {
  const a0 = new Date("2026-09-01T10:00:00.000Z");
  const a1 = new Date("2026-09-01T11:00:00.000Z");
  const b0 = new Date("2026-09-01T10:30:00.000Z");
  const b1 = new Date("2026-09-01T11:30:00.000Z");
  const c0 = new Date("2026-09-01T11:00:00.000Z");
  const c1 = new Date("2026-09-01T12:00:00.000Z");
  assert.equal(rangesOverlap(a0, a1, b0, b1), true);
  assert.equal(rangesOverlap(a0, a1, c0, c1), false);
});

test("transfer önizleme kapasite talebini toplu engeller", () => {
  const summary = buildTransferPreviewSummary({
    targetGroupId: "t",
    targetGroupName: "Hedef",
    capacity: 2,
    activeCount: 1,
    items: [
      {
        studentId: "s1",
        studentName: "A",
        blockers: [],
        warnings: [],
        affectedSourceLessons: [],
        affectedTargetLessons: [],
        conflicts: [],
      },
      {
        studentId: "s2",
        studentName: "B",
        blockers: [],
        warnings: [],
        affectedSourceLessons: [],
        affectedTargetLessons: [],
        conflicts: [],
      },
    ],
  });
  assert.equal(summary.canExecute, false);
  assert.equal(summary.seatDemand, 2);
  assert.ok(summary.items.every((item) => item.blockers.some((b) => b.code === "TARGET_CAPACITY")));
});

test("aksiyon linkleri arşiv durumuna göre değişir", () => {
  const active = visibleGroup360Actions({ groupId: "g1", isActive: true });
  const archived = visibleGroup360Actions({ groupId: "g1", isActive: false });
  assert.ok(active.some((action) => action.id === "ARCHIVE_GROUP" && action.label.includes("arşivle")));
  assert.ok(archived.some((action) => action.id === "ARCHIVE_GROUP" && action.label.includes("tekrar")));
});

test("haftalık ders sayısı penceresini sayar", () => {
  const now = new Date("2026-09-02T12:00:00.000Z"); // Çarşamba
  const count = weeklyLessonCount(
    [
      { startsAt: new Date("2026-08-31T10:00:00.000Z") }, // Pazartesi civarı
      { startsAt: new Date("2026-09-03T10:00:00.000Z") },
      { startsAt: new Date("2026-09-10T10:00:00.000Z") },
    ],
    now,
  );
  assert.ok(count >= 1);
});
