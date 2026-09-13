import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPanelActorContext,
  canUseAdminPanelPreview,
  decodeAdminPreviewCookie,
  encodeAdminPreviewCookie,
  sanitizePreviewReturnPath,
  toEffectivePreviewSession,
  type PreviewSessionIdentity,
} from "./admin-preview-core";
import type { PreviewSubject } from "@/lib/panel/preview-context";

const originalSecret = process.env.NEXTAUTH_SECRET;

test.before(() => {
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-admin-preview-secret";
});

test.after(() => {
  if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalSecret;
});

function adminSession(overrides: Partial<PreviewSessionIdentity> = {}): PreviewSessionIdentity {
  return {
    sessionId: "sess_admin",
    userId: "admin_1",
    email: "admin@example.com",
    role: "ADMIN",
    status: "ACTIVE",
    fullName: "Admin User",
    mustChangePassword: false,
    mfaVerifiedAt: new Date(),
    stepUpAt: new Date(),
    ...overrides,
  };
}

test("only ADMIN can use panel preview permission helper", () => {
  assert.equal(canUseAdminPanelPreview({ role: "ADMIN" }), true);
  assert.equal(canUseAdminPanelPreview({ role: "TEACHER" }), false);
  assert.equal(canUseAdminPanelPreview({ role: "STUDENT" }), false);
  assert.equal(canUseAdminPanelPreview({ role: "PARENT" }), false);
});

test("signed preview cookie round-trips and rejects tampering", () => {
  const payload = {
    v: 1 as const,
    previewRole: "STUDENT" as const,
    previewUserId: "student_1",
    startedByAdminId: "admin_1",
    startedAt: new Date().toISOString(),
    returnPath: "/panel/yonetim",
    exp: Date.now() + 60_000,
  };
  const encoded = encodeAdminPreviewCookie(payload);
  const decoded = decodeAdminPreviewCookie(encoded);
  assert.deepEqual(decoded, payload);

  assert.equal(decodeAdminPreviewCookie(`${encoded}x`), null);
  assert.equal(decodeAdminPreviewCookie("not-a-cookie"), null);
});

test("expired preview cookie is rejected", () => {
  const encoded = encodeAdminPreviewCookie({
    v: 1,
    previewRole: "TEACHER",
    previewUserId: "teacher_1",
    startedByAdminId: "admin_1",
    startedAt: new Date().toISOString(),
    returnPath: null,
    exp: Date.now() - 1_000,
  });
  assert.equal(decodeAdminPreviewCookie(encoded), null);
});

test("effective preview session keeps admin sessionId but subject identity", () => {
  const actor = adminSession();
  const subject: PreviewSubject = {
    userId: "student_9",
    role: "STUDENT",
    email: "ogrenci@example.com",
    fullName: "Ayşe Yılmaz",
    status: "ARCHIVED",
    notices: ["ARCHIVED"],
  };
  const effective = toEffectivePreviewSession(actor, subject);
  assert.equal(effective.sessionId, actor.sessionId);
  assert.equal(effective.userId, "student_9");
  assert.equal(effective.role, "STUDENT");
  assert.equal(effective.email, "ogrenci@example.com");
  assert.equal(effective.mustChangePassword, false);
  assert.equal(effective.status, "ACTIVE");
  assert.equal(effective.mfaVerifiedAt, actor.mfaVerifiedAt);

  const actorContext = buildPanelActorContext(actor, {
    context: {
      enabled: true,
      previewRole: "STUDENT",
      previewUserId: "student_9",
      startedByAdminId: "admin_1",
      startedAt: new Date().toISOString(),
      returnPath: null,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    subject,
  });
  assert.equal(actorContext.actor.role, "ADMIN");
  assert.equal(actorContext.actor.userId, "admin_1");
  assert.equal(actorContext.preview?.role, "STUDENT");
  assert.equal(actorContext.preview?.userId, "student_9");
});

test("actor context without preview has no subject overlay", () => {
  const actor = adminSession();
  const context = buildPanelActorContext(actor, null);
  assert.equal(context.preview, undefined);
  assert.equal(context.actor.role, "ADMIN");
});

test("return path must stay inside /panel", () => {
  assert.equal(sanitizePreviewReturnPath("/panel/yonetim"), "/panel/yonetim");
  assert.equal(sanitizePreviewReturnPath("https://evil.test/panel"), null);
  assert.equal(sanitizePreviewReturnPath("//evil.test"), null);
  assert.equal(sanitizePreviewReturnPath("/giris"), null);
});
