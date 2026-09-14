import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { ApprovalError, assertApprovalShape, resolveApproval } from "./approval";

test("onay parametreleri eksikse işlem reddedilir", () => {
  assert.throws(() => assertApprovalShape({}), (error: unknown) => error instanceof ApprovalError && /--approved-by, --ticket/.test(error.message));
  assert.throws(() => assertApprovalShape({ approvedBy: "admin@example.com" }), /--ticket/);
  assert.throws(() => assertApprovalShape({ ticket: "KVKK-12" }), /--approved-by/);
  assert.throws(() => assertApprovalShape({ approvedBy: "   ", ticket: "  " }), /eksik/);
});

test("onay biçimi doğrulanır ve e-posta küçük harfe indirilir", () => {
  assert.throws(() => assertApprovalShape({ approvedBy: "admin", ticket: "KVKK-12" }), /e-posta/);
  assert.throws(() => assertApprovalShape({ approvedBy: "admin@example.com", ticket: "Ayşe Yılmaz talebi" }), /ticket/);
  assert.deepEqual(assertApprovalShape({ approvedBy: " Admin@Example.com ", ticket: "KVKK-2026/0012" }), { approvedBy: "admin@example.com", ticket: "KVKK-2026/0012" });
});

function dbWith(user: { id: string; role: string; status: string } | null) {
  return { user: { findUnique: async () => user } } as unknown as PrismaClient;
}

test("onaylayan yalnız aktif ADMIN olabilir", async () => {
  const input = { approvedBy: "admin@example.com", ticket: "KVKK-12" };
  await assert.rejects(() => resolveApproval(dbWith(null), input), /ADMIN/);
  await assert.rejects(() => resolveApproval(dbWith({ id: "u1", role: "TEACHER", status: "ACTIVE" }), input), /ADMIN/);
  await assert.rejects(() => resolveApproval(dbWith({ id: "u1", role: "ADMIN", status: "SUSPENDED" }), input), /ADMIN/);
  assert.deepEqual(await resolveApproval(dbWith({ id: "u1", role: "ADMIN", status: "ACTIVE" }), input), { approverUserId: "u1", ticketRef: "KVKK-12" });
});
