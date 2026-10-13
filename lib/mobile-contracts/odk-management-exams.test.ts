import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOdkManagementExams, parseOdkExamCreated } from './odk-management-exams';
const base = { contractVersion: 1, canCreate: false, revision: 'a'.repeat(64), view: 'tumu', query: '', familyCode: null, status: null, total: 1, page: 1, pageSize: 50, views: [], families: [], series: [], templates: [], rows: [{ id: 'e1', title: 'Deneme', familyCode: 'TYT', status: 'DRAFT', view: 'hazirlik', seriesTitle: null, startsAt: null, endsAt: null, assigned: 0, attempts: 0, submitted: 0, blockingIssues: null, correctOption: 'A', meetUrl: 'private' }] };
test('exam list accepts nullable readiness and strips answer key/private URLs', () => {
  const result = parseOdkManagementExams(base); assert.equal(result.ok, true); if (result.ok) { assert.equal('correctOption' in result.value.rows[0], false); assert.equal('meetUrl' in result.value.rows[0], false); }
  assert.equal(parseOdkManagementExams({ ...base, page: 0 }).ok, false);
  assert.equal(parseOdkManagementExams({ ...base, rows: [{ ...base.rows[0], startsAt: 'yesterday' }] }).ok, false);
});
test('creation receipt requires success, identifier and explicit replay state', () => {
  assert.equal(parseOdkExamCreated({ ok: true, id: 'e1', replayed: true }).ok, true);
  assert.equal(parseOdkExamCreated({ ok: true, id: '', replayed: true }).ok, false);
  assert.equal(parseOdkExamCreated({ ok: true, id: 'e1' }).ok, false);
});
