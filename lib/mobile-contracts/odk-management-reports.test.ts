import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOdkManagementQueue, parseOdkManagementReports } from './odk-management-reports';
test('queue rejects negative operational counters and strips raw answer records', () => {
  const row = { id: 'e', title: 'Deneme', family: 'TYT', endsAt: null, submitted: 1, assigned: 1, scored: 0, unscored: 1, published: 0, review: 0, stage: 'PUANLANIYOR', stageLabel: 'Puanlama', actionLabel: 'Puanla', href: '/panel/odk/yonetim/sinavlar/e', answers: ['secret'] };
  const base = { contractVersion: 1, tab: 'kuyruk', tabs: [], rows: [row] };
  const result = parseOdkManagementQueue(base); assert.equal(result.ok, true); if (result.ok) assert.equal('answers' in result.value.rows[0], false);
  assert.equal(parseOdkManagementQueue({ ...base, rows: [{ ...row, unscored: -1 }] }).ok, false);
});
test('report list preserves nullable unpublished summary and requires explicit detail projection', () => {
  const base = { contractVersion: 1, query: '', group: '', groups: [], total: 1, rowLimit: 50, rows: [{ studentId: 's', name: 'Öğrenci', context: '8', latestTitle: null, latestNet: null, delta: null, weakOutcomes: 0, examCount: 0 }], report: null };
  assert.equal(parseOdkManagementReports(base).ok, true);
  assert.equal(parseOdkManagementReports({ ...base, report: { answers: ['secret'] } }).ok, false);
});
