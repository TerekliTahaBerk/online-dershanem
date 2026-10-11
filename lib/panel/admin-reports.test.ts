import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminReports, formatSloValue, type AdminReportsInput } from "./admin-reports";

const now = new Date("2026-10-11T08:00:00.000Z");
const teacherA = { id: "t1", fullName: "Ada", email: "ada@example.com" };
const teacherB = { id: "t2", fullName: null, email: "b@example.com" };
const base: AdminReportsInput = {
  now,
  flags: { reviewQueue: true, adaptivePlan: true, teacherAiDrafts: true },
  lessons: [
    { teacherId: "t1", status: "COMPLETED", teacher: teacherA },
    { teacherId: "t1", status: "PLANNED", teacher: teacherA },
    { teacherId: "t2", status: "COMPLETED", teacher: teacherB },
  ],
  groups: [
    { id: "g1", name: "8-A", enrollmentCount: 3, activeAssignmentCount: 2, progressStatuses: ["DONE", "DONE", "IN_PROGRESS", "NOT_STARTED"] },
    { id: "g2", name: "Boş", enrollmentCount: 0, activeAssignmentCount: 0, progressStatuses: [] },
  ],
  attendanceStatuses: ["PRESENT", "LATE", "ABSENT", "EXCUSED"],
  overdueAssignments: 4,
  pendingPayments: 2,
  productEvents: [{ name: "plan_generated", properties: { taskCount: 10 } }, { name: "plan_task_completed", properties: {} }, { name: "plan_task_completed", properties: {} }],
  sloMetrics: [{ key: "teacher_close_time_p50", label: "Ders kapanışı p50", sampleSize: 6, value: 90_000, unit: "ms", target: 120_000, comparison: "lte", status: "healthy" }],
  reviewItems: [
    { createdAt: new Date(now.getTime() - 10 * 86_400_000), attempts: [{ reviewedAt: new Date(now.getTime() - 9 * 86_400_000), response: "CORRECT", stageBefore: 4 }] },
    { createdAt: new Date(now.getTime() - 9 * 86_400_000), attempts: [] },
    { createdAt: new Date(now.getTime() - 1 * 86_400_000), attempts: [{ reviewedAt: now, response: "WRONG", stageBefore: 4 }] },
  ],
  aiDrafts: [],
};

test("raporlar: web sayfasının önceki hesaplarıyla aynı oranlar", () => {
  const reports = buildAdminReports(base);
  assert.equal(reports.noteRate, 67);
  assert.equal(reports.attendanceRate, 50, "PRESENT + LATE katılım sayılır");
  assert.equal(reports.activeAssignments, 2);
  assert.equal(reports.emptyGroups, 1);
  assert.deepEqual(reports.teachers, [
    { name: "Ada", total: 2, completed: 1, percent: 50 },
    { name: "b@example.com", total: 1, completed: 1, percent: 100 },
  ]);
  assert.deepEqual(reports.groups.map((group) => group.percent), [50, 0]);
  assert.deepEqual(reports.review, { sevenDayRate: 50, eligible: 2, retentionRate: 50, retentionAttempts: 2 });
  assert.deepEqual(reports.plan, { completionRate: 20, completed: 2, generated: 10 });
  assert.deepEqual(reports.ai, { approvalRate: null, reviewed: 0, fallbackRate: null, drafts: 0, flagRate: null, knownCostUsd: 0 });
  assert.equal(reports.slo[0].display, "1,5 dk");
  assert.equal(reports.slo[0].targetDisplay, "2 dk");
  assert.equal(reports.slo[0].statusLabel, "Hedefte");
});

test("raporlar: kapalı bayrak bölümü üretmez; maliyeti bilinmeyen AI üretimi null maliyet", () => {
  const off = buildAdminReports({ ...base, flags: { reviewQueue: false, adaptivePlan: false, teacherAiDrafts: false } });
  assert.equal(off.review, null);
  assert.equal(off.plan, null);
  assert.equal(off.ai, null);
  const unknown = buildAdminReports({ ...base, aiDrafts: [{ status: "APPROVED", provider: "OPENAI", estimatedCostMicrousd: null }] });
  assert.equal(unknown.ai?.knownCostUsd, null);
});

test("SLO biçimi: sayı / yüzde / süre", () => {
  assert.equal(formatSloValue(null, "ms"), "—");
  assert.equal(formatSloValue(1234, "count"), "1.234");
  assert.equal(formatSloValue(99.5, "percent"), "%99,5");
  assert.equal(formatSloValue(1500, "ms"), "1,5 sn");
});
