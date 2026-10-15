import assert from "node:assert/strict";
import test from "node:test";
import { questionsRevision, type QuestionRevisionState } from "./question-revision";

const q = (patch: Partial<QuestionRevisionState> = {}): QuestionRevisionState => ({ id: "q1", correctOption: "A", difficulty: "MEDIUM", bookletPage: 3, contentType: "BOOKLET_PDF", contentText: null, assetUrl: null, outcomes: [{ outcomeId: "o1", isPrimary: true }], ...patch });

test("soru revizyonu sıra bağımsız, her düzenlenebilir alana duyarlıdır", () => {
  const base = questionsRevision([q(), q({ id: "q2" })]);
  assert.equal(base, questionsRevision([q({ id: "q2" }), q()]));
  for (const patch of [{ correctOption: "B" }, { difficulty: "HARD" }, { bookletPage: 4 }, { contentText: "metin" }, { assetUrl: "https://x" }, { outcomes: [{ outcomeId: "o1", isPrimary: false }] }, { outcomes: [{ outcomeId: "o1", isPrimary: true }, { outcomeId: "o2", isPrimary: false }] }]) {
    assert.notEqual(base, questionsRevision([q(patch), q({ id: "q2" })]), JSON.stringify(patch));
  }
  assert.equal(questionsRevision([q({ outcomes: [{ outcomeId: "o2", isPrimary: false }, { outcomeId: "o1", isPrimary: true }] })]), questionsRevision([q({ outcomes: [{ outcomeId: "o1", isPrimary: true }, { outcomeId: "o2", isPrimary: false }] })]));
});
