import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COACH_ATTENTION_LABEL,
  COACH_ATTENTION_ORDER,
  buildCoachWorkspace,
  coachAttentionReasons,
  type CoachStudentSignals,
} from "./coach-workspace";

function student(id: string, overrides: Partial<CoachStudentSignals> = {}): CoachStudentSignals {
  return {
    studentId: id,
    name: id,
    targetGoal: null,
    overdue: false,
    nextScheduledAt: null,
    rescheduleRequested: false,
    planStatus: "APPROVED",
    planCompletionPct: 80,
    checkInThisWeek: true,
    openHelpRequests: 0,
    pendingSuggestions: 0,
    ...overrides,
  };
}

const ALL_ON = { adaptivePlan: true, studentCheckIn: true };

test("koç dikkat nedenleri sabit sırayla çıkar", () => {
  const reasons = coachAttentionReasons(
    student("a", {
      overdue: true,
      rescheduleRequested: true,
      planStatus: "CHANGE_REQUESTED",
      checkInThisWeek: false,
      openHelpRequests: 2,
      pendingSuggestions: 1,
    }),
    ALL_ON,
  );
  assert.deepEqual(reasons, [
    "RESCHEDULE_REQUESTED",
    "HELP_OPEN",
    "SESSION_OVERDUE",
    "PLAN_APPROVAL",
    "SUGGESTION_PENDING",
    "CHECK_IN_MISSING",
  ]);
  assert.deepEqual(coachAttentionReasons(student("ok"), ALL_ON), []);
  assert.deepEqual(coachAttentionReasons(student("draft", { planStatus: "DRAFT" }), ALL_ON), ["PLAN_APPROVAL"]);
  assert.deepEqual(coachAttentionReasons(student("none", { planStatus: null }), ALL_ON), ["NO_PLAN"]);
  assert.deepEqual(coachAttentionReasons(student("low", { planCompletionPct: 30 }), ALL_ON), ["LOW_COMPLIANCE"]);
  // Eşik ürün kararıdır; ölçüm yoksa düşük sayılmaz.
  assert.deepEqual(coachAttentionReasons(student("low", { planCompletionPct: 30 }), { ...ALL_ON, lowComplianceThreshold: 25 }), []);
  assert.deepEqual(coachAttentionReasons(student("nopct", { planCompletionPct: null }), ALL_ON), []);
});

test("kapalı özelliklerin nedenleri üretilmez", () => {
  const signals = student("x", { planStatus: null, checkInThisWeek: false, openHelpRequests: 1, pendingSuggestions: 3, overdue: true });
  assert.deepEqual(coachAttentionReasons(signals, { adaptivePlan: false, studentCheckIn: false }), ["SESSION_OVERDUE"]);
  assert.deepEqual(coachAttentionReasons(signals, { adaptivePlan: true, studentCheckIn: false }), [
    "SESSION_OVERDUE",
    "SUGGESTION_PENDING",
    "NO_PLAN",
  ]);
});

test("koç çalışma alanı kuyrukları neden bazında gruplar", () => {
  const workspace = buildCoachWorkspace(
    [
      student("Zeynep", { overdue: true, planStatus: null }),
      student("Ali", { planStatus: null }),
      student("Can"),
    ],
    ALL_ON,
  );
  assert.deepEqual(
    workspace.groups.map((group) => [group.reason, group.students.map((s) => s.name)]),
    [
      ["SESSION_OVERDUE", ["Zeynep"]],
      ["NO_PLAN", ["Ali", "Zeynep"]],
    ],
  );
  assert.equal(workspace.groups[0].label, "Görüşme gecikti");
  assert.equal(workspace.attentionCount, 2);
  assert.equal(workspace.primaryReason.get("Zeynep"), "SESSION_OVERDUE");
  assert.equal(workspace.primaryReason.get("Can"), null);
  assert.equal(buildCoachWorkspace([], ALL_ON).groups.length, 0);
  for (const reason of COACH_ATTENTION_ORDER) assert.ok(COACH_ATTENTION_LABEL[reason]);
});
