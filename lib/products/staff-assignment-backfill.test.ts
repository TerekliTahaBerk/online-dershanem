import assert from "node:assert/strict";
import test from "node:test";

import { backfillRulesFor, planStaffAssignmentBackfill, type BackfillTeacherFacts } from "./staff-assignment-backfill";

const teacher = (overrides: Partial<BackfillTeacherFacts> = {}): BackfillTeacherFacts => ({
  userId: "t1",
  status: "ACTIVE",
  isCoach: false,
  hasOdkReportRelationship: false,
  activeAssignments: [],
  ...overrides,
});

test("R1: her aktif / askıdaki öğretmen yalnız OD ders sorumluluğu alır", () => {
  assert.deepEqual(backfillRulesFor(teacher()), ["R1"]);
  assert.deepEqual(backfillRulesFor(teacher({ status: "SUSPENDED" })), ["R1"]);
  const plan = planStaffAssignmentBackfill([teacher()]);
  assert.deepEqual(plan.grants.map((g) => [g.productCode, g.role, g.rule]), [["OD", "TEACHER", "R1"]]);
});

test("R2: yalnız koç işaretli öğretmen Yön koçluğu alır", () => {
  const plan = planStaffAssignmentBackfill([teacher({ isCoach: true })]);
  assert.deepEqual(plan.grants.map((g) => g.rule), ["R1", "R2"]);
  assert.equal(plan.grants[1]!.productCode, "OK");
  assert.equal(plan.grants[1]!.role, "COACH");
});

test("R3: Deneme Ligi rapor ilişkisi olmayan öğretmene REPORT_VIEWER verilmez", () => {
  const without = planStaffAssignmentBackfill([teacher()]);
  assert.equal(without.grants.some((g) => g.role === "REPORT_VIEWER"), false);
  assert.deepEqual(without.withoutOdkReportRelationship, ["t1"]);

  const withRel = planStaffAssignmentBackfill([teacher({ hasOdkReportRelationship: true })]);
  assert.deepEqual(withRel.grants.map((g) => [g.productCode, g.role]), [["OD", "TEACHER"], ["ODK", "REPORT_VIEWER"]]);
  assert.deepEqual(withRel.withoutOdkReportRelationship, []);
});

test("ayrıcalıklı Deneme Ligi rolleri geçişle asla verilmez", () => {
  const plan = planStaffAssignmentBackfill([teacher({ isCoach: true, hasOdkReportRelationship: true })]);
  for (const grant of plan.grants) {
    assert.ok(["TEACHER", "COACH", "REPORT_VIEWER"].includes(grant.role), grant.role);
  }
});

test("arşivlenmiş öğretmen atlanır", () => {
  const plan = planStaffAssignmentBackfill([teacher({ status: "ARCHIVED", isCoach: true, hasOdkReportRelationship: true })]);
  assert.deepEqual(plan.grants, []);
  assert.deepEqual(plan.skippedArchived, ["t1"]);
});

test("idempotent: zaten aktif olan atama yeniden planlanmaz", () => {
  const plan = planStaffAssignmentBackfill([
    teacher({ isCoach: true, activeAssignments: [{ productCode: "OD", role: "TEACHER" }, { productCode: "OK", role: "COACH" }] }),
  ]);
  assert.deepEqual(plan.grants, []);
  assert.deepEqual(plan.alreadyActive.map((a) => a.rule), ["R1", "R2"]);
});

test("her plan satırı kural gerekçesi taşır", () => {
  const plan = planStaffAssignmentBackfill([teacher({ isCoach: true, hasOdkReportRelationship: true })]);
  for (const grant of plan.grants) assert.match(grant.reason, new RegExp(`Geçiş ${grant.rule}`));
});
