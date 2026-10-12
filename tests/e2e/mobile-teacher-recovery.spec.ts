import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseTeacherRecovery } from '../../lib/mobile-contracts/teacher-recovery';

test('T10 teacher recovery: scope, source revision, generation replay and single publication', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated local DB and recoveryPackage flag required');
  const db = new PrismaClient(); const userIds: string[] = []; let groupId: string | undefined; let studentEmail: string | undefined;
  async function teacher() {
    const user = await db.user.create({ data: { email: `recovery-${randomUUID()}@example.com`, role: 'TEACHER', status: 'ACTIVE', mustChangePassword: false, passwordHash: 'unused', inviteAcceptedAt: new Date() } });
    userIds.push(user.id);
    const token = randomBytes(32).toString('base64url');
    await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000), mfaVerifiedAt: new Date() } });
    return { user, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const owner = await teacher(), foreign = await teacher();
    const student = await db.user.create({ data: { email: `recovery-student-${randomUUID()}@example.com`, fullName: 'Telafi öğrencisi', role: 'STUDENT', status: 'ACTIVE', passwordHash: 'unused' } });
    userIds.push(student.id); studentEmail = student.email;
    await db.notificationPreference.create({ data: { userId: student.id, emailEnabled: true } });
    const profile = await db.studentProfile.create({ data: { userId: student.id } });
    const group = await db.group.create({ data: { name: 'Recovery test', subject: 'Matematik', teacherId: owner.user.id } }); groupId = group.id;
    const enrollment = await db.enrollment.create({ data: { studentId: profile.id, groupId } });
    const lesson = await db.lesson.create({ data: { groupId, teacherId: owner.user.id, title: 'Kesirler', status: 'COMPLETED', startsAt: new Date(Date.now() - 7_200_000), endsAt: new Date(Date.now() - 3_600_000) } });
    const attendance = await db.attendance.create({ data: { lessonId: lesson.id, studentId: profile.id, status: 'ABSENT' } });
    await db.lessonNote.create({ data: { lessonId: lesson.id, studentId: profile.id, topic: 'Özel not' } });
    const material = await db.learningMaterial.create({ data: { groupId, lessonId: lesson.id, createdById: owner.user.id, title: 'Ortak föy', kind: 'LINK', url: 'https://example.com/recovery' } });
    const path = '/api/panel/staff/teacher/recovery';
    const read = async () => {
      const response = await request.get(path, { headers: owner.headers });
      expect(response.status(), await response.text()).toBe(200);
      expect(response.headers()['cache-control']).toContain('no-store');
      const parsed = parseTeacherRecovery(await response.json()); expect(parsed.ok).toBe(true);
      if (!parsed.ok) throw new Error(parsed.error); return parsed.value.rows[0];
    };
    const first = await read(); expect(first.package).toBeNull();
    expect((await (await request.get(path, { headers: foreign.headers })).json()).rows).toEqual([]);
    const input = { attendanceId: attendance.id, action: 'generate' };
    const control = { ...owner.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': first.revision };
    expect((await request.post(path, { headers: owner.headers, data: input })).status()).toBe(400);
    expect((await request.post(path, { headers: { ...control, ...foreign.headers }, data: input })).status()).toBe(404);
    await db.learningMaterial.update({ where: { id: material.id }, data: { title: 'Güncel ortak föy' } });
    expect((await request.post(path, { headers: control, data: input })).status()).toBe(409);
    const fresh = await read(); const generateHeaders = { ...control, 'X-Od-Expected-Revision': fresh.revision };
    const generated = await request.post(path, { headers: generateHeaders, data: input }); expect(generated.status(), await generated.text()).toBe(200);
    expect((await (await request.post(path, { headers: generateHeaders, data: input })).json()).replayed).toBe(true);
    const preview = await read(); expect(preview.package?.version).toBe(1);
    expect(JSON.stringify(preview)).not.toContain('Özel not'); expect(preview.package?.items[0].title).toBe('Güncel ortak föy');
    const publishInput = { ...input, action: 'publish' };
    const publishHeaders = { ...owner.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': preview.revision };
    const publications = await Promise.all([request.post(path, { headers: publishHeaders, data: publishInput }), request.post(path, { headers: publishHeaders, data: publishInput })]);
    for (const published of publications) expect(published.status(), await published.text()).toBe(200);
    expect((await (await request.post(path, { headers: publishHeaders, data: publishInput })).json()).replayed).toBe(true);
    expect(await db.notification.count({ where: { userId: student.id, type: 'ABSENCE' } })).toBe(1);
    expect(await db.emailOutbox.count({ where: { recipients: { contains: student.email } } })).toBe(1);
    expect((await read()).package?.status).toBe('PUBLISHED');
    await db.enrollment.update({ where: { id: enrollment.id }, data: { endedAt: new Date() } });
    expect((await request.post(path, { headers: publishHeaders, data: publishInput })).status()).toBe(404);
  } finally {
    if (studentEmail) await db.emailOutbox.deleteMany({ where: { recipients: { contains: studentEmail } } });
    await db.notification.deleteMany({ where: { userId: { in: userIds } } });
    if (groupId) {
      await db.learningMaterial.deleteMany({ where: { groupId } });
      await db.lesson.deleteMany({ where: { groupId } });
      await db.group.delete({ where: { id: groupId } });
    }
    await db.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
