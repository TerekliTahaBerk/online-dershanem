import assert from "node:assert/strict";
import test from "node:test";
import { calculateFirstLessonMetrics, type FirstLessonSample } from "./first-lesson-metrics";
const paidAt = new Date("2026-09-01T00:00:00Z");
const sample: FirstLessonSample = { paidAt, firstLessonAt: new Date("2026-09-03T00:00:00Z"), lessonCompleted: true, attendance: "PRESENT", linkedLead: true };
test("ilk ders ölçümü küçük örneği ve eksik katılımı bastırır", () => {
  assert.equal(calculateFirstLessonMetrics(Array(4).fill(sample)).duration.value, null);
  const metrics = calculateFirstLessonMetrics([...Array(4).fill(sample), { ...sample, attendance: null }, { ...sample, lessonCompleted: false }]);
  assert.equal(metrics.duration.value, 2 * 86_400_000);
  assert.equal(metrics.participation.value, null);
  assert.equal(metrics.waitingCount, 1);
  assert.equal(metrics.missingAttendanceCount, 1);
});
test("ilk ders katılımı geç katılımı içerir; mazur ve gelecek ders başarı sayılmaz", () => {
  const metrics = calculateFirstLessonMetrics([sample, sample, { ...sample, attendance: "LATE" }, { ...sample, attendance: "ABSENT" }, { ...sample, attendance: "ABSENT" }, { ...sample, attendance: "EXCUSED" }, { ...sample, firstLessonAt: new Date("2026-08-01"), lessonCompleted: true }]);
  assert.equal(metrics.participation.value, 60);
  assert.equal(metrics.participation.sampleSize, 5);
  assert.equal(metrics.duration.sampleSize, 6);
});
