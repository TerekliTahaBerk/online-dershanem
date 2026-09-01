import assert from "node:assert/strict";
import test from "node:test";
import {
  PARENT_HIDDEN_CATEGORIES,
  buildParentActions,
  buildParentCalmStatus,
  buildParentWeekSummary,
  buildSubjectTrendSentence,
  subjectTrendDirection,
  withParentStudentContext,
} from "./parent-calm";

test("week summary uses plan percent and subject sentences without risk scores", () => {
  const summary = buildParentWeekSummary({
    planDone: 41,
    planTotal: 50,
    subjectTrends: [
      buildSubjectTrendSentence("Matematik", [10, 14]),
      buildSubjectTrendSentence("Fen", [12, 8]),
    ],
    attendanceAttended: 4,
    attendanceTotal: 4,
    hasPlan: true,
    hasAttendance: true,
  });
  assert.match(summary, /%82/);
  assert.match(summary, /Matematik performansı yükseliyor/);
  assert.match(summary, /Fen tarafında tekrar öneriliyor/);
  assert.doesNotMatch(summary, /risk|skor|sıralama/i);
});

test("subject trend direction thresholds stay calm and deterministic", () => {
  assert.equal(subjectTrendDirection([10, 12]), "up");
  assert.equal(subjectTrendDirection([12, 10]), "down");
  assert.equal(subjectTrendDirection([10, 10.5]), "steady");
  assert.equal(subjectTrendDirection([10]), "limited");
});

test("status never invents on-track when data is missing", () => {
  const status = buildParentCalmStatus({
    hasOD: true,
    hasOK: true,
    hasExamAccess: false,
    attendanceTotal: 0,
    attendanceAttended: 0,
    planDone: 0,
    planTotal: 0,
    hasExamData: false,
  });
  assert.equal(status.code, "LIMITED_DATA");
  assert.doesNotMatch(status.sentence, /risk|skor/i);
});

test("parent actions only include real actionable items", () => {
  const empty = buildParentActions({
    studentId: "s1",
    packageExpiring: null,
    missingPhone: false,
    unreadDigest: false,
    importantNotice: null,
  });
  assert.deepEqual(empty, []);

  const actions = buildParentActions({
    studentId: "s1",
    packageExpiring: { productLabel: "Online Dershanem", daysLeft: 5 },
    missingPhone: true,
    unreadDigest: true,
    importantNotice: { title: "Ödeme hatırlatması", href: "/panel/veli/hesap" },
  });
  assert.equal(actions.length, 3);
  assert.equal(actions[0]?.kind, "PACKAGE_RENEWAL");
  assert.equal(actions[1]?.kind, "CONTACT_UPDATE");
  assert.equal(actions[2]?.kind, "DIGEST_REVIEW");
});

test("child context is preserved on deep links", () => {
  assert.equal(
    withParentStudentContext("/panel/veli/kocluk", "student-1"),
    "/panel/veli/kocluk?studentId=student-1",
  );
});

test("privacy catalogue lists teacher private notes and risk scores as hidden", () => {
  assert.ok(PARENT_HIDDEN_CATEGORIES.includes("teacher_private_lesson_notes"));
  assert.ok(PARENT_HIDDEN_CATEGORIES.includes("internal_risk_scores"));
  assert.ok(PARENT_HIDDEN_CATEGORIES.includes("coach_private_session_notes"));
  assert.ok(PARENT_HIDDEN_CATEGORIES.includes("audit_logs"));
});
