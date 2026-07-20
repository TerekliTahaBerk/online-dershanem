import assert from "node:assert/strict";
import test from "node:test";
import { attemptHasExpired, decideAnswerRevision, decideAttemptStart } from "./attempt-domain";

const startsAt = new Date("2026-07-20T10:00:00.000Z");
const endsAt = new Date("2026-07-20T11:00:00.000Z");
const exam = { status: "SCHEDULED" as const, startsAt, endsAt, lateEntryMinutes: 10, durationMinutes: 60 };

test("başlama saatinden önce sınav oturumu açılamaz", () => {
  assert.deepEqual(decideAttemptStart(exam, new Date("2026-07-20T09:59:59.000Z")), { ok: false, code: "NOT_STARTED" });
});

test("geç başlayan öğrenciye sınavın genel bitişinden fazla süre verilmez", () => {
  const decision = decideAttemptStart(exam, new Date("2026-07-20T10:05:00.000Z"));
  assert.equal(decision.ok, true);
  if (decision.ok) assert.equal(decision.deadlineAt.toISOString(), endsAt.toISOString());
});

test("geç giriş penceresi kapandıktan sonra yeni oturum açılmaz", () => {
  assert.deepEqual(decideAttemptStart(exam, new Date("2026-07-20T10:10:00.001Z")), { ok: false, code: "ENTRY_CLOSED" });
});

test("sunucu son tarihi dolan oturumu süresi bitmiş sayar", () => {
  assert.equal(attemptHasExpired(endsAt, endsAt), true);
  assert.equal(attemptHasExpired(endsAt, new Date(endsAt.getTime() - 1)), false);
});

test("aynı revizyon ve aynı cevap güvenli tekrar kabul edilir", () => {
  assert.equal(decideAnswerRevision({ revision: 2, selectedOption: "B", isMarked: false }, { revision: 2, selectedOption: "B", isMarked: false }), "IDEMPOTENT");
});

test("atlanan veya eski cevap revizyonu çakışma sayılır", () => {
  assert.equal(decideAnswerRevision({ revision: 2, selectedOption: "B", isMarked: false }, { revision: 4, selectedOption: "C", isMarked: false }), "CONFLICT");
  assert.equal(decideAnswerRevision(null, { revision: 2, selectedOption: "A", isMarked: false }), "CONFLICT");
});
