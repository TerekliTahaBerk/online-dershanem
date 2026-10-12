import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTeacherDigests, parseTeacherDigestWrite } from './teacher-digests';
const row = { studentId: 's1', name: 'Ece', revision: 'a'.repeat(64), digest: { id: 'd1', status: 'DRAFT', version: 1, goodThingOne: 'a', goodThingTwo: 'b', supportArea: 'c', homeQuestion: 'd', dataThrough: '2026-10-12T10:00:00Z' } };
test('teacher digests require complete versioned previews and discard server-only data', () => {
  const parsed = parseTeacherDigests({ contractVersion: 1, rows: [{ ...row, privateNote: 'hidden' }] });
  assert.equal(parsed.ok, true); assert.equal(JSON.stringify(parsed).includes('hidden'), false);
  assert.equal(parseTeacherDigests({ contractVersion: 1, rows: [{ ...row, digest: null }] }).ok, true);
  assert.equal(parseTeacherDigests({ contractVersion: 1, rows: [{ ...row, revision: undefined }] }).ok, false);
  assert.equal(parseTeacherDigests({ contractVersion: 1, rows: [{ ...row, digest: { ...row.digest, version: 0 } }] }).ok, false);
});

test('write receipts reject missing acknowledgements and malformed replay markers', () => {
  assert.equal(parseTeacherDigestWrite({ published: true, replayed: false }, 'publish').ok, true);
  assert.equal(parseTeacherDigestWrite({ id: 'd1', generated: true, replayed: true }, 'generate').ok, true);
  assert.equal(parseTeacherDigestWrite({ published: false, replayed: false }, 'publish').ok, false);
  assert.equal(parseTeacherDigestWrite({ id: 'd1', generated: true }, 'generate').ok, false);
});
