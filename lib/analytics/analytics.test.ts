import assert from "node:assert/strict";
import test from "node:test";

import { calculateCommercialMetrics } from "./commercial";
import { calculateEducationMetrics } from "./education";
import { calculateTeacherOpsMetrics } from "./teacher-ops";
import { calculateSuccessMetrics } from "./success";
import { parseAnalyticsFilters, productMatchesFilter } from "./filters";
import { suppressCohortMetric } from "./privacy";
import {
  METRIC_DEFINITIONS,
  MANAGEMENT_ANALYTICS_TIMEZONE,
  getMetricDefinition,
  primaryKpiDefinitions,
} from "./definitions";
import { buildDashboardKpis } from "./dashboard";
import {
  ANALYTICS_EXPORT_FORBIDDEN_HEADERS,
  analyticsExportCsv,
  buildAnalyticsExportRows,
} from "./export";
import { parseIstanbulDateInput, formatIstanbulDateInput } from "@/lib/istanbul-time";

test("her metrik tanımında definition/source/date/tz/denominator vardır", () => {
  for (const def of METRIC_DEFINITIONS) {
    assert.ok(def.definition.length > 10, def.key);
    assert.ok(def.querySource.length > 5, def.key);
    assert.ok(def.dateSemantics, def.key);
    assert.equal(def.timezone, MANAGEMENT_ANALYTICS_TIMEZONE);
    assert.ok(def.denominator.length > 3, def.key);
  }
  assert.ok(primaryKpiDefinitions().length <= 10);
  assert.ok(primaryKpiDefinitions().length >= 8);
});

test("tarih aralığı Europe/Istanbul gün sınırlarını kullanır", () => {
  const filters = parseAnalyticsFilters({
    from: "2026-03-01",
    to: "2026-03-01",
    now: parseIstanbulDateInput("2026-03-15")!,
  });
  assert.equal(formatIstanbulDateInput(filters.from), "2026-03-01");
  assert.equal(formatIstanbulDateInput(filters.to), "2026-03-01");
  // Gün sonu dahil: 20:59:59.999 UTC = 23:59:59.999 +03
  assert.equal(filters.to.getUTCHours(), 20);
  assert.equal(filters.to.getUTCMinutes(), 59);
  assert.equal(filters.notice, null);
});

test("geçersiz tarih varsayılana düşer ve notice üretir", () => {
  const filters = parseAnalyticsFilters({
    from: "not-a-date",
    to: "2026-04-10",
    now: parseIstanbulDateInput("2026-04-10")!,
  });
  assert.ok(filters.notice?.includes("Başlangıç"));
  assert.equal(formatIstanbulDateInput(filters.to), "2026-04-10");
});

test("boş ticari veride oranlar null, sayılar sıfır", () => {
  const metrics = calculateCommercialMetrics({
    leadCount: 0,
    wonLeadCount: 0,
    paidOrderCount: 0,
    provisionedOrderCount: 0,
    refundedOrderCount: 0,
    refundedCents: 0,
    collectionsCents: 0,
    packageRenewalsUpcoming: 0,
    salesCycleMs: [],
    salesByProduct: [],
  });
  assert.equal(metrics.leadCount, 0);
  assert.equal(metrics.leadToWonPercent, null);
  assert.equal(metrics.wonToPaidPercent, null);
  assert.equal(metrics.paidToProvisionedPercent, null);
  assert.equal(metrics.avgSalesCycleDays, null);
  assert.equal(metrics.collectionsCents, 0);
});

test("ürün filtresi ALL dışında yalnız eşleşeni kabul eder", () => {
  assert.equal(productMatchesFilter("OD", "ALL"), true);
  assert.equal(productMatchesFilter("OD", "OD"), true);
  assert.equal(productMatchesFilter("ODK", "OD"), false);
  assert.equal(productMatchesFilter(null, "ODK"), false);
});

test("küçük kohort metrikleri bastırılır", () => {
  const suppressed = suppressCohortMetric(9, 12.5);
  assert.equal(suppressed.status, "SUPPRESSED");
  assert.equal(suppressed.value, null);
  assert.equal(suppressed.sampleSize, 9);

  const ready = suppressCohortMetric(10, 12.5);
  assert.equal(ready.status, "READY");
  assert.equal(ready.value, 12.5);

  const empty = suppressCohortMetric(0, 1);
  assert.equal(empty.status, "EMPTY");
});

