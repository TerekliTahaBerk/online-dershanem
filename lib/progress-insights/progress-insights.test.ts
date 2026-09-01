import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAcademicInsights,
  buildBehavioralInsights,
  computeProgressInsightBundle,
  isDecliningGidisat,
  median,
} from "./compute";
import { buildNarrativeForAudience } from "./narrative";
import { assertNoRiskLeak, stripForParentCalm } from "./privacy";
import { buildAdminGidisatPanel, buildTeacherGidisatOverview } from "./aggregate";
import type { ProgressInsightBundle } from "./types";

function exam(takenAt: string, sections: Array<[string, number, number]>) {
  return {
    takenAt: new Date(takenAt),
    sections: sections.map(([subjectName, correctCount, incorrectCount]) => ({
      subjectName,
      correctCount,
      incorrectCount,
    })),
  };
}

test("akademik trend net delta ve ders yönü hesaplar", () => {
  const academic = buildAcademicInsights([
    exam("2026-01-01", [
      ["Matematik", 20, 4],
      ["Türkçe", 15, 8],
    ]),
    exam("2026-02-01", [
      ["Matematik", 28, 4],
      ["Türkçe", 12, 8],
    ]),
  ]);

  assert.equal(academic.examCount, 2);
  assert.ok(academic.netDelta !== null);
  assert.ok(academic.netDelta! > 0);
  assert.equal(academic.subjectSeries.length, 2);
  const mat = academic.subjectSeries.find((s) => s.name === "Matematik");
  assert.equal(mat?.direction, "up");
  const tur = academic.subjectSeries.find((s) => s.name === "Türkçe");
  assert.equal(tur?.direction, "down");
  assert.ok(academic.strengths.some((s) => s.subject === "Matematik"));
  assert.ok(academic.supportAreas.some((s) => s.subject === "Türkçe"));
});

test("davranış oranları denominator 0 iken null kalır", () => {
  const empty = buildBehavioralInsights({
    attendance: [],
    assignments: [],
    planTasks: [],
  });
  assert.equal(empty.attendance.percent, null);
  assert.equal(empty.assignments.percent, null);
  assert.equal(empty.plan.percent, null);

  const filled = buildBehavioralInsights({
    attendance: [{ status: "PRESENT" }, { status: "ABSENT" }, { status: "LATE" }],
    assignments: [{ done: true }, { done: false }],
    planTasks: [{ done: true }, { done: true }, { done: false }, { done: false }],
  });
  assert.equal(filled.attendance.percent, 67);
  assert.equal(filled.assignments.percent, 50);
  assert.equal(filled.plan.percent, 50);
});

test("parent_calm risk alanını strip eder", () => {
  const base = computeProgressInsightBundle({
    studentId: "s1",
    studentName: "Ayşe",
    period: {
      label: "test",
      fromIso: "2026-01-01T00:00:00.000Z",
      toIso: "2026-01-31T00:00:00.000Z",
    },
    exams: [
      exam("2026-01-05", [["Matematik", 10, 4]]),
      exam("2026-01-20", [["Matematik", 18, 4]]),
    ],
    attendance: [{ status: "PRESENT" }, { status: "PRESENT" }],
    assignments: [{ done: true }],
    planTasks: [{ done: true }],
    riskHint: "Risk skoru: 74 · müdahale vakası açık",
  });

  const withTeacherNarrative: ProgressInsightBundle = {
    ...base,
    narrative: buildNarrativeForAudience(base, "teacher"),
  };
  assert.ok(withTeacherNarrative.riskHint);
  assert.ok(withTeacherNarrative.narrative.some((line) => line.includes("Risk")));

  const parent = stripForParentCalm(withTeacherNarrative);
  assert.equal(parent.riskHint, undefined);
  assert.ok(assertNoRiskLeak(parent));
  assert.ok(parent.narrative.length > 0);
  assert.ok(!parent.narrative.join(" ").includes("Risk skoru"));
});

