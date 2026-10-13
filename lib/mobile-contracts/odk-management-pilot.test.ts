import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOdkManagementPilot, parseOdkPilotWrite } from './odk-management-pilot';
test('pilot projection rejects unknown roles and strips request keys', () => {
  const run = { id: 'r', name: 'Pilot', status: 'DRAFT', version: 1, revision: 'b'.repeat(64), memberCount: 5, coverage: { ADMIN: 1, TEACHER: 1, STUDENT: 2, PARENT: 1 }, createdAt: '2026-10-13T10:00:00Z', startedAt: null, stoppedAt: null, stopReason: null, requestKey: 'private-key' };
  const base = { contractVersion: 1, currentAdminId: 'a', revision: 'a'.repeat(64), readiness: { canActivate: false, canExpand: false, checks: [] }, candidates: [{ id: 'a', label: 'Admin', role: 'ADMIN' }], runs: [run] };
  const result = parseOdkManagementPilot(base); assert.equal(result.ok, true); if (result.ok) assert.equal('requestKey' in result.value.runs[0], false);
  assert.equal(parseOdkManagementPilot({ ...base, candidates: [{ id: 'a', label: 'Admin', role: 'OWNER' }] }).ok, false);
  assert.equal(parseOdkManagementPilot({ ...base, runs: [{ ...run, version: 0 }] }).ok, false);
});
test('pilot receipt requires a stable identifier and explicit replay flag', () => {
  assert.equal(parseOdkPilotWrite({ ok: true, id: 'r', replayed: false }).ok, true);
  assert.equal(parseOdkPilotWrite({ ok: true, id: 'r' }).ok, false);
});
