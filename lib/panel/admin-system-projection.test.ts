import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicCohortGain } from './admin-system-projection';
import { calculateCohortGains } from '@/lib/cohort-quality';
import { parseAdminQuality, parseAdminAudit, parseAdminFeatures, parseAdminAnalytics } from '@/lib/mobile-contracts/admin-system';
const observations = Array.from({ length: 10 }, (_, i) => [0, 1].map((j) => ({ studentKey: `student-${i}`, exam: 'LGS' as const, takenAt: new Date(`2026-09-${j ? '20' : '01'}T09:00:00Z`), sections: [{ questionCount: 20, correctCount: 10 + j * 5, incorrectCount: 0 }] }))).flat();
test('suppressed cohorts expose only exam and status; never counts, coverage, freshness or direction', () => {
  const gains = calculateCohortGains(observations.slice(0, 18));
  const raw = gains[0]; assert.equal(raw.pairedStudents, 9); assert.ok(raw.dataThrough);
  assert.deepEqual(publicCohortGain(raw), { exam: 'LGS', status: 'INSUFFICIENT_SAMPLE' });
  const output = { contractVersion: 1, ruleVersion: 'v1', minStudents: 10, minGapDays: 14, sections: [], gains: gains.map(publicCohortGain), commonErrors: [] };
  assert.equal(parseAdminQuality(output).ok, true);
  const malicious = { ...output, gains: [{ ...publicCohortGain(raw), pairedStudents: 9, dataThrough: raw.dataThrough.toISOString() }] };
  const parsed = parseAdminQuality(malicious); assert.ok(parsed.ok); assert.deepEqual(parsed.value.gains[0], publicCohortGain(raw));
});
test('ready cohorts retain interpretable distribution and dates; empty cohorts remain suppressed', () => {
  const gains = calculateCohortGains(observations); const out = publicCohortGain(gains[0]); assert.equal(out.status, 'READY');
  if (out.status === 'READY') { assert.equal(out.pairedStudents, 10); assert.equal(out.medianChange, 25); assert.equal(out.coveragePercent, 100); assert.equal(out.dataThrough, '2026-09-20T09:00:00.000Z'); }
  assert.deepEqual(publicCohortGain(gains[1]), { exam: 'TYT', status: 'INSUFFICIENT_SAMPLE' });
  const base = { contractVersion: 1, ruleVersion: 'v1', minStudents: 10, minGapDays: 14, sections: [], gains: [out], commonErrors: [] };
  assert.equal(parseAdminQuality(base).ok, true);
  assert.equal(parseAdminQuality({ ...base, gains: [{ ...out, pairedStudents: 9 }] }).ok, false);
  assert.equal(parseAdminQuality({ ...base, commonErrors: [{ label: 'Dikkat', students: 9 }] }).ok, false);
  assert.equal(parseAdminQuality({ ...base, contractVersion: 2 }).ok, false);
});
test('audit strips payload and actor secrets, and checks timestamps', () => {
 const log = { id: 'a', action: 'user.update', summary: 'Güncellendi', entityType: 'User', actor: 'Admin', createdAt: '2026-10-12T09:00:00Z', payload: { secret: 'private' }, actorUserId: 'private' };
 const result = parseAdminAudit({ contractVersion: 1, logs: [log] }); assert.ok(result.ok); assert.equal('payload' in result.value.logs[0], false); assert.equal('actorUserId' in result.value.logs[0], false);
 assert.equal(parseAdminAudit({ contractVersion: 1, logs: [{ ...log, createdAt: 'dün' }] }).ok, false);
 assert.equal(parseAdminFeatures({ contractVersion: 1, features: [], logs: [] }).ok, true);
 assert.equal(parseAdminAnalytics({ contractVersion: 1 }).ok, false);
});