test("düşen gidişat bayrağı net ve davranış eşiklerini kullanır", () => {
  assert.equal(
    isDecliningGidisat({
      netDelta: -2,
      attendancePercent: 90,
      assignmentPercent: 80,
      planPercent: 80,
    }),
    true,
  );
  assert.equal(
    isDecliningGidisat({
      netDelta: 1,
      attendancePercent: 60,
      assignmentPercent: 80,
      planPercent: 80,
    }),
    true,
  );
  assert.equal(
    isDecliningGidisat({
      netDelta: 1,
      attendancePercent: 90,
      assignmentPercent: 80,
      planPercent: 80,
    }),
    false,
  );
});

test("öğretmen aggregate medyan ve declining listesi üretir", () => {
  const period = {
    label: "test",
    fromIso: "2026-01-01T00:00:00.000Z",
    toIso: "2026-01-31T00:00:00.000Z",
  };

  const makeBundle = (
    id: string,
    name: string,
    netDelta: number | null,
    attendance: number,
  ): ProgressInsightBundle => ({
    studentId: id,
    studentName: name,
    period,
    academic: {
      examCount: netDelta === null ? 0 : 2,
      netTrend: [],
      netDelta,
      subjectSeries: [],
      labels: [],
      strengths: [],
      supportAreas: [],
      subjectCaption: undefined,
    },
    behavioral: {
      attendance: { percent: attendance, numerator: attendance, denominator: 100 },
      assignments: { percent: 80, numerator: 8, denominator: 10 },
      plan: { percent: 80, numerator: 8, denominator: 10 },
    },
    narrative: [],
    isEmpty: false,
    riskHint: null,
  });

  const overview = buildTeacherGidisatOverview({
    period,
    bundles: [
      makeBundle("1", "Zeynep", -3, 90),
      makeBundle("2", "Ali", 2, 95),
      makeBundle("3", "Can", 0, 50),
    ],
    studentMeta: [
      { studentId: "1", studentName: "Zeynep", classLevel: "12" },
      { studentId: "2", studentName: "Ali", classLevel: "12" },
      { studentId: "3", studentName: "Can", classLevel: "11" },
    ],
  });

  assert.equal(overview.studentCount, 3);
  assert.equal(overview.declining.length, 2);
  assert.ok(overview.declining.some((r) => r.studentName === "Zeynep"));
  assert.ok(overview.declining.some((r) => r.studentName === "Can"));
  assert.equal(overview.averages.medianNetDelta, median([-3, 2, 0]));
});

test("admin gidişat paneli küçük kohortu bastırır", () => {
  const suppressed = buildAdminGidisatPanel({
    attendancePercent: 82,
    assignmentPercent: 70,
    planPercent: 65,
    netDeltas: [1, 2, -1],
    sparkline: [
      { label: "A", net: 1 },
      { label: "B", net: 2 },
    ],
    suppressMin: 10,
  });
  assert.equal(suppressed.suppressed, true);
  assert.equal(suppressed.medianNetDelta, null);
  assert.ok(suppressed.narrative.some((line) => line.includes("bastırıldı")));

  const ready = buildAdminGidisatPanel({
    attendancePercent: 82,
    assignmentPercent: 70,
    planPercent: 65,
    netDeltas: Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 1 : -0.5)),
    sparkline: [
      { label: "A", net: 1 },
      { label: "B", net: -0.5 },
    ],
    suppressMin: 10,
  });
  assert.equal(ready.suppressed, false);
  assert.ok(ready.medianNetDelta !== null);
});

test("includeExams false akademik bloğu boş bırakır", () => {
  const academic = buildAcademicInsights(
    [exam("2026-01-01", [["Matematik", 20, 0]]), exam("2026-02-01", [["Matematik", 25, 0]])],
    { includeExams: false },
  );
  assert.equal(academic.examCount, 0);
  assert.equal(academic.netTrend.length, 0);
});
