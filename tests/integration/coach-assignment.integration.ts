import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma as db } from "@/lib/prisma";
import { assignCoachService, CoachAssignmentConflict, coachAssignmentRevision } from "@/lib/panel/coach-assignment-service";
import { adminCoachingProjection, adminCoachingSessionProjection } from "@/lib/panel/admin-coaching-projection";
import { parseAdminCoaching, parseAdminCoachingSession } from "@/lib/mobile-contracts/admin-coaching";
import { integration } from "./integration-utils";
async function fixture() {
  const users: string[] = [];
  async function user(role: 'ADMIN' | 'STUDENT' | 'TEACHER') {
    const row = await db.user.create({ data: { email: `p24-${randomUUID()}@example.com`, role, status: 'ACTIVE', passwordHash: 'unused' } }); users.push(row.id); return row;
  }
  const admin = await user('ADMIN'), coachUser = await user('TEACHER');
  const coach = await db.teacherProfile.create({ data: { userId: coachUser.id, isCoach: true, coachCapacity: 1 } });
  async function student() { const u = await user('STUDENT'); const s = await db.studentProfile.create({ data: { userId: u.id } }); await db.productMembership.create({ data: { userId: u.id, product: 'OK', source: 'MANUAL' } }); return s; }
  const s1 = await student(), s2 = await student();
  const input = (studentId = s1.id) => ({ actorUserId: admin.id, studentId, coachId: coach.id, cadenceDays: '7', idempotencyKey: randomUUID(), expectedRevision: coachAssignmentRevision(null) });
  async function clean() {
    await db.auditLog.deleteMany({ where: { actorUserId: admin.id } });
    await db.coachingSession.deleteMany({ where: { assignment: { studentId: { in: [s1.id, s2.id] } } } });
    await db.coachAssignment.deleteMany({ where: { studentId: { in: [s1.id, s2.id] } } });
    await db.productMembership.deleteMany({ where: { userId: { in: users } } });
    await db.studentProfile.deleteMany({ where: { userId: { in: users } } });
    await db.teacherProfile.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
  }
  return { admin, coach, coachUser, s1, s2, input, clean };
}
integration('P2.4 aynı anahtar eşzamanlı tek atama/audit üretir; farklı içerik ve eski sürüm 409', async () => {
  const f = await fixture(); try {
    const input = f.input();
    const results = await Promise.all([assignCoachService(input), assignCoachService(input)]);
    assert.equal(results.filter((r) => r.ok && r.replayed).length, 1);
    assert.equal(await db.coachAssignment.count({ where: { studentId: f.s1.id } }), 1);
    assert.equal(await db.auditLog.count({ where: { actorUserId: f.admin.id } }), 1);
    await assert.rejects(assignCoachService({ ...input, cadenceDays: '14' }), (e) => e instanceof CoachAssignmentConflict && e.code === 'IDEMPOTENCY_REUSE');
    await assert.rejects(assignCoachService({ ...input, idempotencyKey: randomUUID() }), CoachAssignmentConflict);
    const current = await db.coachAssignment.findFirstOrThrow({ where: { studentId: f.s1.id, endedAt: null } });
    assert.equal((await assignCoachService({ ...input, idempotencyKey: randomUUID(), expectedRevision: coachAssignmentRevision(current), cadenceDays: '14' })).ok, true);
    assert.equal(await db.coachAssignment.count({ where: { studentId: f.s1.id, endedAt: null } }), 1);
  } finally { await f.clean(); }
});
integration('P2.4 son kapasiteye yarışan öğrencilerden biri atanır; gerekçeli aşım denetime atomik yazılır', async () => {
  const f = await fixture(); try {
    const results = await Promise.allSettled([assignCoachService(f.input()), assignCoachService(f.input(f.s2.id))]);
    assert.equal(results.filter((r) => r.status === 'fulfilled' && r.value.ok).length, 1);
    assert.equal(await db.coachAssignment.count({ where: { coachId: f.coach.id, endedAt: null } }), 1);
    const missing = await db.coachAssignment.findFirst({ where: { studentId: f.s1.id, endedAt: null } }) ? f.s2 : f.s1;
    assert.deepEqual(await assignCoachService(f.input(missing.id)), { ok: false, code: 'capacity' });
    assert.equal((await assignCoachService({ ...f.input(missing.id), overrideReason: 'Dönem sonu desteği' })).ok, true);
    const audit = await db.auditLog.findFirstOrThrow({ where: { actorUserId: f.admin.id, entityId: missing.id } });
    assert.equal((audit.payload as { overrideReason: string }).overrideReason, 'Dönem sonu desteği');
  } finally { await f.clean(); }
});
integration('P2.4 üyelik/aktif hesap kapıları ve projeksiyon sözleşmesi; özel not sızmaz', async () => {
  const f = await fixture(); try {
    await db.productMembership.deleteMany({ where: { userId: f.s1.userId } });
    assert.deepEqual(await assignCoachService(f.input()), { ok: false, code: 'membership' });
    await db.user.update({ where: { id: f.coachUser.id }, data: { status: 'SUSPENDED' } });
    assert.deepEqual(await assignCoachService(f.input(f.s2.id)), { ok: false, code: 'coach' });
    await db.user.update({ where: { id: f.coachUser.id }, data: { status: 'ACTIVE' } });
    await assignCoachService(f.input(f.s2.id));
    const a = await db.coachAssignment.findFirstOrThrow({ where: { studentId: f.s2.id, endedAt: null } });
    const session = await db.coachingSession.create({ data: { assignmentId: a.id, scheduledAt: new Date(), sharedNote: 'Paylaşılan not', privateNote: 'P24_SECRET', focus: 'Haftalık hedef' } });
    const overview = await adminCoachingProjection(); assert.equal(parseAdminCoaching(overview).ok, true);
    assert.ok(overview.students.some((s) => s.id === f.s2.id));
    assert.ok(overview.sessions.some((s) => s.id === session.id));
    const detail = await adminCoachingSessionProjection(session.id); assert.equal(parseAdminCoachingSession(detail).ok, true);
    assert.equal(detail?.sharedNote, 'Paylaşılan not'); assert.ok(!JSON.stringify([overview, detail]).includes('P24_SECRET'));
    assert.equal(await adminCoachingSessionProjection('p24-missing'), null);
  } finally { await f.clean(); }
});
integration('P2.4 askıya alınmış öğrenci atanmaz; transaction başarısızsa devir geri alınır', async () => {
  const f = await fixture(); try {
    await db.user.update({ where: { id: f.s1.userId }, data: { status: 'SUSPENDED' } });
    assert.deepEqual(await assignCoachService(f.input()), { ok: false, code: 'student' });
    await assignCoachService(f.input(f.s2.id));
    const current = await db.coachAssignment.findFirstOrThrow({ where: { studentId: f.s2.id, endedAt: null } });
    await assert.rejects(assignCoachService({ ...f.input(f.s2.id), actorUserId: 'p24-missing-actor', expectedRevision: coachAssignmentRevision(current) }));
    assert.equal((await db.coachAssignment.findFirstOrThrow({ where: { studentId: f.s2.id, endedAt: null } })).id, current.id);
    assert.equal(await db.coachAssignment.count({ where: { studentId: f.s2.id } }), 1);
  } finally { await f.clean(); }
});
