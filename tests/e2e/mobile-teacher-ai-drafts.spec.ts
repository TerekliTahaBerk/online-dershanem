import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseTeacherAiDrafts } from '../../lib/mobile-contracts/teacher-ai-drafts';

test('T14 scoped safe sources, atomic create/review retries, edited approval and no automatic publication', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated DB and teacherAiDrafts flag required');
  const db = new PrismaClient(); const users: string[] = []; let groupId: string | undefined;
  async function teacher() {
    const u = await db.user.create({ data: { role: 'TEACHER', email: `ai-http-${randomUUID()}@example.com`, status: 'ACTIVE', passwordHash: 'unused', inviteAcceptedAt: new Date(), mustChangePassword: false } }); users.push(u.id);
    const token = randomBytes(32).toString('base64url'); await db.session.create({ data: { userId: u.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000), mfaVerifiedAt: new Date() } });
    return { u, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const owner = await teacher(), foreign = await teacher();
    const learner = await db.user.create({ data: { email: `ai-student-${randomUUID()}@example.com`, fullName: 'Ada Öğrenci', role: 'STUDENT', passwordHash: 'unused', status: 'ACTIVE' } }); users.push(learner.id);
    const student = await db.studentProfile.create({ data: { userId: learner.id } });
    const group = await db.group.create({ data: { teacherId: owner.u.id, name: 'Taslak', subject: 'Matematik' } }); groupId = group.id;
    await db.enrollment.create({ data: { studentId: student.id, groupId } });
    const lesson = await db.lesson.create({ data: { groupId, teacherId: owner.u.id, title: 'Ada Öğrenci ile kesirler', startsAt: new Date(), endsAt: new Date(Date.now() + 3600000) } });
    await db.lessonNote.create({ data: { lessonId: lesson.id, topic: 'Kesirlerde toplama', note: 'Ada Öğrenci ada@example.com ile ortak tekrar', nextGoal: 'İki örnek açıklamak' } });
    const privateNote = await db.lessonNote.create({ data: { lessonId: lesson.id, studentId: student.id, topic: 'PRIVATE_CHILD_NOTE' } });
    const path = '/api/panel/staff/teacher/ai-drafts';
    async function read() { const r = await request.get(path, { headers: owner.headers }); expect(r.status(), await r.text()).toBe(200); expect(r.headers()['cache-control']).toContain('no-store'); const p = parseTeacherAiDrafts(await r.json()); if (!p.ok) throw new Error(p.error); return p.value; }
    const initial = await read(); expect(initial.lessons).toHaveLength(1); expect(initial.drafts).toEqual([]);
    expect((await (await request.get(path, { headers: foreign.headers })).json()).lessons).toEqual([]);
    const create = { operation: 'create', lessonId: lesson.id, taskType: 'ASSIGNMENT' };
    const headers = { ...owner.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': initial.lessons[0].revision };
    expect((await request.post(path, { headers: owner.headers, data: create })).status()).toBe(400);
    expect((await request.post(path, { headers: { ...headers, ...foreign.headers }, data: create })).status()).toBe(404);
    await db.lessonNote.update({ where: { id: privateNote.id }, data: { note: 'PRIVATE_UPDATED' } });
    expect((await read()).lessons[0].revision).toBe(initial.lessons[0].revision);
    const responses = await Promise.all([request.post(path, { headers, data: create }), request.post(path, { headers, data: create })]);
    for (const r of responses) expect(r.status(), await r.text()).toBe(200);
    const id = (await responses[0].json()).id;
    expect((await (await request.post(path, { headers, data: create })).json()).replayed).toBe(true);
    expect((await request.post(path, { headers, data: { ...create, taskType: 'MINI_CHECK' } })).status()).toBe(409);
    expect(await db.teacherAiDraft.count({ where: { teacherId: owner.u.id } })).toBe(1);
    let queue = await read(); const draft = queue.drafts.find((d) => d.id === id)!; expect(draft.status).toBe('DRAFT'); expect(['STUB', 'FALLBACK']).toContain(draft.provider);
    expect(JSON.stringify(draft)).not.toContain('PRIVATE_CHILD_NOTE'); expect(JSON.stringify(draft.originalContent)).not.toContain('Ada Öğrenci');
    expect(await db.assignment.count({ where: { groupId } })).toBe(0);
    const reviewHeaders = { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': draft.revision };
    expect((await request.post(path, { headers: reviewHeaders, data: { operation: 'review', id, input: { action: 'APPROVE', expectedVersion: draft.version } } })).status()).toBe(400);
    const content = { title: draft.originalContent.title, body: draft.originalContent.body, checkPrompt: draft.originalContent.checkPrompt, successCriteria: draft.originalContent.successCriteria };
    const approval = { operation: 'review', id, input: { action: 'APPROVE', expectedVersion: draft.version, content: { ...content, title: 'HUMAN_EDIT_APPROVED_TITLE' } } };
    const approvals = await Promise.all([request.post(path, { headers: reviewHeaders, data: approval }), request.post(path, { headers: reviewHeaders, data: approval })]);
    for (const r of approvals) expect(r.status(), await r.text()).toBe(200);
    expect((await (await request.post(path, { headers: reviewHeaders, data: approval })).json()).replayed).toBe(true);
    expect((await request.post(path, { headers: { ...reviewHeaders, 'X-Od-Idempotency-Key': randomUUID() }, data: approval })).status()).toBe(409);
    queue = await read(); const approved = queue.drafts.find((d) => d.id === id)!; expect(approved.status).toBe('APPROVED'); expect(approved.version).toBe(2); expect(approved.reviewedContent?.title).toBe('HUMAN_EDIT_APPROVED_TITLE'); expect(approved.reviewedContent?.citations).toEqual(draft.originalContent.citations);
    expect(await db.assignment.count({ where: { groupId } })).toBe(0); expect(await db.notification.count({ where: { userId: learner.id } })).toBe(0);
    const audits = await db.auditLog.findMany({ where: { actorUserId: owner.u.id } }); expect(JSON.stringify(audits.map((a) => a.payload))).not.toContain('HUMAN_EDIT_APPROVED_TITLE'); expect(JSON.stringify(audits.map((a) => a.payload))).not.toContain('PRIVATE_CHILD_NOTE');
    for (const action of ['FLAG', 'REJECT']) {
      const view = await read(); const h = { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': view.lessons[0].revision };
      const r = await request.post(path, { headers: h, data: { ...create, taskType: 'MINI_CHECK' } }); expect(r.status(), await r.text()).toBe(200); const nextId = (await r.json()).id;
      const nextDraft = (await read()).drafts.find((d) => d.id === nextId)!;
      const reviewed = await request.post(path, { headers: { ...h, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': nextDraft.revision }, data: { operation: 'review', id: nextId, input: { action, expectedVersion: nextDraft.version, ...(action === 'FLAG' ? { flagReason: 'FACTUAL_ERROR' } : {}) } } }); expect(reviewed.status(), await reviewed.text()).toBe(200);
      expect((await db.teacherAiDraft.findUniqueOrThrow({ where: { id: nextId } })).status).toBe(action === 'FLAG' ? 'FLAGGED' : 'REJECTED');
    }
    // Web uses the same scoped generator and rejects request-key payload changes.
    const webInput = { lessonId: lesson.id, taskType: 'MINI_CHECK', requestKey: randomUUID() };
    const web = await request.post('/api/panel/ai-drafts', { headers: owner.headers, data: webInput }); expect(web.status(), await web.text()).toBe(200);
    expect((await (await request.post('/api/panel/ai-drafts', { headers: owner.headers, data: webInput })).json()).replayed).toBe(true);
    expect((await request.post('/api/panel/ai-drafts', { headers: owner.headers, data: { ...webInput, taskType: 'ASSIGNMENT' } })).status()).toBe(409);
    await db.group.update({ where: { id: groupId }, data: { isActive: false } });
    expect((await read()).drafts).toEqual([]);
    expect((await request.post(path, { headers, data: create })).status()).toBe(404);
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } }); if (groupId) await db.group.delete({ where: { id: groupId } });
    await db.studentProfile.deleteMany({ where: { userId: { in: users } } }); await db.session.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
