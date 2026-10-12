import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseTeacherDigests } from '../../lib/mobile-contracts/teacher-digests';

test('T12 scoped drafts, selected-only generation, recipient revision and atomic publication replay', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated DB and parentWeeklyDigest flag required');
  const db = new PrismaClient(); const users: { id: string; email: string }[] = []; let groupId: string | undefined;
  async function user(role: 'TEACHER' | 'STUDENT' | 'PARENT') {
    const result = await db.user.create({ data: { email: `digest-${randomUUID()}@example.com`, fullName: `Özet ${role}`, role, status: 'ACTIVE', passwordHash: 'unused', mustChangePassword: false, inviteAcceptedAt: new Date() } }); users.push(result); return result;
  }
  async function teacher() {
    const actor = await user('TEACHER'); const token = randomBytes(32).toString('base64url');
    await db.session.create({ data: { userId: actor.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000), mfaVerifiedAt: new Date() } });
    return { actor, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const owner = await teacher(), foreign = await teacher(); const learner = await user('STUDENT'), other = await user('STUDENT');
    const parent = await user('PARENT'), inactive = await user('PARENT');
    for (const recipient of [learner, parent, inactive]) await db.notificationPreference.create({ data: { userId: recipient.id, emailEnabled: true, weeklyDigest: true } });
    const student = await db.studentProfile.create({ data: { userId: learner.id } });
    const second = await db.studentProfile.create({ data: { userId: other.id } });
    await db.parentStudent.create({ data: { studentId: student.id, parentId: parent.id } });
    const group = await db.group.create({ data: { teacherId: owner.actor.id, subject: 'Matematik', name: 'Digest HTTP' } }); groupId = group.id;
    const enrollment = await db.enrollment.create({ data: { groupId, studentId: student.id } });
    await db.enrollment.create({ data: { groupId, studentId: second.id } });
    const path = '/api/panel/staff/teacher/digests';
    async function read() {
      const response = await request.get(path, { headers: owner.headers }); expect(response.status(), await response.text()).toBe(200); expect(response.headers()['cache-control']).toContain('no-store');
      const parsed = parseTeacherDigests(await response.json()); expect(parsed.ok).toBe(true); if (!parsed.ok) throw new Error(parsed.error); return parsed.value.rows.find((row) => row.studentId === student.id)!;
    }
    const first = await read(); expect(first.digest).toBeNull(); expect((await (await request.get(path, { headers: foreign.headers })).json()).rows).toEqual([]);
    const generate = { studentId: student.id, action: 'generate' };
    const headers = { ...owner.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': first.revision };
    expect((await request.post(path, { headers: owner.headers, data: generate })).status()).toBe(400);
    expect((await request.post(path, { headers: { ...headers, ...foreign.headers }, data: generate })).status()).toBe(404);
    const generated = await request.post(path, { headers, data: generate }); expect(generated.status(), await generated.text()).toBe(200);
    const id = (await generated.json()).id;
    expect((await (await request.post(path, { headers, data: generate })).json()).replayed).toBe(true);
    expect(await db.weeklyDigest.count({ where: { studentId: second.id } })).toBe(0);
    let preview = await read(); expect(preview.digest?.status).toBe('DRAFT'); expect(preview.digest?.version).toBe(1);
    const renewHeaders = { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': preview.revision };
    expect((await request.post(path, { headers: renewHeaders, data: generate })).status()).toBe(200);
    expect((await request.post(path, { headers: { ...renewHeaders, 'X-Od-Idempotency-Key': randomUUID() }, data: generate })).status()).toBe(409);
    preview = await read(); expect(preview.digest?.version).toBe(2);
    const publish = { ...generate, action: 'publish' };
    const publishHeaders = { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': preview.revision };
    await db.parentStudent.create({ data: { studentId: student.id, parentId: inactive.id } });
    expect((await request.post(path, { headers: publishHeaders, data: publish })).status()).toBe(409);
    expect(await db.notification.count({ where: { userId: learner.id } })).toBe(0);
    await db.user.update({ where: { id: inactive.id }, data: { status: 'SUSPENDED' } });
    const current = await read(); const freshHeaders = { ...publishHeaders, 'X-Od-Expected-Revision': current.revision, 'X-Od-Idempotency-Key': randomUUID() };
    const responses = await Promise.all([request.post(path, { headers: freshHeaders, data: publish }), request.post(path, { headers: freshHeaders, data: publish })]);
    for (const response of responses) expect(response.status(), await response.text()).toBe(200);
    expect((await (await request.post(path, { headers: freshHeaders, data: publish })).json()).replayed).toBe(true);
    expect((await read()).digest?.status).toBe('PUBLISHED');
    expect(await db.notification.count({ where: { userId: { in: [learner.id, parent.id] }, type: 'LESSON_SUMMARY' } })).toBe(2);
    expect(await db.notification.count({ where: { userId: inactive.id } })).toBe(0);
    expect(await db.emailOutbox.count({ where: { OR: [learner, parent].map((u) => ({ recipients: { contains: u.email } })) } })).toBe(2);
    const unchanged = await db.weeklyDigest.findUniqueOrThrow({ where: { id } });
    expect((await request.post(path, { headers: { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': (await read()).revision }, data: generate })).status()).toBe(409);
    expect((await db.weeklyDigest.findUniqueOrThrow({ where: { id } })).version).toBe(unchanged.version);
    // Legacy web generation also affects only the selected student.
    const webGenerate = await request.post('/api/panel/weekly-digests/generate', { headers: owner.headers, data: { studentId: second.id } }); expect(webGenerate.status(), await webGenerate.text()).toBe(200);
    const otherDigest = await db.weeklyDigest.findFirstOrThrow({ where: { studentId: second.id } });
    const webPublish = await request.post(`/api/panel/weekly-digests/${otherDigest.id}/publish`, { headers: owner.headers, data: { expectedVersion: otherDigest.version } }); expect(webPublish.status(), await webPublish.text()).toBe(200);
    await db.enrollment.update({ where: { id: enrollment.id }, data: { endedAt: new Date() } });
    expect((await request.post(path, { headers: freshHeaders, data: publish })).status()).toBe(404);
  } finally {
    await db.emailOutbox.deleteMany({ where: { OR: users.map((u) => ({ recipients: { contains: u.email } })) } });
    await db.notification.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    if (groupId) await db.group.delete({ where: { id: groupId } });
    await db.studentProfile.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users.map((u) => u.id) } } });
    await db.session.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } }); await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } }); await db.$disconnect();
  }
});
