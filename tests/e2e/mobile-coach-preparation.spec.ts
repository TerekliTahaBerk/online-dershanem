import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseCoachPreparation } from '../../lib/mobile-contracts/coach-preparation';

test('T20 coach scope, six commands, revisions, private notes and atomic concurrent replay', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated DB and adaptivePlan flag required');
  const db = new PrismaClient(); const users: string[] = []; let templateId: string | undefined;
  async function user(role: 'TEACHER' | 'STUDENT') {
    const u = await db.user.create({ data: { role, email: `prep-${randomUUID()}@example.com`, fullName: role, status: 'ACTIVE', passwordHash: 'unused', mustChangePassword: false, inviteAcceptedAt: new Date() } }); users.push(u.id); return u;
  }
  async function coach() {
    const u = await user('TEACHER'); const profile = await db.teacherProfile.create({ data: { userId: u.id, isCoach: true } });
    const token = randomBytes(32).toString('base64url'); await db.session.create({ data: { userId: u.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000), mfaVerifiedAt: new Date() } });
    return { u, profile, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const owner = await coach(), foreign = await coach(); const learner = await user('STUDENT');
    const student = await db.studentProfile.create({ data: { userId: learner.id } });
    const membership = await db.productMembership.create({ data: { userId: learner.id, product: 'OK' } });
    const assignment = await db.coachAssignment.create({ data: { coachId: owner.profile.id, studentId: student.id, cadenceDays: 7 } });
    const path = `/api/panel/staff/coach/students/${student.id}/preparation`;
    async function read() {
      const response = await request.get(path, { headers: owner.headers }); expect(response.status(), await response.text()).toBe(200); expect(response.headers()['cache-control']).toContain('no-store');
      const parsed = parseCoachPreparation(await response.json()); if (!parsed.ok) throw new Error(parsed.error); return parsed.value;
    }
    expect((await request.get(path, { headers: foreign.headers })).status()).toBe(404);
    const initial = await read();
    async function command(data: object, concurrent = false) {
      const view = await read(); const headers = { ...owner.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': view.revision };
      const responses = await Promise.all(Array.from({ length: concurrent ? 2 : 1 }, () => request.post(path, { headers, data })));
      for (const r of responses) expect(r.status(), await r.text()).toBe(200);
      const replay = await request.post(path, { headers, data }); expect(replay.status(), await replay.text()).toBe(200); expect((await replay.json()).replayed).toBe(true);
      expect((await request.post(path, { headers: { ...headers, 'X-Od-Idempotency-Key': randomUUID() }, data })).status()).toBe(409);
      return { headers, data, id: (await responses[0].json()).id as string };
    }
    const task = { action: 'task', payload: { title: 'Kısa tekrar', taskKind: 'REVIEW', scheduledFor: initial.weekStart, durationMinutes: 30 } };
    expect((await request.post(path, { headers: owner.headers, data: task })).status()).toBe(400);
    const taskResult = await command(task, true);
    const plan = await db.weeklyPlan.findFirstOrThrow({ where: { studentId: student.id } }); expect(plan.capacityMinutes).toBe(30); expect(await db.weeklyPlanTask.count({ where: { planId: plan.id } })).toBe(1);
    expect((await request.post(path, { headers: { ...taskResult.headers, ...foreign.headers }, data: task })).status()).toBe(404);
    expect((await request.post(path, { headers: taskResult.headers, data: { action: 'goal', payload: { studentId: student.id, kind: 'PLAN_COMPLETION', targetValue: 80 } } })).status()).toBe(409);
    const copied = await command({ action: 'copy', planId: plan.id, payload: { carryOverIncomplete: true } }, true);
    expect(await db.weeklyPlanRevision.count({ where: { planId: copied.id } })).toBe(1);
    const template = await db.weeklyPlanTemplate.create({ data: { code: `prep-${randomUUID()}`, title: 'Başlangıç', isSystem: true, taskDefs: [{ dayOffset: 0, title: 'Şablon tekrarı', taskKind: 'REVIEW', durationMinutes: 20 }] } }); templateId = template.id;
    await command({ action: 'template', templateId: template.id }, true);
    expect(await db.weeklyPlanTask.count({ where: { planId: plan.id } })).toBe(1);
    await command({ action: 'summary', payload: { strengths: 'PRIVATE_STRENGTH', studentVisibleText: 'STUDENT_ONLY', parentVisibleText: 'Veli özeti', publish: true } }, true);
    expect(await db.studentTimelineEvent.count({ where: { studentId: student.id, kind: 'COACH_SUMMARY' } })).toBe(1);
    const goal = await command({ action: 'goal', payload: { studentId: student.id, kind: 'PLAN_COMPLETION', targetValue: 85, nearTermNote: 'Kısa adımlar' } }, true);
    expect(await db.studentGoal.count({ where: { studentId: student.id, archivedAt: null } })).toBe(1);
    await command({ action: 'record', payload: { focus: 'Hafta odağı', sharedNote: 'Paylaşılan', privateNote: 'PRIVATE_SESSION' } }, true);
    expect(await db.coachingSession.count({ where: { assignmentId: assignment.id, status: 'COMPLETED' } })).toBe(1);
    expect(await db.coachingSession.count({ where: { assignmentId: assignment.id, status: 'PLANNED' } })).toBe(1);
    expect(JSON.stringify(await read())).not.toContain('PRIVATE_SESSION');
    const view = await read(); const fresh = { ...owner.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': view.revision };
    const bad = { action: 'goal', payload: { studentId: student.id, kind: 'SUBJECT_NET', subjectName: 'Uydurma', targetValue: 20 } };
    expect((await request.post(path, { headers: fresh, data: bad })).status()).toBe(400);
    expect(await db.auditLog.count({ where: { idempotencyKey: `coach-preparation:${owner.u.id}:${fresh['X-Od-Idempotency-Key']}` } })).toBe(0);
    // Shared web services preserve selected-student behavior and patch omitted fields.
    const webTask = await request.post('/api/panel/kocum/tasks', { headers: owner.headers, data: { ...task.payload, studentId: student.id, weekStart: initial.weekStart } });
    expect(webTask.status(), await webTask.text()).toBe(200);
    expect((await db.weeklyPlan.findUniqueOrThrow({ where: { id: plan.id } })).capacityMinutes).toBe(50);
    const webSummary = await request.post('/api/panel/kocum/summaries', { headers: owner.headers, data: { studentId: student.id, weekStart: initial.weekStart, nextWeekFocus: 'Yeni odak' } });
    expect(webSummary.status(), await webSummary.text()).toBe(200);
    expect((await db.weeklyCoachSummary.findFirstOrThrow({ where: { studentId: student.id } })).parentVisibleText).toBe('Veli özeti');
    expect(await db.studentTimelineEvent.count({ where: { studentId: student.id, kind: 'COACH_SUMMARY' } })).toBe(1);
    // Without parent text, the parent timeline must never receive student-only text.
    const nextWeek = new Date(new Date(initial.weekStart).getTime() + 7 * 86400000).toISOString();
    const studentOnly = await request.post('/api/panel/kocum/summaries', { headers: owner.headers, data: { studentId: student.id, weekStart: nextWeek, studentVisibleText: 'STUDENT_SECRET', publish: true } });
    expect(studentOnly.status(), await studentOnly.text()).toBe(200);
    expect(JSON.stringify(await db.studentTimelineEvent.findMany({ where: { studentId: student.id, visibility: 'PARENT' } }))).not.toContain('STUDENT_SECRET');
    const od = await db.product.findUniqueOrThrow({ where: { code: 'OD' } });
    const otherWeek = new Date(new Date(initial.weekStart).getTime() + 14 * 86400000);
    const otherProductPlan = await db.weeklyPlan.create({ data: { studentId: student.id, productRefId: od.id, weekStart: otherWeek, capacityMinutes: 0, ruleVersion: 'http-test', createdById: owner.u.id } });
    const wrongProductTask = await request.post('/api/panel/kocum/tasks', { headers: owner.headers, data: { ...task.payload, studentId: student.id, scheduledFor: otherWeek.toISOString(), weekStart: otherWeek.toISOString() } });
    expect(wrongProductTask.status()).toBe(409);
    expect((await request.post(`/api/panel/kocum/plans/${otherProductPlan.id}/copy`, { headers: owner.headers, data: {} })).status()).toBe(404);
    expect((await request.post(`/api/panel/kocum/templates/${template.id}/apply`, { headers: owner.headers, data: { studentId: student.id, weekStart: otherWeek.toISOString() } })).status()).toBe(409);
    expect(await db.weeklyPlanTask.count({ where: { planId: otherProductPlan.id } })).toBe(0);
    expect((await db.weeklyPlan.findUniqueOrThrow({ where: { id: otherProductPlan.id } })).version).toBe(1);
    // Ending membership or assignment revokes even a successful receipt.
    await db.productMembership.update({ where: { id: membership.id }, data: { revokedAt: new Date() } });
    expect((await request.post(path, { headers: goal.headers, data: goal.data })).status()).toBe(404);
    await db.productMembership.update({ where: { id: membership.id }, data: { revokedAt: null } });
    await db.coachAssignment.update({ where: { id: assignment.id }, data: { endedAt: new Date() } });
    expect((await request.get(path, { headers: owner.headers })).status()).toBe(404);
    expect((await request.post(path, { headers: taskResult.headers, data: task })).status()).toBe(404);
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await db.studentProfile.deleteMany({ where: { userId: { in: users } } });
    await db.teacherProfile.deleteMany({ where: { userId: { in: users } } });
    if (templateId) await db.weeklyPlanTemplate.delete({ where: { id: templateId } });
    await db.session.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
