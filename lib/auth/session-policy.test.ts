import assert from "node:assert/strict";
import test from "node:test";
import type { UserRole } from "@prisma/client";
import { SESSION_POLICIES, absoluteSessionExpiry, sessionExpiryReason } from "./session-policy";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const createdAt = new Date("2026-08-13T12:00:00.000Z");

test("all roles have explicit idle limits shorter than their absolute lifetime", () => {
  for (const role of ["STUDENT", "PARENT", "TEACHER", "ADMIN"] satisfies UserRole[]) {
    assert.ok(SESSION_POLICIES[role].idleTimeoutMs < SESSION_POLICIES[role].absoluteTtlMs);
  }
  assert.ok(SESSION_POLICIES.ADMIN.absoluteTtlMs < SESSION_POLICIES.TEACHER.absoluteTtlMs);
  assert.ok(SESSION_POLICIES.ADMIN.idleTimeoutMs < SESSION_POLICIES.TEACHER.idleTimeoutMs);
});

test("absolute and idle boundaries expire exactly at the server-side clock edge", () => {
  const expiresAt = new Date(createdAt.getTime() + 30 * DAY);
  const idleBoundary = new Date(createdAt.getTime() + SESSION_POLICIES.ADMIN.idleTimeoutMs);
  assert.equal(sessionExpiryReason({ role: "ADMIN", createdAt, expiresAt, lastSeenAt: createdAt }, new Date(idleBoundary.getTime() - 1)), null);
  assert.equal(sessionExpiryReason({ role: "ADMIN", createdAt, expiresAt, lastSeenAt: createdAt }, idleBoundary), "IDLE");

  const absoluteBoundary = new Date(createdAt.getTime() + SESSION_POLICIES.ADMIN.absoluteTtlMs);
  assert.equal(sessionExpiryReason({ role: "ADMIN", createdAt, expiresAt, lastSeenAt: new Date(absoluteBoundary.getTime() - 1) }, absoluteBoundary), "ABSOLUTE");
});

test("stored cookie/DB expiry can shorten but never extend role policy", () => {
  const early = new Date(createdAt.getTime() + HOUR);
  const late = new Date(createdAt.getTime() + 30 * DAY);
  assert.equal(absoluteSessionExpiry("ADMIN", createdAt, early).getTime(), early.getTime());
  assert.equal(absoluteSessionExpiry("ADMIN", createdAt, late).getTime(), createdAt.getTime() + SESSION_POLICIES.ADMIN.absoluteTtlMs);
});

test("concurrent sessions are evaluated independently from their own last-seen state", () => {
  const now = new Date(createdAt.getTime() + HOUR);
  const expiresAt = new Date(createdAt.getTime() + DAY);
  const active = { role: "ADMIN" as const, createdAt, expiresAt, lastSeenAt: new Date(now.getTime() - 5 * 60 * 1000) };
  const abandoned = { ...active, lastSeenAt: new Date(now.getTime() - SESSION_POLICIES.ADMIN.idleTimeoutMs) };
  assert.equal(sessionExpiryReason(active, now), null);
  assert.equal(sessionExpiryReason(abandoned, now), "IDLE");
});

test("MFA and step-up timestamps do not participate in or extend expiry", () => {
  const now = new Date(createdAt.getTime() + SESSION_POLICIES.ADMIN.absoluteTtlMs);
  const session = { role: "ADMIN" as const, createdAt, expiresAt: new Date(createdAt.getTime() + 30 * DAY), lastSeenAt: new Date(now.getTime() - 1) };
  assert.equal(sessionExpiryReason(session, now), "ABSOLUTE");
});
