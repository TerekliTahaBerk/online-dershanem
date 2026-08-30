import assert from "node:assert/strict";
import test from "node:test";
import {
  buildParentHomeStatus,
  buildParentSecondaryMetrics,
  withParentStudentContext,
} from "./parent-home-summary";

test("status: enough healthy evidence returns ON_TRACK", () => {
  const summary = buildParentHomeStatus({
    hasOD: true,
    hasOK: true,
    hasExamAccess: true,
    attendanceTotal: 12,
    attendanceAttended: 11,
    planDone: 7,
    planTotal: 8,
    latestExamNet: 62.5,
    latestExamLabel: "TYT · 2 Eylül",
  });

  assert.equal(summary.code, "ON_TRACK");
  assert.equal(summary.hasEnoughEvidence, true);
  assert.equal(summary.title, "Genel olarak düzenli ilerliyor.");
  assert.equal(summary.evidence.length >= 2, true);
});

test("status: meaningful issue returns NEEDS_ATTENTION", () => {
  const summary = buildParentHomeStatus({
    hasOD: true,
    hasOK: true,
    hasExamAccess: false,
    attendanceTotal: 12,
    attendanceAttended: 6,
    planDone: 2,
    planTotal: 8,
    latestExamNet: null,
  });

  assert.equal(summary.code, "NEEDS_ATTENTION");
  assert.equal(summary.hasEnoughEvidence, true);
  assert.equal(summary.needsPlanSupport, true);
});

test("status: low data never returns false positive on-track", () => {
  const summary = buildParentHomeStatus({
    hasOD: true,
    hasOK: true,
    hasExamAccess: false,
    attendanceTotal: 0,
    attendanceAttended: 0,
    planDone: 0,
    planTotal: 0,
    latestExamNet: null,
  });

  assert.equal(summary.code, "LOW_DATA");
  assert.equal(summary.hasEnoughEvidence, false);
  assert.equal(summary.title.includes("yeterli veri"), true);
});

test("secondary metrics: entitlement-aware labels and values are correct", () => {
  const odOnly = buildParentSecondaryMetrics({
    hasOD: true,
    hasOK: false,
    hasExamAccess: false,
    attendanceTotal: 8,
    attendanceAttended: 7,
    planDone: 0,
    planTotal: 0,
    latestExamNet: null,
    latestExamLabel: null,
  });
  assert.equal(odOnly.length, 1);
  assert.equal(odOnly[0]?.label, "Son 8 derste katılım");
  assert.equal(odOnly[0]?.value, "7 / 8");

  const okAndExam = buildParentSecondaryMetrics({
    hasOD: false,
    hasOK: true,
    hasExamAccess: true,
    attendanceTotal: 0,
    attendanceAttended: 0,
    planDone: 4,
    planTotal: 6,
    latestExamNet: 42.25,
    latestExamLabel: "TYT · 2 Eylül",
  });
  assert.deepEqual(okAndExam, [
    { id: "plan", label: "Bu haftaki plan", value: "4 / 6", description: "çalışma tamamlandı" },
    { id: "exam", label: "Son deneme · TYT · 2 Eylül", value: "42.25 net" },
  ]);
});

test("parent deep-link context is preserved for child switches", () => {
  assert.equal(
    withParentStudentContext("/panel/veli/kocluk", "student-1"),
    "/panel/veli/kocluk?studentId=student-1",
  );
  assert.equal(
    withParentStudentContext("/panel/odk/veli/raporlar?ogrenci=u1", "student-1"),
    "/panel/odk/veli/raporlar?ogrenci=u1&studentId=student-1",
  );
});

test("privacy regression: status text never includes private-only wording", () => {
  const summary = buildParentHomeStatus({
    hasOD: true,
    hasOK: true,
    hasExamAccess: true,
    attendanceTotal: 12,
    attendanceAttended: 9,
    planDone: 6,
    planTotal: 8,
    latestExamNet: 40,
    latestExamLabel: "TYT",
  });
  const joined = `${summary.title} ${summary.description} ${summary.evidence.join(" ")}`.toLowerCase();
  assert.equal(joined.includes("private"), false);
  assert.equal(joined.includes("özel not"), false);
  assert.equal(joined.includes("check-in"), false);
});
