import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseOdkManagementQueue, parseOdkManagementReports } from '../../lib/mobile-contracts/odk-management-reports';
test('P4 K05/K06 HTTP: queue permissions, published report projection and related-teacher separation', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated DB required');
  const db = new PrismaClient(), users: string[] = [], examIds: string[] = [];
  const enforce = process.env.P4_MANAGEMENT_ENFORCE === 'true';
  async function actor(role: 'ADMIN' | 'TEACHER' | 'STUDENT', staffRole?: 'RESULT_PUBLISHER' | 'REPORT_VIEWER' | 'EXAM_EDITOR' | 'PRODUCT_MANAGER') {
    const user = await db.user.create({ data: { role, fullName: `HTTP rapor ${randomUUID()}`, email: `odk-reports-${randomUUID()}@example.com`, status: 'ACTIVE', passwordHash: 'unused', mustChangePassword: false, inviteAcceptedAt: new Date() } }); users.push(user.id);
    if (staffRole) await db.productStaffAssignment.create({ data: { userId: user.id, productId: (await db.product.findUniqueOrThrow({ where: { code: 'ODK' } })).id, role: staffRole } });
    const token = randomBytes(32).toString('base64url'); await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000), mfaVerifiedAt: new Date() } });
    return { user, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const admin = await actor('ADMIN'), publisher = await actor('TEACHER', 'RESULT_PUBLISHER'), related = await actor('TEACHER', 'REPORT_VIEWER'), editor = await actor('TEACHER', 'EXAM_EDITOR'), manager = await actor('TEACHER', 'PRODUCT_MANAGER'), learner = await actor('STUDENT');
    await db.studentProfile.create({ data: { userId: learner.user.id, classLevel: '8' } });
    const paths = ['/api/panel/odk/management/results', '/api/panel/odk/management/reports'];
    for (const path of paths) {
      expect((await request.get(path)).status()).toBe(401); expect((await request.get(path, { headers: learner.headers })).status()).toBe(403);
      expect((await request.get(path, { headers: related.headers })).status()).toBe(403); expect((await request.get(path, { headers: editor.headers })).status()).toBe(403);
      const staff = await request.get(path, { headers: publisher.headers }); expect(staff.status(), await staff.text()).toBe(enforce ? 200 : 403);
      expect((await request.get(path, { headers: manager.headers })).status()).toBe(enforce && path.endsWith('/reports') ? 200 : 403);
      expect((await request.post(path, { headers: admin.headers, data: {} })).status()).toBe(405);
    }
    async function exam(title: string, status: 'ENDED' | 'SCORED' | 'RELEASED', net: number | null, offset: number) {
      const created = await request.post('/api/odk/admin/exams', { headers: admin.headers, data: { examFamilyCode: 'LGS', title, slug: `report-${randomUUID()}`, structureMode: 'MATH_ONLY', templateCode: 'LGS_MATH', questionCount: 2 } }); expect(created.status(), await created.text()).toBe(201);
      const id = (await created.json()).exam.id; examIds.push(id); const row = await db.odkExam.findUniqueOrThrow({ where: { id } }); const at = new Date(Date.now() - (offset + 2) * 86400000);
      await db.odkExam.update({ where: { id }, data: { status, startsAt: at, endsAt: new Date(at.getTime() + 3600000), resultsReleasedAt: status === 'RELEASED' ? at : null, meetUrl: 'https://secret.invalid/DO_NOT_RETURN' } });
      const attempt = await db.odkExamAttempt.create({ data: { examId: id, versionId: row.currentVersionId!, studentUserId: learner.user.id, status: 'SUBMITTED', startedAt: at, deadlineAt: new Date(at.getTime() + 3600000), submittedAt: new Date(at.getTime() + 3600000) } });
      if (net != null) await db.odkAttemptScore.create({ data: { attemptId: attempt.id, correctCount: 1, wrongCount: 1, blankCount: 0, totalNet: net, scoringVersion: 'test', answerKeyHash: 'DO_NOT_RETURN', scoredById: admin.user.id, publicationStatus: status === 'RELEASED' ? 'PUBLISHED' : 'HIDDEN' } });
      return id;
    }
    const ended = await exam('HTTP puan bekleyen', 'ENDED', null, 0); const hidden = await exam('HTTP gizli skor', 'SCORED', 999, 1); const first = await exam('HTTP önceki yayın', 'RELEASED', 10, 3); const latest = await exam('HTTP son yayın', 'RELEASED', 12, 0);
    const queueResponse = await request.get(paths[0], { headers: admin.headers }); expect(queueResponse.headers()['cache-control']).toContain('no-store'); const queue = parseOdkManagementQueue(await queueResponse.json()); expect(queue.ok).toBe(true); if (!queue.ok) throw new Error(queue.error);
    expect(queue.value.rows.find((r) => r.id === ended)).toMatchObject({ unscored: 1, stage: 'PUANLANIYOR' }); expect(queue.value.rows.find((r) => r.id === hidden)).toMatchObject({ unscored: 0, stage: 'INCELEME' }); expect(await queueResponse.text()).not.toContain('DO_NOT_RETURN');
    const released = await (await request.get(`${paths[0]}?asama=YAYINLANDI`, { headers: admin.headers })).json(); expect(released.rows.every((r: { stage: string }) => r.stage === 'YAYINLANDI')).toBe(true); expect(released.rows.some((r: { id: string }) => r.id === latest)).toBe(true);
    const rosterResponse = await request.get(`${paths[1]}?q=${encodeURIComponent(learner.user.fullName!)}`, { headers: admin.headers }); expect(rosterResponse.headers()['cache-control']).toContain('no-store'); const roster = parseOdkManagementReports(await rosterResponse.json()); expect(roster.ok).toBe(true); if (!roster.ok) throw new Error(roster.error); expect(roster.value.rows.find((r) => r.studentId === learner.user.id)).toMatchObject({ latestNet: 12, delta: 2, examCount: 2 });
    const reportResponse = await request.get(`${paths[1]}?ogrenci=${learner.user.id}`, { headers: admin.headers }); const parsed = parseOdkManagementReports(await reportResponse.json()); expect(parsed.ok).toBe(true); if (!parsed.ok) throw new Error(parsed.error); expect(parsed.value.report).toMatchObject({ latestExamId: latest, latestNet: 12, delta: 2 }); expect(parsed.value.report?.exams.map((e) => e.id).sort()).toEqual([first, latest].sort()); expect(await reportResponse.text()).not.toContain('HTTP gizli skor'); expect(await reportResponse.text()).not.toContain('DO_NOT_RETURN');
    expect((await request.get(`${paths[1]}?ogrenci=foreign-student`, { headers: admin.headers })).status()).toBe(404);
    await db.user.update({ where: { id: learner.user.id }, data: { status: 'SUSPENDED' } }); expect((await request.get(`${paths[1]}?ogrenci=${learner.user.id}`, { headers: admin.headers })).status()).toBe(404);
    await db.productStaffAssignment.updateMany({ where: { userId: publisher.user.id }, data: { revokedAt: new Date() } }); for (const path of paths) expect((await request.get(path, { headers: publisher.headers })).status()).toBe(403);
  } finally {
    await db.odkExamAttempt.deleteMany({ where: { examId: { in: examIds } } }); await db.odkExam.deleteMany({ where: { id: { in: examIds } } }); await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await db.studentProfile.deleteMany({ where: { userId: { in: users } } }); await db.productStaffAssignment.deleteMany({ where: { userId: { in: users } } }); await db.session.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
