import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseTeacherRoster } from '../../lib/mobile-contracts/teacher-roster';
import { parseStudent360 } from '../../lib/mobile-contracts/admin';

test('P3 öğretmen roster/profil HTTP: kendi aktif grubu, yabancı öğrenci ve sona ermiş kayıt', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'İzole veritabanı gerekli');
  const db = new PrismaClient();
  const run = randomUUID();
  const userIds: string[] = [];
  const groupIds: string[] = [];
  async function actor(role: 'TEACHER' | 'STUDENT') {
    const user = await db.user.create({ data: { email: `${role}-${userIds.length}-${run}@example.com`, fullName: `${role} ${userIds.length}`, role, status: 'ACTIVE', passwordHash: 'unused', mustChangePassword: false, inviteAcceptedAt: new Date() } });
    userIds.push(user.id);
    const token = randomBytes(32).toString('base64url');
    await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000), mfaVerifiedAt: new Date() } });
    return { user, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const teacher = await actor('TEACHER');
    const otherTeacher = await actor('TEACHER');
    const student = await actor('STUDENT');
    const foreign = await actor('STUDENT');
    const profile = await db.studentProfile.create({ data: { userId: student.user.id } });
    const foreignProfile = await db.studentProfile.create({ data: { userId: foreign.user.id } });
    const group = await db.group.create({ data: { name: `P3 ${run}`, subject: 'Matematik', teacherId: teacher.user.id } });
    groupIds.push(group.id);
    const enrollment = await db.enrollment.create({ data: { groupId: group.id, studentId: profile.id } });
    const listPath = '/api/panel/staff/teacher/students';
    const response = await request.get(listPath, { headers: teacher.headers });
    expect(response.status(), await response.text()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-store');
    const roster = parseTeacherRoster(await response.json());
    expect(roster.ok).toBe(true);
    if (roster.ok) expect(roster.value.rows.map((item) => item.studentId)).toEqual([profile.id]);
    expect((await request.get(`${listPath}?filtre=invalid`, { headers: teacher.headers })).status()).toBe(400);
    const otherList = await request.get(listPath, { headers: otherTeacher.headers });
    expect((await otherList.json()).rows).toEqual([]);
    expect((await request.get(listPath, { headers: student.headers })).status()).toBe(403);
    const detail = await request.get(`${listPath}/${profile.id}`, { headers: teacher.headers });
    expect(detail.status(), await detail.text()).toBe(200);
    const parsed = parseStudent360(await detail.json());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.manage).toBeNull();
      expect(parsed.value.blockedOrders).toEqual([]);
      expect(parsed.value.groups.some((item) => item.id === 'hesap')).toBe(false);
      expect(parsed.value.cards.some((item) => item.id === 'commerce')).toBe(false);
    }
    expect((await request.get(`${listPath}/${foreignProfile.id}`, { headers: teacher.headers })).status()).toBe(404);
    expect((await request.get(`${listPath}/${profile.id}`, { headers: otherTeacher.headers })).status()).toBe(404);
    await db.enrollment.update({ where: { id: enrollment.id }, data: { endedAt: new Date() } });
    expect((await request.get(`${listPath}/${profile.id}`, { headers: teacher.headers })).status()).toBe(404);
    expect((await (await request.get(listPath, { headers: teacher.headers })).json()).rows).toEqual([]);
  } finally {
    await db.group.deleteMany({ where: { id: { in: groupIds } } });
    await db.studentProfile.deleteMany({ where: { userId: { in: userIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
