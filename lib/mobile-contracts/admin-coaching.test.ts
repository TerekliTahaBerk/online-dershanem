import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAdminCoaching, parseAdminCoachingSession } from './admin-coaching';
const session = { id: 'ss', studentId: 's', studentName: 'Öğrenci', coachName: 'Koç', scheduledAt: '2026-10-12T09:00:00Z', completedAt: null, status: 'PLANNED', focus: null };
test('koçluk sözleşmesi bilinmeyen sürüm, eksik sürüm ve hatalı kuyruğu reddeder', () => {
  const student = { id: 's', name: 'Öğrenci', coachId: null, coachName: null, revision: 'a'.repeat(64), cadenceDays: null, lastCompletedAt: null, nextAt: null, overdue: false };
  const data = { contractVersion: 1, students: [student], coaches: [], queues: [], sessions: [session] };
  assert.equal(parseAdminCoaching(data).ok, true);
  for (const input of [{ ...data, contractVersion: 2 }, { ...data, students: [{ ...student, revision: undefined }] }, { ...data, queues: [{ id: 'unknown', label: '', count: 0, rows: [] }] }]) assert.equal(parseAdminCoaching(input).ok, false);
});
test('görüşme detayı geçersiz durum/tarihi reddeder ve özel not alanını taşımaz', () => {
  const data = { contractVersion: 1, session, sharedNote: 'Paylaşılan', meetingUrl: null, proposedAt: null, rescheduleRequestedAt: null, rescheduleReason: null, privateNote: 'Gizli' };
  const result = parseAdminCoachingSession(data); assert.ok(result.ok); assert.equal('privateNote' in result.value, false);
  assert.equal(parseAdminCoachingSession({ ...data, session: { ...session, status: 'DELETED' } }).ok, false);
  assert.equal(parseAdminCoachingSession({ ...data, proposedAt: 'dün' }).ok, false);
});
