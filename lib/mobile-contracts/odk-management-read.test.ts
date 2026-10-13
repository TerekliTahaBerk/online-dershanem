import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOdkManagementHome, parseOdkManagementPackages } from './odk-management-read';
test('management home requires bounded counts and drops raw answers', () => {
  const data = { contractVersion: 1, weekCount: 0, awaitingReleaseCount: 0, pilotBlocked: null, attention: [], upcoming: [], live: [], activity: [], modules: [], answerKey: 'secret' };
  const parsed = parseOdkManagementHome(data); assert.equal(parsed.ok, true); if (parsed.ok) assert.equal('answerKey' in parsed.value, false);
  assert.equal(parseOdkManagementHome({ ...data, weekCount: -1 }).ok, false);
});
test('packages keep nullable invalid policy explicit and discard private customer fields', () => {
  const row = { id: 'p1', title: 'Paket', slug: 'paket', priceCents: 100, isActive: true, contractVersion: 1, policy: null, orderCount: 0, entitlementCount: 0, exams: [], orders: [{ email: 'private' }] };
  const parsed = parseOdkManagementPackages({ contractVersion: 1, rows: [row] }); assert.equal(parsed.ok, true); if (parsed.ok) assert.equal('orders' in parsed.value.rows[0], false);
  assert.equal(parseOdkManagementPackages({ contractVersion: 1, rows: [{ ...row, priceCents: -1 }] }).ok, false);
});
