import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after } from "node:test";
import { getPackagePriceCents } from "@/lib/content";
import { prisma as db } from "@/lib/prisma";
import { getCustomerOdStart } from "@/lib/od/onboarding-customer-server";
import { queueOdAccountSetup, queueOdOnboardingUpdate } from "@/lib/od/onboarding-communication";
import { transitionOdOnboarding } from "@/lib/od/onboarding";
import { integration } from "./integration-utils";

after(() => db.$disconnect());

integration("başlangıç kartı ilişkiyi korur; parola/durum e-postaları atomik ve tekildir", async () => {
  const run = randomUUID();
  const student = await db.user.create({ data: { email: `od-start-student-${run}@example.com`, role: "STUDENT", passwordHash: "integration-unused", mustChangePassword: true, studentProfile: { create: {} } }, include: { studentProfile: true } });
  const foreign = await db.user.create({ data: { email: `od-start-foreign-${run}@example.com`, role: "STUDENT", passwordHash: "integration-unused", studentProfile: { create: {} } }, include: { studentProfile: true } });
  const parent = await db.user.create({ data: { email: `od-start-parent-${run}@example.com`, role: "PARENT", passwordHash: "integration-unused", mustChangePassword: true } });
  const owner = await db.user.create({ data: { email: `od-start-owner-${run}@example.com`, role: "ADMIN", passwordHash: "integration-unused" } });
  const link = await db.parentStudent.create({ data: { parentId: parent.id, studentId: student.studentProfile!.id } });
  const amount = getPackagePriceCents("LGS", "Matematik Ders Paketi");
  const order = await db.odOrder.create({ data: { userId: student.id, packageName: "Integration OD", category: "LGS", subject: "Matematik Ders Paketi", subtotalCents: amount, totalCents: amount, status: "PAID", onboarding: { create: { state: "PARENT_LINKED", ownerId: owner.id } } }, include: { onboarding: true } });
  try {
    assert.ok(await getCustomerOdStart({ userId: parent.id, role: "PARENT", studentId: student.studentProfile!.id }));
    assert.equal(await getCustomerOdStart({ userId: parent.id, role: "PARENT", studentId: foreign.studentProfile!.id }), null);
    assert.equal(await getCustomerOdStart({ userId: foreign.id, role: "STUDENT" }), null);
    for (const data of [{ active: false }, { active: true, endedAt: new Date() }, { endedAt: null, canViewAcademic: false }]) {
      await db.parentStudent.update({ where: { id: link.id }, data });
      assert.equal(await getCustomerOdStart({ userId: parent.id, role: "PARENT", studentId: student.studentProfile!.id }), null);
    }
    await db.parentStudent.update({ where: { id: link.id }, data: { active: true, endedAt: null, canViewAcademic: true } });
    await assert.rejects(db.$transaction(async (tx) => { await queueOdAccountSetup(tx, student.id); throw new Error("rollback"); }), /rollback/);
    assert.equal(await db.emailOutbox.count({ where: { id: `od-account-setup:${student.id}` } }), 0);
    assert.equal(await db.passwordResetToken.count({ where: { userId: student.id } }), 0);
    await db.$transaction(async (tx) => { await queueOdAccountSetup(tx, student.id); await queueOdAccountSetup(tx, student.id); await queueOdAccountSetup(tx, parent.id); });
    assert.equal(await db.passwordResetToken.count({ where: { userId: student.id } }), 1);
    await transitionOdOnboarding({ orderId: order.id, toState: "PLACEMENT_PENDING", actorUserId: owner.id, note: "PRIVATE_OPERATION_NOTE" });
    const transition = await db.odOnboardingTransition.findFirstOrThrow({ where: { onboardingId: order.onboarding!.id, toState: "PLACEMENT_PENDING" } });
    await db.$transaction((tx) => queueOdOnboardingUpdate(tx, { orderId: order.id, transitionId: transition.id, state: "PLACEMENT_PENDING" }));
    const messages = await db.emailOutbox.findMany({ where: { id: { startsWith: `od-start:${transition.id}:` } } });
    assert.equal(messages.length, 2);
    for (const message of messages) assert.doesNotMatch(message.html, /PRIVATE_OPERATION_NOTE|PLACEMENT_PENDING|SLA|onboarding/);
    assert.equal(await db.auditLog.count({ where: { entityId: order.onboarding!.id, action: "onboarding.transitioned" } }), 1);
  } finally {
    await db.emailOutbox.deleteMany({ where: { OR: [{ id: { in: [`od-account-setup:${student.id}`, `od-account-setup:${parent.id}`] } }, { recipients: { in: [JSON.stringify([student.email]), JSON.stringify([parent.email])] } }] } });
    await db.odOrder.delete({ where: { id: order.id } });
    await db.user.deleteMany({ where: { id: { in: [student.id, foreign.id, parent.id, owner.id] } } });
  }
});
