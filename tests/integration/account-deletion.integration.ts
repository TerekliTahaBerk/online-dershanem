import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { DELETION_REQUEST_ACTION, loadDeletionRequestStatus, requestAccountDeletion } from "@/lib/account/deletion-request";
import { CommandError } from "@/lib/panel/command-receipt";
import { integration } from "./integration-utils";

/**
 * P5.3 — Uygulama içi hesap silme talebi: yanlış parola reddedilir; ilk talep
 * tek audit + yönetici bildirimi; aynı veya yeni anahtarla tekrar ikinci talep
 * açmaz; açık DSR tombstone'u varsa 409. Hesap durumu değişmez.
 */
const code = (expected: string) => (error: unknown) => error instanceof CommandError && error.code === expected;

integration("P5.3 hesap silme talebi: parola, tek açık talep, bildirim ve DSR çakışması", async () => {
  const run = randomUUID().slice(0, 8);
  const passwordHash = await hashPassword("dogru-parola-123");
  const user = await db.user.create({ data: { email: `p53-${run}@example.com`, role: "PARENT", status: "ACTIVE", passwordHash, fullName: "P53 Veli" } });
  const admin = await db.user.create({ data: { email: `p53-admin-${run}@example.com`, role: "ADMIN", status: "ACTIVE", passwordHash: "unused" } });
  const actor = { userId: user.id, email: user.email, fullName: user.fullName, role: "PARENT" };
  try {
    await assert.rejects(requestAccountDeletion(actor, { password: "yanlis", idempotencyKey: randomUUID() }), code("INVALID_PASSWORD"));
    assert.equal((await loadDeletionRequestStatus(user.id)).requestedAt, null);

    const key = randomUUID();
    const first = await requestAccountDeletion(actor, { password: "dogru-parola-123", idempotencyKey: key });
    assert.equal(first.result.alreadyRequested, false);
    assert.equal((await requestAccountDeletion(actor, { password: "dogru-parola-123", idempotencyKey: key })).replayed, true);
    const again = await requestAccountDeletion(actor, { password: "dogru-parola-123", idempotencyKey: randomUUID() });
    assert.equal(again.result.alreadyRequested, true);
    assert.equal(again.result.requestedAt, first.result.requestedAt);
    assert.equal(await db.auditLog.count({ where: { actorUserId: user.id, action: DELETION_REQUEST_ACTION } }), 1);
    assert.equal(await db.notification.count({ where: { userId: admin.id, href: `/panel/yonetim/kullanicilar/${user.id}` } }), 1);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).status, "ACTIVE");
    assert.equal((await loadDeletionRequestStatus(user.id)).requestedAt, first.result.requestedAt);

    await db.dataSubjectTombstone.create({ data: { subjectUserId: user.id, action: "ANONYMIZE", ticketRef: `IT-${run}`, approvedByUserId: admin.id, previousStatus: "ACTIVE", graceUntil: new Date(Date.now() + 86_400_000) } });
    assert.equal((await loadDeletionRequestStatus(user.id)).processing, "PENDING_GRACE");
    await assert.rejects(requestAccountDeletion(actor, { password: "dogru-parola-123", idempotencyKey: randomUUID() }), code("ALREADY_PROCESSING"));
  } finally {
    await db.dataSubjectTombstone.deleteMany({ where: { subjectUserId: user.id } });
    await db.notification.deleteMany({ where: { userId: { in: [user.id, admin.id] } } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: [user.id, admin.id] } } });
    await db.user.deleteMany({ where: { id: { in: [user.id, admin.id] } } });
  }
});
