import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseOdkManagementPilot } from '../../lib/mobile-contracts/odk-management-pilot';
test('P4 K08 HTTP: admin-only pilot, atomic replay, revision and readiness gates', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated DB required');
  const db = new PrismaClient(), users: string[] = [], runs: string[] = [], exams: string[] = [];
  const path = '/api/panel/odk/management/pilot'; const positive = process.env.P4_PILOT_ACTIVATION_READY === 'true';
  async function actor(role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT') {
    const user = await db.user.create({ data: { role, email: `odk-pilot-${randomUUID()}@example.com`, status: 'ACTIVE', passwordHash: 'unused', mustChangePassword: false, inviteAcceptedAt: new Date() } }); users.push(user.id);
    if (role === 'STUDENT' || role === 'PARENT') await db.productMembership.create({ data: { userId: user.id, product: 'ODK', startsAt: new Date(Date.now() - 60000) } });
    const token = randomBytes(32).toString('base64url'); await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000), mfaVerifiedAt: new Date() } });
    return { user, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  // The shared seed supplies an ACTIVE pilot for exam-flow tests. This test
  // exercises creation's single-open-pilot rule in the same isolated DB.
  // Temporarily close only that known fixture, then restore it in finally.
  const seededPilot = await db.odkPilotRun.findUnique({ where: { id: 'e2e-odk-pilot-run' }, select: { id: true, status: true, updatedAt: true } });
  try {
    if (seededPilot) await db.odkPilotRun.update({ where: { id: seededPilot.id }, data: { status: 'ROLLED_BACK' } });
    const admin = await actor('ADMIN'), teacher = await actor('TEACHER'), s1 = await actor('STUDENT'), s2 = await actor('STUDENT'), parent = await actor('PARENT');
    expect((await request.get(path)).status()).toBe(401); for (const a of [teacher, s1, parent]) { expect((await request.get(path, { headers: a.headers })).status()).toBe(403); expect((await request.post(path, { headers: a.headers, data: {} })).status()).toBe(403); }
    const response = await request.get(path, { headers: admin.headers }); expect(response.headers()['cache-control']).toContain('no-store'); const parsed = parseOdkManagementPilot(await response.json()); expect(parsed.ok).toBe(true); if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.value.candidates.some((c) => c.id === parent.user.id)).toBe(true); expect(parsed.value.runs.every((r) => !('requestKey' in r))).toBe(true);
    const command = { operation: 'create', name: 'HTTP kontrollü pilot', userIds: users };
    const headers = { ...admin.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': parsed.value.revision };
    expect((await request.post(path, { headers: admin.headers, data: command })).status()).toBe(400);
    expect((await request.post(path, { headers: { ...headers, 'X-Od-Expected-Revision': '0'.repeat(64) }, data: command })).status()).toBe(409);
    expect((await request.post(path, { headers: { ...headers, 'X-Od-Idempotency-Key': randomUUID() }, data: { ...command, userIds: [admin.user.id, teacher.user.id, s1.user.id, parent.user.id, parent.user.id] } })).status()).toBe(400);
    const responses = await Promise.all([request.post(path, { headers, data: command }), request.post(path, { headers, data: command })]); for (const r of responses) expect(r.status(), await r.text()).toBe(200); const bodies = await Promise.all(responses.map((r) => r.json())); expect(bodies[0].id).toBe(bodies[1].id); expect(bodies.map((b) => b.replayed).sort()).toEqual([false, true]); let id = bodies[0].id; runs.push(id);
    expect(await db.odkPilotRun.count({ where: { requestKey: headers['X-Od-Idempotency-Key'] } })).toBe(1); expect(await db.auditLog.count({ where: { entityId: id, action: 'odk.pilot_created' } })).toBe(1);
    expect((await request.post(path, { headers, data: { ...command, name: 'Changed name' } })).status()).toBe(409);
    async function current() { return (await (await request.get(path, { headers: admin.headers })).json()).runs.find((r: { id: string }) => r.id === id); }
    async function transition(action: string, stopReason?: string) { const run = await current(); return request.post(path, { headers: { ...admin.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': run.revision }, data: { operation: 'transition', id, input: { action, expectedVersion: run.version, ...(stopReason ? { stopReason } : {}) } } }); }
    // General mode must block activation; positive local pilot fixture tests all transitions.
    if (!positive) { expect((await transition('ACTIVATE')).status()).toBe(409); }
    else {
      const ready = await request.post('/api/odk/admin/exams', { headers: admin.headers, data: { examFamilyCode: 'TYT', title: 'HTTP hazır pilot denemesi', slug: `pilot-${randomUUID()}`, structureMode: 'MATH_ONLY', templateCode: 'TYT_MATH', questionCount: 2 } }); expect(ready.status(), await ready.text()).toBe(201); const examId = (await ready.json()).exam.id; exams.push(examId); const exam = await db.odkExam.findUniqueOrThrow({ where: { id: examId } }); await db.odkExamVersion.update({ where: { id: exam.currentVersionId! }, data: { status: 'LOCKED' } }); await db.odkExam.update({ where: { id: examId }, data: { status: 'READY' } });
      const activated = await transition('ACTIVATE'); expect(activated.status(), await activated.text()).toBe(200); expect((await current()).status).toBe('ACTIVE');
      expect((await transition('COMPLETE')).status()).toBe(409); expect((await transition('PAUSE')).status()).toBe(400);
      const run = await current(), pauseKey = randomUUID(); const pauseHeaders = { ...admin.headers, 'X-Od-Idempotency-Key': pauseKey, 'X-Od-Expected-Revision': run.revision }; const pauseCommand = { operation: 'transition', id, input: { action: 'PAUSE', expectedVersion: run.version, stopReason: 'OPERATIONAL' } };
      const pauses = await Promise.all([request.post(path, { headers: pauseHeaders, data: pauseCommand }), request.post(path, { headers: pauseHeaders, data: pauseCommand })]); for (const r of pauses) expect(r.status(), await r.text()).toBe(200); expect((await current()).version).toBe(run.version + 1); expect(await db.auditLog.count({ where: { entityId: id, action: 'odk.pilot_pause' } })).toBe(1);
      const stale = await request.post(path, { headers: { ...pauseHeaders, 'X-Od-Idempotency-Key': randomUUID() }, data: pauseCommand }); expect(stale.status()).toBe(409);
      const resumed = await transition('RESUME'); expect(resumed.status(), await resumed.text()).toBe(200); const rolled = await transition('ROLLBACK', 'SECURITY_INCIDENT'); expect(rolled.status(), await rolled.text()).toBe(200); expect((await current()).status).toBe('ROLLED_BACK');
      const workspace = await (await request.get(path, { headers: admin.headers })).json();
      const competing = await Promise.all([0, 1].map(() => request.post(path, { headers: { ...admin.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': workspace.revision }, data: { ...command, name: 'HTTP tamamlanan pilot' } }))); expect(competing.map((r) => r.status()).sort()).toEqual([200, 409]); id = (await competing.find((r) => r.status() === 200)!.json()).id; runs.push(id);
      const secondActivation = await transition('ACTIVATE'); expect(secondActivation.status(), await secondActivation.text()).toBe(200);
      // Synthetic acceptance evidence belongs only to this isolated local test.
      for (let index = 0; index < 2; index++) {
        const created = await request.post('/api/odk/admin/exams', { headers: admin.headers, data: { examFamilyCode: 'TYT', title: `HTTP sentetik pilot kanıtı ${index}`, slug: `pilot-proof-${randomUUID()}`, structureMode: 'MATH_ONLY', templateCode: 'TYT_MATH', questionCount: 2 } }); expect(created.status(), await created.text()).toBe(201);
        const examId = (await created.json()).exam.id; exams.push(examId); const exam = await db.odkExam.findUniqueOrThrow({ where: { id: examId } }); const at = new Date();
        await db.odkExam.update({ where: { id: examId }, data: { status: 'RELEASED', resultsReleasedAt: at } });
        for (const student of [s1, s2]) {
          const attempt = await db.odkExamAttempt.create({ data: { examId, versionId: exam.currentVersionId!, studentUserId: student.user.id, status: 'SUBMITTED', startedAt: new Date(at.getTime() - 60000), deadlineAt: new Date(at.getTime() + 60000), submittedAt: at } });
          await db.odkAttemptScore.create({ data: { attemptId: attempt.id, correctCount: 1, wrongCount: 1, blankCount: 0, totalNet: 0.75, scoringVersion: 'synthetic-test', answerKeyHash: 'synthetic-test', scoredById: admin.user.id, publicationStatus: 'PUBLISHED' } });
        }
      }
      const completed = await transition('COMPLETE'); expect(completed.status(), await completed.text()).toBe(200); expect((await current()).status).toBe('COMPLETED');

    }
    // Legacy web request key also binds actor + payload after service extraction.
    const webReplay = await request.post('/api/odk/admin/pilot-runs', { headers: admin.headers, data: { name: command.name, userIds: users, requestKey: headers['X-Od-Idempotency-Key'] } }); expect(webReplay.status(), await webReplay.text()).toBe(200); expect((await webReplay.json()).replayed).toBe(true);
    expect((await request.post('/api/odk/admin/pilot-runs', { headers: admin.headers, data: { name: 'Different pilot', userIds: users, requestKey: headers['X-Od-Idempotency-Key'] } })).status()).toBe(409);
  } finally {
    if (seededPilot) await db.odkPilotRun.update({ where: { id: seededPilot.id }, data: { status: seededPilot.status, updatedAt: seededPilot.updatedAt } });
    await db.odkPilotRun.deleteMany({ where: { createdById: { in: users } } }); await db.odkExamAttempt.deleteMany({ where: { examId: { in: exams } } }); await db.odkExam.deleteMany({ where: { id: { in: exams } } }); await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } }); await db.productMembership.deleteMany({ where: { userId: { in: users } } }); await db.session.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
