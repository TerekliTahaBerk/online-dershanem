import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeAdminPreviewCookie } from './admin-preview-core';
import { encodeAdminTeacherModeCookie } from './admin-teacher-mode-core';
import { resolveAdminOverlayTransport } from './admin-overlay-core';

const original = process.env.NEXTAUTH_SECRET;
test.before(() => { process.env.NEXTAUTH_SECRET = 'overlay-test-secret'; });
test.after(() => { if (original === undefined) delete process.env.NEXTAUTH_SECRET; else process.env.NEXTAUTH_SECRET = original; });
const actor = { role: 'ADMIN', userId: 'admin', sessionId: 'session' };
const preview = (overrides = {}) => encodeAdminPreviewCookie({
  v: 1, sessionId: actor.sessionId, startedByAdminId: actor.userId,
  previewRole: 'STUDENT', previewUserId: 'student', startedAt: new Date().toISOString(),
  returnPath: null, exp: Date.now() + 60_000, ...overrides,
});
const teacher = () => encodeAdminTeacherModeCookie({ v: 1, sessionId: actor.sessionId, adminUserId: actor.userId, startedAt: new Date().toISOString(), exp: Date.now() + 60_000 });
const headers = (values: Record<string, string> = {}) => new Headers({ authorization: 'Bearer opaque', ...values });

test('Bearer without overlay ignores web cookies; cookie clients retain web mode', () => {
  assert.equal(resolveAdminOverlayTransport(headers({ cookie: `od_panel_preview=${preview()}` }), actor).kind, 'none');
  assert.equal(resolveAdminOverlayTransport(new Headers(), actor).kind, 'web');
});
test('preview and teacher tokens bind to both administrator and session', () => {
  for (const [name, token, kind] of [['x-od-preview', preview(), 'preview'], ['x-od-teacher-mode', teacher(), 'teacher']]) {
    assert.equal(resolveAdminOverlayTransport(headers({ [name]: token }), actor).kind, kind);
    assert.equal(resolveAdminOverlayTransport(headers({ [name]: token }), { ...actor, sessionId: 'other' }).kind, 'invalid');
    assert.equal(resolveAdminOverlayTransport(headers({ [name]: token }), { ...actor, userId: 'other' }).kind, 'invalid');
    for (const role of ['STUDENT', 'TEACHER', 'PARENT']) assert.equal(resolveAdminOverlayTransport(headers({ [name]: token }), { ...actor, role }).kind, 'invalid');
  }
});
test('ambiguous, expired, forged, empty and cookie-only tokens fail closed', () => {
  for (const token of ['', 'bad.token', `${preview()}x`, preview({ exp: Date.now() - 1 }), preview({ sessionId: undefined })]) {
    assert.equal(resolveAdminOverlayTransport(headers({ 'x-od-preview': token }), actor).kind, 'invalid');
  }
  assert.equal(resolveAdminOverlayTransport(headers({ 'x-od-preview': preview(), 'x-od-teacher-mode': teacher() }), actor).kind, 'invalid');
  assert.equal(resolveAdminOverlayTransport(new Headers({ 'x-od-preview': preview() }), actor).kind, 'invalid');
  assert.equal(resolveAdminOverlayTransport(headers({ 'x-od-teacher-mode': preview() }), actor).kind, 'invalid');
});
