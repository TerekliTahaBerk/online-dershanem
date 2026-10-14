import assert from "node:assert/strict";
import test from "node:test";
import { ANSWER_KEY_REVISION_STATUSES, CANCELLED_QUESTION_POLICY, diffAnswerKey, planAnswerKeyRevision } from "./answer-key-revision";

const questions = [
  { id: "q1", sectionCode: "MAT", questionNumber: 1, correctOption: "A" as const, isActive: true },
  { id: "q2", sectionCode: "MAT", questionNumber: 2, correctOption: "B" as const, isActive: true },
  { id: "q3", sectionCode: "MAT", questionNumber: 3, correctOption: "C" as const, isActive: false },
];

test("diffAnswerKey değişen, çıkan ve geri gelen soruları ayırır", () => {
  const diff = diffAnswerKey(
    [{ questionId: "q1", correctOption: "A" }, { questionId: "q2", correctOption: "B" }, { questionId: "q3", correctOption: "C" }],
    [{ questionId: "q1", correctOption: "D" }, { questionId: "q2", correctOption: "B" }, { questionId: "q4", correctOption: "E" }],
  );
  assert.deepEqual(diff, { changed: ["q1"], removed: ["q3"], added: ["q4"] });
});

test("diffAnswerKey aynı anahtarda boş fark döner", () => {
  const key = [{ questionId: "q1", correctOption: "A" as const }];
  assert.deepEqual(diffAnswerKey(key, key), { changed: [], removed: [], added: [] });
});

test("revizyon planı önceki/yeni cevabı ve iptali kaydeder", () => {
  const plan = planAnswerKeyRevision({
    examStatus: "RELEASED",
    questions,
    changes: [
      { questionId: "q1", action: "SET_ANSWER", correctOption: "D" },
      { questionId: "q2", action: "CANCEL" },
    ],
  });
  assert.ok(plan.ok, JSON.stringify(plan));
  assert.deepEqual(plan.previousAnswers, { q1: "A", q2: "B" });
  assert.deepEqual(plan.nextAnswers, { q1: "D", q2: "CANCELLED" });
  assert.deepEqual([...plan.override.entries()], [["q1", { correctOption: "D" }], ["q2", { cancelled: true }]]);
  assert.equal(plan.cancelledQuestionPolicy, CANCELLED_QUESTION_POLICY);
});

test("revizyon yalnız canlı ve sonrası durumlarda açılır; taslakta doğrudan düzenleme kullanılır", () => {
  assert.deepEqual([...ANSWER_KEY_REVISION_STATUSES], ["LIVE", "ENDED", "SCORED", "RELEASED"]);
  for (const examStatus of ["DRAFT", "READY", "SCHEDULED", "ARCHIVED"] as const) {
    const plan = planAnswerKeyRevision({ examStatus, questions, changes: [{ questionId: "q1", action: "SET_ANSWER", correctOption: "D" }] });
    assert.equal(plan.ok, false);
    assert.equal(!plan.ok && plan.issues[0].code, "REVISION_NOT_ALLOWED");
  }
});

test("geçersiz değişiklikler satır bazlı hata verir", () => {
  const plan = planAnswerKeyRevision({
    examStatus: "SCORED",
    questions,
    changes: [
      { questionId: "q1", action: "SET_ANSWER", correctOption: "A" },
      { questionId: "q2", action: "CANCEL" },
      { questionId: "q2", action: "SET_ANSWER", correctOption: "C" },
      { questionId: "q3", action: "CANCEL" },
      { questionId: "baska-sinav", action: "CANCEL" },
    ],
  });
  assert.equal(plan.ok, false);
  assert.deepEqual(!plan.ok && plan.issues.map((issue) => [issue.code, issue.questionId]), [
    ["ANSWER_UNCHANGED", "q1"],
    ["DUPLICATE_CHANGE", "q2"],
    ["QUESTION_ALREADY_CANCELLED", "q3"],
    ["UNKNOWN_QUESTION", "baska-sinav"],
  ]);
});

test("boş değişiklik ve tüm soruları iptal etmek reddedilir", () => {
  assert.equal(planAnswerKeyRevision({ examStatus: "ENDED", questions, changes: [] }).ok, false);
  const all = planAnswerKeyRevision({ examStatus: "ENDED", questions, changes: [{ questionId: "q1", action: "CANCEL" }, { questionId: "q2", action: "CANCEL" }] });
  assert.equal(!all.ok && all.issues.some((issue) => issue.code === "ALL_QUESTIONS_CANCELLED"), true);
});