test("success metrikleri yetersiz örneklemde değer göstermez", () => {
  const metrics = calculateSuccessMetrics({
    observations: Array.from({ length: 5 }, (_, i) => ({
      studentKey: `s${i}`,
      exam: "TYT" as const,
      takenAt: new Date("2026-01-01T10:00:00.000Z"),
      sections: [{ questionCount: 40, correctCount: 20, incorrectCount: 10 }],
    })),
    subjectChanges: [
      { subjectCode: "MAT", subjectName: "Matematik", changes: [1, 2, 3] },
    ],
    lessonsCompleted: 4,
    lessonsCompletedWithOutcome: 2,
    planCompletionPercent: 50,
    planSampleSize: 4,
    mockParticipationPercent: 40,
    mockSampleSize: 4,
  });

  assert.equal(metrics.mockExamTrends[0]?.status, "INSUFFICIENT_SAMPLE");
  assert.equal(metrics.subjectProgress[0]?.status, "SUPPRESSED");
  assert.equal(metrics.outcomeProgress.status, "SUPPRESSED");
  assert.equal(metrics.planAlignmentVsOutcome.status, "SUPPRESSED");
});

test("öğretmen ops sıralama üretmez; yalnız aggregate yük", () => {
  const metrics = calculateTeacherOpsMetrics({
    lessonsEligible: 10,
    lessonsCompleted: 8,
    openInterventions: 2,
    overdueAssignmentProgress: 3,
    pastPlannedLessons: 1,
    interventionsCreated: 5,
    interventionsResolved: 4,
    activeEnrollments: 40,
    distinctActiveTeachers: 4,
  });
  assert.equal(metrics.lessonCloseCompletionPercent, 80);
  assert.equal(metrics.openWorkItems, 6);
  assert.equal(metrics.interventionResolutionPercent, 80);
  assert.equal(metrics.averageStudentLoad, 10);
  assert.equal("ranking" in metrics, false);
  assert.equal("leaderboard" in metrics, false);
});

test("eğitim risk dağılımı normal kovayı active − critical − watch hesaplar", () => {
  const metrics = calculateEducationMetrics({
    activeStudents: 100,
    activeGroups: 12,
    attendancePresentOrLate: 80,
    attendanceTotal: 100,
    assignmentDone: 50,
    assignmentProgressTotal: 100,
    planTasksDone: 30,
    planTasksTotal: 60,
    mockExamParticipants: 40,
    riskCritical: 5,
    riskWatch: 10,
    interventionsOpened: 8,
  });
  assert.equal(metrics.risk.critical, 5);
  assert.equal(metrics.risk.watch, 10);
  assert.equal(metrics.risk.normal, 85);
  assert.equal(metrics.lessonAttendancePercent, 80);
});

test("dashboard en fazla 10 KPI üretir ve her biri drill-down href taşır", () => {
  const commercial = calculateCommercialMetrics({
    leadCount: 20,
    wonLeadCount: 4,
    paidOrderCount: 3,
    provisionedOrderCount: 3,
    refundedOrderCount: 0,
    refundedCents: 0,
    collectionsCents: 150_000,
    packageRenewalsUpcoming: 2,
    salesCycleMs: [3 * 86_400_000],
    salesByProduct: [{ product: "OD", packageName: "Paket A", orderCount: 3, totalCents: 150_000 }],
  });
  const education = calculateEducationMetrics({
    activeStudents: 50,
    activeGroups: 5,
    attendancePresentOrLate: 40,
    attendanceTotal: 50,
    assignmentDone: 20,
    assignmentProgressTotal: 40,
    planTasksDone: 10,
    planTasksTotal: 20,
    mockExamParticipants: 15,
    riskCritical: 1,
    riskWatch: 2,
    interventionsOpened: 3,
  });
  const teacherOps = calculateTeacherOpsMetrics({
    lessonsEligible: 20,
    lessonsCompleted: 18,
    openInterventions: 1,
    overdueAssignmentProgress: 2,
    pastPlannedLessons: 0,
    interventionsCreated: 4,
    interventionsResolved: 3,
    activeEnrollments: 50,
    distinctActiveTeachers: 5,
  });
  const kpis = buildDashboardKpis({ commercial, education, teacherOps });
  assert.ok(kpis.length <= 10);
  assert.ok(kpis.length >= 8);
  for (const kpi of kpis) {
    assert.ok(kpi.href.includes(`/panel/yonetim/analitik/${kpi.key}`));
    assert.ok(getMetricDefinition(kpi.key));
  }
});

