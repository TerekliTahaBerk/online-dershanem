import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTeacherRecovery } from './teacher-recovery';

const row = { attendanceId: 'a1', revision: 'a'.repeat(64), studentName: 'Ece', lessonTitle: 'Kesirler', lessonDate: '2026-10-11T10:00:00Z', status: 'ABSENT', package: { id: 'p1', status: 'DRAFT', version: 1, summaryTopic: 'Kesirler', summaryNextStep: 'Tekrar et.', checkpointPrompt: 'Neyi öğrendin?', dueAt: '2026-10-14T10:00:00Z', items: [{ id: 'i1', kind: 'MATERIAL', title: 'Ortak föy' }] } };
test('telafi sözleşmesi özel ders notunu taşımaz; yanlış sürüm, tarih ve durumları reddeder', () => {
  const parsed = parseTeacherRecovery({ contractVersion: 1, rows: [{ ...row, privateNote: 'Gizli' }] });
  assert.ok(parsed.ok); assert.equal('privateNote' in parsed.value.rows[0], false);
  assert.equal(parseTeacherRecovery({ contractVersion: 2, rows: [row] }).ok, false);
  for (const invalid of [{ ...row, revision: undefined }, { ...row, status: 'PRESENT' }, { ...row, lessonDate: 'dün' }, { ...row, package: { ...row.package, status: 'DELETED' } }, { ...row, package: { ...row.package, items: [{ id: 'i1', title: 'Özel', kind: 'PRIVATE_NOTE' }] } }]) {
    assert.equal(parseTeacherRecovery({ contractVersion: 1, rows: [invalid] }).ok, false);
  }
  assert.ok(parseTeacherRecovery({ contractVersion: 1, rows: [{ ...row, package: null }] }).ok);
});
