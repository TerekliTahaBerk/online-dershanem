import assert from "node:assert/strict";
import { test } from "node:test";
import { CoachAssignmentConflict, coachAssignmentRevision, readCoachReceipt } from "./coach-assignment-core";
test('atama sürümü boş durum ve devirde değişir; nesne alan sırasından etkilenmez', () => {
  const original = { id: 'a', coachId: 'c', cadenceDays: 7 };
  assert.equal(coachAssignmentRevision(original), coachAssignmentRevision({ cadenceDays: 7, coachId: 'c', id: 'a' }));
  for (const changed of [null, { ...original, id: 'b' }, { ...original, coachId: 'd' }, { ...original, cadenceDays: null }]) assert.notEqual(coachAssignmentRevision(original), coachAssignmentRevision(changed));
});
test('makbuz farklı içerik veya bozuk kayıtta fail closed davranır', () => {
  assert.deepEqual(readCoachReceipt({ operationDigest: 'digest' }, 'digest'), { ok: true, replayed: true });
  for (const value of [null, {}, { operationDigest: 'different' }]) assert.throws(() => readCoachReceipt(value, 'digest'), (error) => error instanceof CoachAssignmentConflict && error.code === 'IDEMPOTENCY_REUSE');
  assert.equal(new CoachAssignmentConflict().code, 'COACH_ASSIGNMENT_CONFLICT');
});
