import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionExam, validateSchedule, validateVersionReadiness, type VersionReadinessInput } from "./exam-domain";

function readyVersion(patch: Partial<VersionReadinessInput> = {}): VersionReadinessInput {
  return {
    family: "LGS",
    durationMinutes: 40,
    scoringPolicyCode: "LGS_MATH_V1",
    files: ["BOOKLET_PDF"],
    sections: [{ code: "MAT", questionCount: 20, questions: Array.from({ length: 20 }, (_, index) => ({ questionNumber: index + 1, correctOption: "A" as const, outcomes: [{ outcomeId: `outcome-${index + 1}`, isPrimary: true }] })) }],
    ...patch,
  };
}

test("eksiksiz LGS matematik sürümü kilitlenmeye hazırdır", () => {
  assert.deepEqual(validateVersionReadiness(readyVersion()), []);
});

test("PDF, cevap veya kazanım eksikliği yayın kapısını kapatır", () => {
  const input = readyVersion({ files: [] });
  input.sections[0].questions[1].correctOption = null;
  input.sections[0].questions[0].outcomes = [];
  input.sections[0].questions.pop();
  const codes = validateVersionReadiness(input).filter((issue) => issue.level === "error").map((issue) => issue.code);
  assert.ok(codes.includes("BOOKLET_MISSING"));
  assert.ok(codes.includes("OUTCOME_MISSING"));
  assert.ok(codes.includes("QUESTION_COUNT_MISMATCH"));
  assert.ok(codes.includes("ANSWER_MISSING"));
});

test("LGS ve YKS puanlama politikaları karıştırılamaz", () => {
  assert.ok(validateVersionReadiness(readyVersion({ scoringPolicyCode: "YKS_MATH_V1" })).some((issue) => issue.code === "SCORING_POLICY_MISMATCH"));
});

test("standart dışı matematik soru sayısı engel değil görünür uyarıdır", () => {
  const input = readyVersion();
  input.sections[0].questionCount = 19;
  input.sections[0].questions = input.sections[0].questions.slice(0, 19);
  const issue = validateVersionReadiness(input).find((item) => item.code === "NONSTANDARD_QUESTION_COUNT");
  assert.equal(issue?.level, "warning");
});

test("sonuç yalnız skorlandıktan sonra açıklanabilir", () => {
  assert.equal(canTransitionExam("ENDED", "RELEASED"), false);
  assert.equal(canTransitionExam("ENDED", "SCORED"), true);
  assert.equal(canTransitionExam("SCORED", "RELEASED"), true);
  assert.equal(canTransitionExam("RELEASED", "LIVE"), false);
});

test("Meet zorunlu plan geçerli zaman ve Google Meet bağlantısı ister", () => {
  const startsAt = new Date("2026-09-01T10:00:00Z");
  const endsAt = new Date("2026-09-01T11:00:00Z");
  assert.deepEqual(validateSchedule({ startsAt, endsAt, meetRequired: true, meetUrl: "https://meet.google.com/abc-defg-hij" }), []);
  assert.ok(validateSchedule({ startsAt: endsAt, endsAt: startsAt, meetRequired: true, meetUrl: "https://example.com/meet" }).length >= 2);
});
