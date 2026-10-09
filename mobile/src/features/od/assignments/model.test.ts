import { makeAssignment } from '@/test/od-fixtures';

import { allowedProgress, canSubmitEvidence, evidenceLengthError, groupAssignments, keyForWrite, statusPresentation, tabFor } from './model';

const now = new Date('2026-10-08T09:00:00.000Z');
const submission = (status: 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED', attemptNumber = 1) => ({ id: `s-${attemptNumber}`, attemptNumber, status, textEvidence: 'x'.repeat(30), feedback: null, scores: [], submittedAt: null, reviewedAt: null });

describe('Çalışmalar sunum modeli', () => {
  it('kanıtsız ödev: tamamlanınca Teslim edilen, değilse Bekleyen', () => {
    expect(tabFor(makeAssignment({ status: 'TODO' }), true)).toBe('pending');
    expect(tabFor(makeAssignment({ status: 'IN_PROGRESS' }), true)).toBe('pending');
    expect(tabFor(makeAssignment({ status: 'DONE' }), true)).toBe('submitted');
  });

  it('kanıtlı ödev: teslim yok / düzeltme → Bekleyen; değerlendirmede → Teslim edilen; onay → Değerlendirilen', () => {
    const base = makeAssignment({ evidenceRequired: true });
    expect(tabFor(base, true)).toBe('pending');
    expect(tabFor({ ...base, submissions: [submission('CHANGES_REQUESTED')] }, true)).toBe('pending');
    expect(tabFor({ ...base, submissions: [submission('SUBMITTED')] }, true)).toBe('submitted');
    expect(tabFor({ ...base, submissions: [submission('APPROVED')] }, true)).toBe('reviewed');
  });

  it('kanıt özelliği kapalıyken kanıtlı ödev normal ilerleme akışındadır', () => {
    const base = makeAssignment({ evidenceRequired: true, status: 'DONE' });
    expect(tabFor(base, false)).toBe('submitted');
    expect(canSubmitEvidence(base, false)).toBe(false);
    expect(allowedProgress(base, false)).toEqual(['TODO', 'IN_PROGRESS', 'DONE']);
  });

  it('gruplama her ödevi tam bir sekmeye koyar', () => {
    const groups = groupAssignments([makeAssignment({ id: 'a' }), makeAssignment({ id: 'b', status: 'DONE' })], false);
    expect(groups.pending.map((item) => item.id)).toEqual(['a']);
    expect(groups.submitted.map((item) => item.id)).toEqual(['b']);
    expect(groups.reviewed).toEqual([]);
  });

  it('durum rozeti: süresi geçti / tamamlandı / kanıt durumları', () => {
    expect(statusPresentation(makeAssignment({ dueAt: '2026-10-01T00:00:00.000Z' }), false, now)).toEqual({ label: 'Süresi geçti', tone: 'critical' });
    expect(statusPresentation(makeAssignment({ status: 'DONE', dueAt: '2026-10-01T00:00:00.000Z' }), false, now)).toEqual({ label: 'Tamamlandı', tone: 'success' });
    expect(statusPresentation(makeAssignment({ status: 'IN_PROGRESS' }), false, now).label).toBe('Çalışıyorum');
    const evidence = makeAssignment({ evidenceRequired: true, submissions: [submission('SUBMITTED')] });
    expect(statusPresentation(evidence, true, now)).toEqual({ label: 'Kanıt öğretmeninde', tone: 'info' });
    expect(statusPresentation({ ...evidence, submissions: [submission('APPROVED')] }, true, now).tone).toBe('success');
    expect(statusPresentation({ ...evidence, submissions: [submission('CHANGES_REQUESTED')] }, true, now).tone).toBe('warning');
  });

  it('kanıtlı ödevde DONE seçilemez; değerlendirmede / onaylıyken ilerleme kilitli (sunucu kuralının aynası)', () => {
    const base = makeAssignment({ evidenceRequired: true });
    expect(allowedProgress(base, true)).toEqual(['TODO', 'IN_PROGRESS']);
    expect(allowedProgress({ ...base, submissions: [submission('SUBMITTED')] }, true)).toEqual([]);
    expect(allowedProgress({ ...base, submissions: [submission('APPROVED')] }, true)).toEqual([]);
    expect(allowedProgress({ ...base, submissions: [submission('CHANGES_REQUESTED')] }, true)).toEqual(['TODO', 'IN_PROGRESS']);
    expect(canSubmitEvidence({ ...base, submissions: [submission('SUBMITTED')] }, true)).toBe(false);
  });

  it('kanıt metni sınırları sunucu ile aynı (20–2000, boşluk hariç)', () => {
    expect(evidenceLengthError('   kısa   ')).toMatch(/en az 20/);
    expect(evidenceLengthError('x'.repeat(20))).toBeNull();
    expect(evidenceLengthError('x'.repeat(2001))).toMatch(/en fazla 2000/);
  });

  it('aynı mantıksal yazma aynı anahtarı, farklı girdi yeni anahtarı kullanır', () => {
    let counter = 0;
    const generate = () => `key-${++counter}`;
    const same = (a: { s: string }, b: { s: string }) => a.s === b.s;
    const first = keyForWrite(null, { s: 'DONE' }, same, generate);
    expect(first.key).toBe('key-1');
    expect(keyForWrite(first.pending, { s: 'DONE' }, same, generate).key).toBe('key-1');
    expect(keyForWrite(first.pending, { s: 'TODO' }, same, generate).key).toBe('key-2');
  });
});
