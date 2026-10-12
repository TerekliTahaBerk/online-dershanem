import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCoachPreparation, parseCoachPreparationWrite } from './coach-preparation';
test('coach preparation requires revision and strips private fields', () => {
  const data = { contractVersion: 1, studentId: 's1', weekStart: '2026-10-12T00:00:00Z', revision: 'a'.repeat(64), plans: [], templates: [], subjects: [], nextSession: null, goals: [], summary: null, privateNote: 'secret' };
  const parsed = parseCoachPreparation(data); assert.equal(parsed.ok, true); if (parsed.ok) assert.equal('privateNote' in parsed.value, false);
  assert.equal(parseCoachPreparation({ ...data, revision: undefined }).ok, false);
});
test('coach write receipts reject malformed success', () => {
  assert.equal(parseCoachPreparationWrite({ ok: true, id: 'goal1', replayed: false }).ok, true);
  assert.equal(parseCoachPreparationWrite({ ok: true, replayed: false }).ok, false);
  assert.equal(parseCoachPreparationWrite({ ok: true, id: 'goal1' }).ok, false);
});
