import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { createCoachingSession, mutateCoachingSession } from "@/lib/coaching-experience-server";
import { loadParentCoachingSessions } from "@/lib/panel/parent-coaching-server";
import { toMobileParentCoaching } from "@/lib/mobile/parent-views";
import { parseParentCoaching } from "@/lib/mobile-contracts/parent";
import { integration } from "./integration-utils";

/**
 * V07 — veli görüşme kapsamı: projeksiyon sürüm ve HTTPS bağlantı taşır;
 * REQUEST yalnız aktif, akademik izinli bağ + çocuğun aktif OK üyeliğiyle
 * çalışır. İzin kapalı, bağ sona ermiş veya OK üyeliği bitmiş çocukta 404.
 */
integration("V07 veli görüşme talebi kapsamı ve mobil projeksiyon", async () => {
  const run = randomUUID();
  const student = await db.user.create({ data: { email: `v07-s-${run}@example.com`, role: "STUDENT", passwordHash: "unused", fullName: "V07 Öğrenci", studentProfile: { create: {} }, productMemberships: { create: { product: "OK" } } }, include: { studentProfile: true } });
  const parent = await db.user.create({ data: { email: `v07-p-${run}@example.com`, role: "PARENT", passwordHash: "unused" } });
  const blocked = await db.user.create({ data: { email: `v07-b-${run}@example.com`, role: "PARENT", passwordHash: "unused" } });
  const coach = await db.user.create({ data: { email: `v07-c-${run}@example.com`, role: "TEACHER", passwordHash: "unused", teacherProfile: { create: { isCoach: true } } }, include: { teacherProfile: true } });
  const studentId = student.studentProfile!.id;
  await db.coachAssignment.create({ data: { studentId, coachId: coach.teacherProfile!.id } });
  const link = await db.parentStudent.create({ data: { parentId: parent.id, studentId } });
  await db.parentStudent.create({ data: { parentId: blocked.id, studentId, canViewAcademic: false } });
  const users = [student.id, parent.id, blocked.id, coach.id];
  try {
    const session = await createCoachingSession({ userId: coach.id, role: "TEACHER" }, { studentId, scheduledAt: new Date(Date.now() + 48 * 3_600_000).toISOString(), meetingUrl: "https://meet.example.com/v07", idempotencyKey: randomUUID() });
    const child = { id: studentId, userId: student.id, name: "V07 Öğrenci", products: ["OK" as const] };
    const sessions = await loadParentCoachingSessions(parent.id, child);
    const projected = toMobileParentCoaching({ studentId, available: true, view: null, sessions });
    const parsed = parseParentCoaching(JSON.parse(JSON.stringify(projected)));
    assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
    assert.equal(projected.sessions[0].version, 1);
    assert.equal(projected.sessions[0].meetingUrl, "https://meet.example.com/v07");

    const request = (version: number) => ({ action: "REQUEST", reason: "FAMILY_SCHEDULE", expectedVersion: version, idempotencyKey: randomUUID() });
    await assert.rejects(mutateCoachingSession({ userId: blocked.id, role: "PARENT" }, session.id, request(1)), { status: 404 });
    await db.productMembership.updateMany({ where: { userId: student.id, product: "OK" }, data: { revokedAt: new Date() } });
    await assert.rejects(mutateCoachingSession({ userId: parent.id, role: "PARENT" }, session.id, request(1)), { status: 404 });
    await db.productMembership.updateMany({ where: { userId: student.id, product: "OK" }, data: { revokedAt: null } });
    await db.parentStudent.update({ where: { id: link.id }, data: { active: false, endedAt: new Date() } });
    await assert.rejects(mutateCoachingSession({ userId: parent.id, role: "PARENT" }, session.id, request(1)), { status: 404 });
    await db.parentStudent.update({ where: { id: link.id }, data: { active: true, endedAt: null } });
    const done = await mutateCoachingSession({ userId: parent.id, role: "PARENT" }, session.id, request(1));
    assert.equal((done as { version: number }).version, 2);
    await assert.rejects(mutateCoachingSession({ userId: parent.id, role: "PARENT" }, session.id, request(1)), { status: 409 });
    const after = toMobileParentCoaching({ studentId, available: true, view: null, sessions: await loadParentCoachingSessions(parent.id, child) });
    assert.equal(after.sessions[0].rescheduleRequested, true);
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
  }
});
