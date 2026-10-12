import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseTeacherInterventions } from '../../lib/mobile-contracts/teacher-interventions';

test('T11 teacher inbox: scope, ownership, revisions, atomic replay and case lifecycle', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated DB and interventionInbox flag required');
  const db = new PrismaClient(); const userIds: string[] = []; let groupId: string | undefined;
  async function teacher() {
    const user = await db.user.create({ data: { email: `intervention-${randomUUID()}@example.com`, role: 'TEACHER', status: 'ACTIVE', mustChangePassword: false, passwordHash: 'unused', inviteAcceptedAt: new Date() } }); userIds.push(user.id);
    const token = randomBytes(32).toString('base64url');
    await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000), mfaVerifiedAt: new Date() } });
    return { user, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const owner = await teacher(), foreign = await teacher();
    const student = await db.user.create({ data: { email: `intervention-student-${randomUUID()}@example.com`, fullName: 'Müdahale öğrencisi', role: 'STUDENT', status: 'ACTIVE', passwordHash: 'unused' } }); userIds.push(student.id);
    const profile = await db.studentProfile.create({ data: { userId: student.id } });
    const group = await db.group.create({ data: { name: 'Intervention test', subject: 'Matematik', teacherId: owner.user.id } }); groupId = group.id;
    const enrollment = await db.enrollment.create({ data: { studentId: profile.id, groupId } });
    const path = '/api/panel/staff/teacher/interventions';
    async function read() {
      const response = await request.get(path, { headers: owner.headers }); expect(response.status(), await response.text()).toBe(200); expect(response.headers()['cache-control']).toContain('no-store');
      const parsed = parseTeacherInterventions(await response.json()); expect(parsed.ok).toBe(true); if (!parsed.ok) throw new Error(parsed.error); return parsed.value;
    }
    const first = await read(); expect(first.students.map((s) => s.id)).toContain(profile.id);
    const foreignInbox = await (await request.get(path, { headers: foreign.headers })).json(); expect(foreignInbox.students).toEqual([]); expect(foreignInbox.rows).toEqual([]);
    const create = { operation: 'create', input: { studentId: profile.id, reasonCode: 'TEACHER_OBSERVED', explanation: 'Üç çalışmada zorlanıyor', suggestedAction: 'Kısa görüşme planla', followUpDate: '2099-01-01' } };
    const headers = { ...owner.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': first.revision };
    expect((await request.post(path, { headers: owner.headers, data: create })).status()).toBe(400);
    expect((await request.post(path, { headers: { ...headers, ...foreign.headers }, data: create })).status()).toBe(404);
    const created = await request.post(path, { headers, data: create }); expect(created.status(), await created.text()).toBe(200); const id = (await created.json()).id;
    expect((await (await request.post(path, { headers, data: create })).json()).replayed).toBe(true);
    expect(await db.interventionCase.count({ where: { studentId: profile.id } })).toBe(1);
    expect((await request.post(path, { headers, data: { ...create, input: { ...create.input, explanation: 'Başka bir gözlem metni' } } })).status()).toBe(409);
    expect((await request.post(path, { headers: { ...headers, 'X-Od-Idempotency-Key': randomUUID() }, data: create })).status()).toBe(409);
    for (const patch of [{ action: 'ASSIGN_SELF' }, { action: 'START' }, { action: 'LOG_ACTION', note: 'Görüşme yapıldı' }, { action: 'SNOOZE', days: 3 }, { action: 'RESOLVE', outcomeCode: 'SUPPORT_PLANNED' }, { action: 'REOPEN' }, { action: 'FALSE_POSITIVE', falsePositiveReason: 'CONTEXT_MISSING' }, { action: 'REOPEN' }]) {
      const inbox = await read(); const row = inbox.rows.find((r) => r.id === id)!;
      const update = { operation: 'update', id, input: { ...patch, expectedVersion: row.version } };
      const control = { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': inbox.revision };
      const activityCount = await db.interventionCaseActivity.count({ where: { caseId: id } });
      const responses = await Promise.all([request.post(path, { headers: control, data: update }), request.post(path, { headers: control, data: update })]);
      for (const response of responses) expect(response.status(), await response.text()).toBe(200);
      expect(await db.interventionCaseActivity.count({ where: { caseId: id } })).toBe(activityCount + 1);
      expect((await request.post(path, { headers: { ...control, 'X-Od-Idempotency-Key': randomUUID() }, data: update })).status()).toBe(409);
    }
    // Rule generation creates one episode from real evidence; retry does not append activities.
    for (let n = 0; n < 3; n++) {
      const lesson = await db.lesson.create({ data: { groupId, teacherId: owner.user.id, title: 'Kaçan ders', status: 'COMPLETED', startsAt: new Date(Date.now() - (n + 1) * 86_400_000), endsAt: new Date(Date.now() - (n + 1) * 86_400_000 + 3_600_000) } });
      await db.attendance.create({ data: { studentId: profile.id, lessonId: lesson.id, status: 'ABSENT' } });
    }
    const beforeGenerate = await read();
    const generateHeaders = { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': beforeGenerate.revision };
    const generated = await request.post(path, { headers: generateHeaders, data: { operation: 'generate' } }); expect(generated.status(), await generated.text()).toBe(200); expect((await generated.json()).createdCount).toBe(1);
    const afterGenerate = await read(); expect(afterGenerate.rows).toHaveLength(2);
    const activities = await db.interventionCaseActivity.count({ where: { case: { studentId: profile.id } } });
    expect((await (await request.post(path, { headers: generateHeaders, data: { operation: 'generate' } })).json()).replayed).toBe(true);
    expect(await db.interventionCaseActivity.count({ where: { case: { studentId: profile.id } } })).toBe(activities);
    const generatedCase = afterGenerate.rows.find((row) => row.id !== id)!;
    await db.interventionCase.update({ where: { id: generatedCase.id }, data: { ownerId: foreign.user.id, status: 'SNOOZED', snoozedUntil: new Date(Date.now() - 86_400_000), version: { increment: 1 } } });
    const otherOwned = await read(); expect(otherOwned.rows.find((r) => r.id === generatedCase.id)?.canAct).toBe(false);
    expect((await request.post(path, { headers: { ...headers, 'X-Od-Expected-Revision': otherOwned.revision, 'X-Od-Idempotency-Key': randomUUID() }, data: { operation: 'update', id: generatedCase.id, input: { action: 'ASSIGN_SELF', expectedVersion: generatedCase.version + 1 } } })).status()).toBe(404);
    const ownedVersion = (await db.interventionCase.findUniqueOrThrow({ where: { id: generatedCase.id } })).version;
    expect((await request.post(path, { headers: { ...generateHeaders, 'X-Od-Expected-Revision': otherOwned.revision, 'X-Od-Idempotency-Key': randomUUID() }, data: { operation: 'generate' } })).status()).toBe(200);
    expect((await db.interventionCase.findUniqueOrThrow({ where: { id: generatedCase.id } })).version).toBe(ownedVersion);
    // The web/admin routes still use the exact same creation and update business operations.
    const legacyCreate = await request.post('/api/panel/interventions', { headers: owner.headers, data: create.input });
    expect(legacyCreate.status(), await legacyCreate.text()).toBe(200);
    const legacyId = (await legacyCreate.json()).id;
    const legacyUpdate = await request.patch(`/api/panel/interventions/${legacyId}`, { headers: owner.headers, data: { action: 'LOG_ACTION', note: 'Web yolu çalışıyor', expectedVersion: 1 } });
    expect(legacyUpdate.status(), await legacyUpdate.text()).toBe(200);
    await db.enrollment.update({ where: { id: enrollment.id }, data: { endedAt: new Date() } });
    expect((await read()).rows).toEqual([]);
    expect((await request.post(path, { headers, data: create })).status()).toBe(404);
  } finally {
    await db.interventionCase.deleteMany({ where: { student: { userId: { in: userIds } } } });
    if (groupId) { await db.lesson.deleteMany({ where: { groupId } }); await db.group.delete({ where: { id: groupId } }); }
    await db.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } }); await db.user.deleteMany({ where: { id: { in: userIds } } }); await db.$disconnect();
  }
});
