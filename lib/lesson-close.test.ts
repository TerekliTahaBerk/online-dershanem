import assert from "node:assert/strict";
import test from "node:test";
import { lessonCloseRequestHash } from "./lesson-close";

const base = { topic: "Konu", note: "Not", nextGoal: "Hedef", homework: "Çalışma", students: [{ studentId: "b", note: "", attendance: "PRESENT" }, { studentId: "a", note: "özel", attendance: "LATE" }], outcomes: [{ outcomeId: "o2", evidenceType: "TAUGHT" }, { outcomeId: "o1", evidenceType: "OBSERVED" }], outcomeSkipReason: null, assignmentDraft: { title: "Taslak", description: "Çalış", dueAt: "2026-07-26T12:00:00.000Z", studentIds: ["b", "a"] } };

test("kapanış hash'i öğrenci, kazanım ve alıcı sırasından etkilenmez", () => {
  const reordered = { ...base, students: [...base.students].reverse(), outcomes: [...base.outcomes].reverse(), assignmentDraft: { ...base.assignmentDraft, studentIds: [...base.assignmentDraft.studentIds].reverse() } };
  assert.equal(lessonCloseRequestHash(base), lessonCloseRequestHash(reordered));
});

test("kapanış içeriği değiştiğinde hash değişir", () => {
  assert.notEqual(lessonCloseRequestHash(base), lessonCloseRequestHash({ ...base, nextGoal: "Başka hedef" }));
});
