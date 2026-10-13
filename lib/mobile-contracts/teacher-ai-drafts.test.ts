import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTeacherAiDrafts, parseTeacherAiWrite } from './teacher-ai-drafts';
const content = { title: 'Çalışma', body: 'İki örnek çöz.', checkPrompt: 'Ana adım nedir?', successCriteria: ['Açıkla', 'Kontrol et'], citations: ['LESSON_TITLE'] };
const row = { id: 'd1', taskType: 'ASSIGNMENT', status: 'DRAFT', provider: 'FALLBACK', promptVersion: 'v1', modelName: null, fallbackReason: 'PROVIDER_DISABLED', version: 1, createdAt: '2026-10-13T10:00:00Z', lessonTitle: 'Kesirler', revision: 'r1', sourceRefs: [{ id: 'LESSON_TITLE', label: 'Ders başlığı' }], originalContent: content, reviewedContent: null };
test('AI drafts validate provider, source fields and versions; extra secrets are dropped', () => {
  const valid = { contractVersion: 1, lessons: [], drafts: [{ ...row, requestKey: 'private' }] };
  const parsed = parseTeacherAiDrafts(valid); assert.equal(parsed.ok, true); if (parsed.ok) assert.equal('requestKey' in parsed.value.drafts[0], false);
  assert.equal(parseTeacherAiDrafts({ ...valid, drafts: [{ ...row, provider: 'UNKNOWN' }] }).ok, false);
  assert.equal(parseTeacherAiDrafts({ ...valid, drafts: [{ ...row, revision: undefined }] }).ok, false);
  assert.equal(parseTeacherAiDrafts({ ...valid, drafts: [{ ...row, version: 0 }] }).ok, false);
});
test('AI mutation receipts require identifier and replay status', () => {
  assert.equal(parseTeacherAiWrite({ ok: true, id: 'd1', replayed: false }).ok, true);
  assert.equal(parseTeacherAiWrite({ ok: true, id: 'd1' }).ok, false);
  assert.equal(parseTeacherAiWrite({ ok: true, replayed: false }).ok, false);
});
