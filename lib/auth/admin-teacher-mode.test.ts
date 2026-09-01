import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseAdminTeacherMode,
  decodeAdminTeacherModeCookie,
  encodeAdminTeacherModeCookie,
  panelShellRoleForContext,
  toAdminTeacherModeSession,
} from "./admin-teacher-mode-core";

const originalSecret = process.env.NEXTAUTH_SECRET;

test.before(() => {
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-admin-teacher-mode-secret";
});

test.after(() => {
  if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalSecret;
});

test("only ADMIN can enter teacher workspace mode", () => {
  assert.equal(canUseAdminTeacherMode({ role: "ADMIN" }), true);
  assert.equal(canUseAdminTeacherMode({ role: "TEACHER" }), false);
  assert.equal(canUseAdminTeacherMode({ role: "STUDENT" }), false);
  assert.equal(canUseAdminTeacherMode({ role: "PARENT" }), false);
});

test("teacher mode cookie round-trips and rejects tampering", () => {
  const payload = {
    v: 1 as const,
    adminUserId: "admin_1",
    startedAt: new Date().toISOString(),
    exp: Date.now() + 60_000,
  };
  const encoded = encodeAdminTeacherModeCookie(payload);
  assert.deepEqual(decodeAdminTeacherModeCookie(encoded), payload);
  assert.equal(decodeAdminTeacherModeCookie(`${encoded}x`), null);
});

test("expired teacher mode cookie is rejected", () => {
  const encoded = encodeAdminTeacherModeCookie({
    v: 1,
    adminUserId: "admin_1",
    startedAt: new Date().toISOString(),
    exp: Date.now() - 10,
  });
  assert.equal(decodeAdminTeacherModeCookie(encoded), null);
});

test("panel shell role follows teacher workspace when enabled", () => {
  assert.equal(panelShellRoleForContext("ADMIN", true), "TEACHER");
  assert.equal(panelShellRoleForContext("ADMIN", false), "ADMIN");
  assert.equal(panelShellRoleForContext("TEACHER", true), "TEACHER");
  assert.equal(panelShellRoleForContext("STUDENT", true), "STUDENT");
});

test("effective teacher mode keeps same userId and flips role only", () => {
  const actor = {
    sessionId: "sess_1",
    userId: "admin_1",
    email: "admin@example.com",
    role: "ADMIN" as const,
    status: "ACTIVE" as const,
    fullName: "Admin",
    mustChangePassword: false,
    mfaVerifiedAt: new Date(),
    stepUpAt: new Date(),
  };
  const effective = toAdminTeacherModeSession(actor);
  assert.equal(effective.userId, "admin_1");
  assert.equal(effective.sessionId, "sess_1");
  assert.equal(effective.role, "TEACHER");
  assert.equal(effective.email, actor.email);
});