test("CSV export PII başlığı ve kimlik alanı içermez", () => {
  const commercial = calculateCommercialMetrics({
    leadCount: 0,
    wonLeadCount: 0,
    paidOrderCount: 0,
    provisionedOrderCount: 0,
    refundedOrderCount: 0,
    refundedCents: 0,
    collectionsCents: 0,
    packageRenewalsUpcoming: 0,
    salesCycleMs: [],
    salesByProduct: [],
  });
  const education = calculateEducationMetrics({
    activeStudents: 0,
    activeGroups: 0,
    attendancePresentOrLate: 0,
    attendanceTotal: 0,
    assignmentDone: 0,
    assignmentProgressTotal: 0,
    planTasksDone: 0,
    planTasksTotal: 0,
    mockExamParticipants: 0,
    riskCritical: 0,
    riskWatch: 0,
    interventionsOpened: 0,
  });
  const teacherOps = calculateTeacherOpsMetrics({
    lessonsEligible: 0,
    lessonsCompleted: 0,
    openInterventions: 0,
    overdueAssignmentProgress: 0,
    pastPlannedLessons: 0,
    interventionsCreated: 0,
    interventionsResolved: 0,
    activeEnrollments: 0,
    distinctActiveTeachers: 0,
  });
  const success = calculateSuccessMetrics({
    observations: [],
    subjectChanges: [],
    lessonsCompleted: 0,
    lessonsCompletedWithOutcome: 0,
    planCompletionPercent: null,
    planSampleSize: 0,
    mockParticipationPercent: null,
    mockSampleSize: 0,
  });
  const snapshot = {
    ruleVersion: "management-analytics-v1",
    timezone: MANAGEMENT_ANALYTICS_TIMEZONE,
    commercial,
    education,
    success,
    teacherOps,
    kpis: [],
  };
  const filters = parseAnalyticsFilters({
    from: "2026-01-01",
    to: "2026-01-31",
    product: "OD",
    now: parseIstanbulDateInput("2026-01-31")!,
  });
  const rows = buildAnalyticsExportRows(snapshot);
  const csv = analyticsExportCsv(snapshot, filters);
  const headerLine = csv.split(/\r?\n/).find((line) => line.includes("metricKey"));
  assert.ok(headerLine);
  for (const forbidden of ANALYTICS_EXPORT_FORBIDDEN_HEADERS) {
    assert.equal(headerLine!.toLowerCase().includes(forbidden.toLowerCase()), false);
    assert.equal(csv.toLowerCase().includes(`${forbidden}`), false);
  }
  assert.ok(rows.every((row) => !("email" in row) && !("studentId" in row)));
  assert.ok(csv.includes("Europe/Istanbul"));
  assert.ok(csv.includes("product=OD"));
});

test("active_students tanımı membership şartını açıklar", () => {
  const def = getMetricDefinition("active_students");
  assert.ok(def);
  assert.ok(def!.definition.toLowerCase().includes("membership"));
  assert.equal(def!.dateSemantics, "point_in_time");
});

test("yetki sözleşmesi: export yalnız aggregate alanlar taşır (ADMIN gate dokümante)", () => {
  // Sayfa/API gate: requireRole("ADMIN") / requireApiOdRole("ADMIN").
  // Birim testte Prisma oturumu yok; sözleşmeyi export şeması ile doğrularız.
  for (const forbidden of ANALYTICS_EXPORT_FORBIDDEN_HEADERS) {
    assert.ok(!METRIC_DEFINITIONS.some((def) => def.key.toLowerCase().includes(forbidden.toLowerCase())));
  }
  assert.ok(getMetricDefinition("lead_to_won"));
});
