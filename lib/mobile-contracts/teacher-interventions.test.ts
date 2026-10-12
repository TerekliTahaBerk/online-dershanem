import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTeacherInterventions } from './teacher-interventions';
const inbox = { contractVersion: 1, revision: 'a'.repeat(64), rows: [], students: [], vocabulary: { reasons: [], statuses: [], outcomes: [], falsePositiveReasons: [], activities: [], manualReasons: [], snoozeDays: [1, 3, 7] } };
test('teacher inbox requires a revision and validates the shared case vocabulary', () => {
  assert.equal(parseTeacherInterventions(inbox).ok, true);
  assert.equal(parseTeacherInterventions({ ...inbox, revision: undefined }).ok, false);
  assert.equal(parseTeacherInterventions({ ...inbox, students: [{ id: 's', name: 42 }] }).ok, false);
  assert.equal(parseTeacherInterventions({ ...inbox, rows: [{ id: 'case' }] }).ok, false);
});
