import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createTeacherAiDraft } from '../../lib/panel/teacher-ai-drafts-server';
import { fallbackTeacherDraft } from '../../lib/teacher-ai';
import { createIntegrationPrismaClient, integration } from './integration-utils';
const db = createIntegrationPrismaClient(), second = createIntegrationPrismaClient();
integration('teacher AI serializes duplicate provider calls before generation and atomically audits one draft', async () => {
  const teacher = await db.user.create({ data: { role: 'TEACHER', email: `ai-lock-${randomUUID()}@example.com`, passwordHash: 'unused', status: 'ACTIVE' } });
  const group = await db.group.create({ data: { teacherId: teacher.id, name: 'AI test', subject: 'Matematik' } });
  const lesson = await db.lesson.create({ data: { teacherId: teacher.id, groupId: group.id, title: 'Kesirler', startsAt: new Date(), endsAt: new Date(Date.now() + 3600000) } });
  let calls = 0;
  const generate: Parameters<typeof createTeacherAiDraft>[3] = async (source) => {
    calls++; await new Promise((resolve) => setTimeout(resolve, 60));
    return { content: fallbackTeacherDraft(source), provider: 'STUB', modelName: 'test-only', fallbackReason: 'E2E_STUB', latencyMs: 60, inputTokens: null, outputTokens: null, estimatedCostMicrousd: 0 };
  };
  try {
    const input = { lessonId: lesson.id, taskType: 'ASSIGNMENT' as const, requestKey: randomUUID() };
    const responses = await Promise.all([createTeacherAiDraft(input, teacher.id, db, generate), createTeacherAiDraft(input, teacher.id, second, generate)]);
    const bodies = await Promise.all(responses.map((r) => r.json()));
    assert.ok(responses.every((r) => r.status === 200)); assert.equal(calls, 1); assert.equal(bodies[0].draft.id, bodies[1].draft.id);
    assert.equal(await db.teacherAiDraft.count({ where: { teacherId: teacher.id } }), 1);
    assert.equal(await db.auditLog.count({ where: { actorUserId: teacher.id, action: 'teacher_ai_draft.generated' } }), 1);
    const conflict = await createTeacherAiDraft({ ...input, taskType: 'MINI_CHECK' }, teacher.id, db, generate); assert.equal(conflict.status, 409); assert.equal(calls, 1);
    const note = await db.lessonNote.create({ data: { lessonId: lesson.id, topic: 'İlk kaynak' } });
    const changedSource: Parameters<typeof createTeacherAiDraft>[3] = async (source) => {
      await second.lessonNote.update({ where: { id: note.id }, data: { topic: 'Değişen kaynak' } });
      return { content: fallbackTeacherDraft(source), provider: 'STUB', modelName: 'test-only', fallbackReason: 'E2E_STUB', latencyMs: 0, inputTokens: null, outputTokens: null, estimatedCostMicrousd: 0 };
    };
    const stale = await createTeacherAiDraft({ ...input, requestKey: randomUUID() }, teacher.id, db, changedSource);
    assert.equal(stale.status, 409); assert.equal(await db.teacherAiDraft.count({ where: { teacherId: teacher.id } }), 1);
    await db.group.update({ where: { id: group.id }, data: { isActive: false } });
    assert.equal((await createTeacherAiDraft(input, teacher.id, db, generate)).status, 404); assert.equal(calls, 1);
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: teacher.id } }); await db.group.delete({ where: { id: group.id } }); await db.user.delete({ where: { id: teacher.id } }); await Promise.all([db.$disconnect(), second.$disconnect()]);
  }
});
