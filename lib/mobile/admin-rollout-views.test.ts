import assert from "node:assert/strict";
import test from "node:test";
import { parseMockExamPaste, parseMockExamsAdmin, parsePilot } from "@/lib/mobile-contracts/admin-rollout";
import type { AdminMockExams } from "@/lib/panel/admin-mock-exams-server";
import { mockExamRevision } from "@/lib/panel/mock-exam-core";
import type { PilotPage } from "@/lib/panel/pilot-server";
import { toMobileMockExams, toMobilePilot } from "./admin-rollout-views";

const at = (iso: string) => new Date(iso);
const roles = (...list: ("ADMIN" | "TEACHER" | "STUDENT" | "PARENT")[]) => list.map((role) => ({ role }));

test("pilot: izinli geçişler web kuralından; durum etiketleri ve kapı özetleri", () => {
  const page = {
    groups: [{ id: "g1", name: "8-A", teacher: { fullName: "Ali", email: "ali@example.com" }, enrollments: [{ student: { parents: [{ parentId: "p1" }] } }, { student: { parents: [{ parentId: "p1" }, { parentId: "p2" }] } }] }],
    cohorts: [
      { id: "c1", groupNameSnapshot: "8-A", status: "DRAFT", version: 1, createdAt: at("2026-10-10T08:00:00Z"), members: roles("ADMIN", "TEACHER", "STUDENT", "PARENT") },
      { id: "c2", groupNameSnapshot: "8-B", status: "ACTIVE", version: 3, createdAt: at("2026-10-09T08:00:00Z"), members: roles("ADMIN", "TEACHER", "STUDENT", "STUDENT", "PARENT") },
      { id: "c3", groupNameSnapshot: "8-C", status: "PAUSED", version: 4, createdAt: at("2026-10-08T08:00:00Z"), members: roles("ADMIN") },
      { id: "c4", groupNameSnapshot: "8-D", status: "ROLLED_BACK", version: 5, createdAt: at("2026-10-07T08:00:00Z"), members: roles("ADMIN") },
    ],
    readiness: { canActivate: true, canExpand: false, checks: [{ key: "slo", label: "SLO", status: "WAIT", detail: "örneklem bekleniyor" }] },
  } as unknown as PilotPage;
  const view = toMobilePilot(page);
  assert.ok(parsePilot(JSON.parse(JSON.stringify(view))).ok);
  assert.equal(view.meta, "Pilot başlatılabilir");
  assert.equal(view.groups[0].detail, "Ali · 2 öğrenci · 2 veli");
  assert.equal(view.readiness.checks[0].statusLabel, "Veri bekliyor");
  const actions = Object.fromEntries(view.cohorts.map((cohort) => [cohort.id, cohort.actions.map((item) => item.action)]));
  assert.deepEqual(actions, { c1: ["ACTIVATE"], c2: ["PAUSE", "COMPLETE", "ROLLBACK"], c3: ["RESUME", "ROLLBACK"], c4: [] });
  assert.deepEqual(view.cohorts[1].coverage, { ADMIN: 1, TEACHER: 1, STUDENT: 2, PARENT: 1 });
  assert.equal(view.cohorts[1].actions.find((item) => item.action === "ROLLBACK")?.needsReason, true);
});

const exam = (id: string, studentId: string, takenAt: string, errors: string[][], nextAction: string | null = null) => ({
  id,
  studentId,
  exam: "TYT",
  title: id,
  publisher: "",
  takenAt: at(takenAt),
  durationMinutes: 165,
  nextAction,
  sections: [
    { id: `${id}-tr`, subjectCode: "TR", subjectName: "Türkçe", correctCount: 30, incorrectCount: 8, blankCount: 2, errors: (errors[0] ?? []).map((category) => ({ category })) },
    { id: `${id}-mat`, subjectCode: "MAT", subjectName: "Temel Matematik", correctCount: 20, incorrectCount: 4, blankCount: 16, errors: (errors[1] ?? []).map((category) => ({ category })) },
  ],
});

test("dış denemeler: seçili öğrenci, web net hesabı, ısı tablosu ve onay koşulu", () => {
  const data = {
    students: [{ id: "s1", user: { fullName: "Ece", email: "e@example.com" } }, { id: "s2", user: { fullName: null, email: "d@example.com" } }],
    exams: [exam("e2", "s1", "2026-10-10T08:00:00Z", [["TIME"], ["TIME", "PROCESS"]]), exam("e1", "s1", "2026-10-01T08:00:00Z", [["TIME"]], "Önceki adım"), exam("x", "s2", "2026-10-05T08:00:00Z", [])],
  } as unknown as AdminMockExams;
  const view = toMobileMockExams(data, "s1");
  const parsed = parseMockExamsAdmin(JSON.parse(JSON.stringify(view)));
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  assert.deepEqual(view.exams.map((item) => item.id), ["e2", "e1"]);
  assert.equal(view.exams[0].net, 47, "TYT cezası 4: (30 - 8/4) + (20 - 4/4)");
  assert.deepEqual(view.trend.heatmap.find((row) => row.key === "TYT:TR")?.counts, [0, 0, 0, 2, 0]);
  assert.deepEqual(view.trend.recurring && { category: view.trend.recurring.category, count: view.trend.recurring.count }, { category: "TIME", count: 3 });
  assert.deepEqual(view.approval, { examId: "e2", action: view.trend.recurring!.action });
  assert.equal(view.exams[0].revision, mockExamRevision({ nextAction: null, sections: data.exams[0].sections }));
  assert.equal(toMobileMockExams(data, "yok").studentId, "s1", "bilinmeyen öğrenci ilk öğrenciye düşer");
  assert.equal(toMobileMockExams(data, "s2").approval, null);
});

test("dış deneme revizyonu: bölüm sırasından bağımsız, neden veya adım değişince değişir", () => {
  const base = { nextAction: null, sections: [{ id: "b", errors: [{ category: "TIME" as const }, { category: "PROCESS" as const }] }, { id: "a", errors: [] }] };
  assert.equal(mockExamRevision(base), mockExamRevision({ ...base, sections: [...base.sections].reverse().map((section) => ({ ...section, errors: [...section.errors].reverse() })) }));
  assert.notEqual(mockExamRevision(base), mockExamRevision({ ...base, nextAction: "Adım" }));
  assert.notEqual(mockExamRevision(base), mockExamRevision({ ...base, sections: [{ id: "b", errors: [{ category: "TIME" }] }, { id: "a", errors: [] }] }));
});

test("toplu yapıştırma: web formuyla aynı kurallar", () => {
  assert.deepEqual(parseMockExamPaste("30 8 2\n20;4;16;35", [40, 40]), { ok: true, rows: [{ correctCount: 30, incorrectCount: 8, blankCount: 2, durationMinutes: 0 }, { correctCount: 20, incorrectCount: 4, blankCount: 16, durationMinutes: 35 }] });
  assert.equal((parseMockExamPaste("30 8 2", [40, 40]) as { reason: string }).reason, "ROW_COUNT");
  assert.equal((parseMockExamPaste("30 8\n1 1 38", [40, 40]) as { reason: string }).reason, "FORMAT");
  assert.equal((parseMockExamPaste("30 8 -2\n1 1 38", [40, 40]) as { reason: string }).reason, "FORMAT");
  assert.equal((parseMockExamPaste("30 8 1\n1 1 38", [40, 40]) as { reason: string }).reason, "TOTAL_MISMATCH");
});
