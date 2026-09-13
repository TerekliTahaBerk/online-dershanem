import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertValidSubject,
  isDuplicateActiveLink,
  toParentVisibleTeacher,
  StudentTeacherLinkError,
} from "./student-teacher";
import {
  previewLessonSeries,
  parseStartsAtTime,
  istanbulLocalToUtc,
  LessonSeriesScheduleError,
} from "./lesson-series-schedule";
import { summarizeArchiveImpact } from "./archive-impact";
import {
  deriveAssignmentDisplayStatus,
  summarizeGroupAssignment,
} from "./assignment-display";

test("branş normalizasyonu ve duplicate engeli", () => {
  assert.equal(assertValidSubject("  Matematik  "), "Matematik");
  assert.throws(() => assertValidSubject("a"), (err: unknown) => err instanceof StudentTeacherLinkError);
  assert.equal(
    isDuplicateActiveLink(
      [{ teacherId: "t1", subject: "Matematik", active: true }],
      "t1",
      "matematik",
    ),
    true,
  );
  assert.equal(
    isDuplicateActiveLink(
      [{ teacherId: "t1", subject: "Matematik", active: false }],
      "t1",
      "Matematik",
    ),
    false,
  );
});

test("veli görünür öğretmen kartında telefon yok", () => {
  const card = toParentVisibleTeacher({
    assignmentId: "a1",
    teacherUserId: "u1",
    teacherName: "Ayşe Kaya",
    teacherEmail: "ayse@example.com",
    subject: "Matematik",
    bio: "TYT uzmanı",
  });
  assert.equal(card.teacherName, "Ayşe Kaya");
  assert.equal(card.subject, "Matematik");
  assert.equal("phone" in card, false);
});

test("Salı ve Perşembe 8 oluşumlu seri üretir", () => {
  // 2026-09-01 = Salı (Istanbul)
  const preview = previewLessonSeries({
    seriesStartsOn: istanbulLocalToUtc({ year: 2026, month: 9, day: 1, hour: 12, minute: 0 }),
    startsAtTime: "18:00",
    durationMinutes: 60,
    weekdays: [2, 4],
    totalOccurrences: 8,
  });
  assert.equal(preview.count, 8);
  assert.deepEqual(preview.weekdays, [2, 4]);
  assert.equal(preview.timezone, "Europe/Istanbul");
  const first = preview.occurrences[0];
  assert.ok(first.endsAt.getTime() - first.startsAt.getTime() === 60 * 60 * 1000);
});

test("geçersiz saat reddedilir", () => {
  assert.throws(() => parseStartsAtTime("25:00"), (err: unknown) => err instanceof LessonSeriesScheduleError);
});

test("arşiv etkisi kritik ilişkide hard delete kapatır", () => {
  const summary = summarizeArchiveImpact({
    userId: "u1",
    role: "STUDENT",
    buckets: [
      { key: "upcoming_lessons", label: "Yaklaşan dersler", count: 2, severity: "blocking" },
      { key: "parents", label: "Veli", count: 0, severity: "info" },
    ],
  });
  assert.equal(summary.canHardDelete, false);
  assert.equal(summary.recommendArchive, true);
  assert.equal(summary.buckets.length, 1);
});

test("ödev display status gecikme ve değerlendirme", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");
  assert.equal(
    deriveAssignmentDisplayStatus({
      progress: "TODO",
      dueAt: new Date("2026-08-30T12:00:00.000Z"),
      now,
    }),
    "GEC",
  );
  assert.equal(
    deriveAssignmentDisplayStatus({
      progress: "DONE",
      dueAt: new Date("2026-09-02T12:00:00.000Z"),
      now,
      submissionStatus: "APPROVED",
    }),
    "DEGERLENDIRILDI",
  );
  const group = summarizeGroupAssignment({
    now,
    rows: [
      { progress: "DONE", dueAt: new Date("2026-09-02T12:00:00.000Z") },
      { progress: "TODO", dueAt: new Date("2026-09-02T12:00:00.000Z") },
      { progress: "TODO", dueAt: new Date("2026-08-01T12:00:00.000Z") },
    ],
  });
  assert.deepEqual(group, { total: 3, submitted: 1, waiting: 1, late: 1 });
});
