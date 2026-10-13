import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { parseOdkManagementExams } from '../../lib/mobile-contracts/odk-management-exams';
test('P4 K02 HTTP: catalog, scoped list, atomic exam/series creation and replay', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated DB required');
  const db = new PrismaClient(), users: string[] = [], exams: string[] = [], series: string[] = [];
  let customFamilyId: string | undefined, curriculumId: string | undefined;
  const path = '/api/panel/odk/management/exams'; const enforce = process.env.P4_MANAGEMENT_ENFORCE === 'true';
  async function actor(role: 'ADMIN' | 'TEACHER' | 'STUDENT', staffRole?: 'EXAM_EDITOR' | 'EXAM_OPERATOR') {
    const user = await db.user.create({ data: { role, email: `odk-create-${randomUUID()}@example.com`, status: 'ACTIVE', passwordHash: 'unused', mustChangePassword: false, inviteAcceptedAt: new Date() } }); users.push(user.id);
    if (staffRole) await db.productStaffAssignment.create({ data: { userId: user.id, productId: (await db.product.findUniqueOrThrow({ where: { code: 'ODK' } })).id, role: staffRole } });
    const token = randomBytes(32).toString('base64url'); await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000), mfaVerifiedAt: new Date() } });
    return { user, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const admin = await actor('ADMIN'), editor = await actor('TEACHER', 'EXAM_EDITOR'), operator = await actor('TEACHER', 'EXAM_OPERATOR'), learner = await actor('STUDENT');
    expect((await request.get(path)).status()).toBe(401); expect((await request.get(path, { headers: learner.headers })).status()).toBe(403);
    const editorRead = await request.get(path, { headers: editor.headers }); expect(editorRead.status(), await editorRead.text()).toBe(enforce ? 200 : 403);
    const operatorRead = await request.get(path, { headers: operator.headers }); expect(operatorRead.status(), await operatorRead.text()).toBe(enforce ? 200 : 403);
    if (enforce) { expect((await operatorRead.json()).canCreate).toBe(false); expect((await operatorRead.json()).templates).toEqual([]); }
    const response = await request.get(path, { headers: admin.headers }); expect(response.status(), await response.text()).toBe(200); expect(response.headers()['cache-control']).toContain('no-store');
    const parsed = parseOdkManagementExams(await response.json()); expect(parsed.ok).toBe(true); if (!parsed.ok) throw new Error(parsed.error);
    const catalog = parsed.value; expect(catalog.families.some((f) => f.code === 'TYT')).toBe(true); expect(catalog.templates.some((t) => t.code === 'TYT_FULL')).toBe(true);
    const headers = { ...admin.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': catalog.revision };
    const command = { operation: 'exam', input: { examFamilyCode: 'TYT', title: 'HTTP native atomik deneme', slug: `native-${randomUUID()}`, structureMode: 'MATH_ONLY', templateCode: 'TYT_MATH', questionCount: 7, durationMinutes: 35, publisher: 'Test' } };
    expect((await request.post(path, { headers: admin.headers, data: command })).status()).toBe(400);
    expect((await request.post(path, { headers: { ...headers, 'X-Od-Expected-Revision': '0'.repeat(64) }, data: command })).status()).toBe(409);
    expect((await request.post(path, { headers: { ...headers, ...operator.headers }, data: command })).status()).toBe(403);
    const responses = await Promise.all([request.post(path, { headers, data: command }), request.post(path, { headers, data: command })]);
    for (const r of responses) expect(r.status(), await r.text()).toBe(200);
    const bodies = await Promise.all(responses.map((r) => r.json())); expect(bodies[0].id).toBe(bodies[1].id); expect(bodies.map((b) => b.replayed).sort()).toEqual([false, true]); const id = bodies[0].id; exams.push(id);
    expect(await db.odkExam.count({ where: { slug: command.input.slug } })).toBe(1); expect(await db.odkExamVersion.count({ where: { examId: id } })).toBe(1); expect(await db.odkExamQuestion.count({ where: { section: { version: { examId: id } } } })).toBe(7);
    expect(await db.auditLog.count({ where: { entityId: id, action: 'odk.exam_created' } })).toBe(1); expect(await db.auditLog.count({ where: { idempotencyKey: `odk-create:${admin.user.id}:${headers['X-Od-Idempotency-Key']}` } })).toBe(1);
    const stored = await db.odkExamVersion.findFirstOrThrow({ where: { examId: id } }); expect(stored.durationMinutes).toBe(35);
    expect((await request.post(path, { headers, data: { ...command, input: { ...command.input, title: 'Changed' } } })).status()).toBe(409);
    const found = await request.get(`${path}?q=${encodeURIComponent(command.input.title)}&gorunum=hazirlik`, { headers: admin.headers }); const row = (await found.json()).rows.find((r: { id: string }) => r.id === id); expect(row.assigned).toBe(0); expect(row).not.toHaveProperty('correctOption'); expect(row).not.toHaveProperty('meetUrl');
    const seriesCommand = { operation: 'series', input: { examFamilyCode: 'LGS', title: 'HTTP native seri', slug: `native-series-${randomUUID()}`, academicYear: 2026, classLevel: '8' } };
    const seriesHeaders = { ...admin.headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': catalog.revision };
    const created = await request.post(path, { headers: seriesHeaders, data: seriesCommand }); expect(created.status(), await created.text()).toBe(200); const seriesId = (await created.json()).id; series.push(seriesId);
    expect((await request.post(path, { headers: seriesHeaders, data: seriesCommand })).status()).toBe(200);
    // Old catalog cannot silently attach a newly changed series selection.
    expect((await request.post(path, { headers: { ...headers, 'X-Od-Idempotency-Key': randomUUID() }, data: { ...command, input: { ...command.input, slug: `stale-${randomUUID()}` } } })).status()).toBe(409);
    const fresh = await (await request.get(path, { headers: admin.headers })).json();
    const mismatch = await request.post(path, { headers: { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': fresh.revision }, data: { ...command, input: { ...command.input, seriesId, slug: `mismatch-${randomUUID()}` } } }); expect(mismatch.status(), await mismatch.text()).toBe(400);
    // Existing web handlers share creation/audit semantics.
    const web = await request.post('/api/odk/admin/exams', { headers: admin.headers, data: { ...command.input, title: 'Web regression', slug: `web-${randomUUID()}`, questionCount: 3 } }); expect(web.status(), await web.text()).toBe(201); const webId = (await web.json()).exam.id; exams.push(webId); expect(await db.odkExamQuestion.count({ where: { section: { version: { examId: webId } } } })).toBe(3);
    const familyCode = `HTTP_${randomUUID().replaceAll('-', '').toUpperCase()}`;
    const customFamily = await db.examFamily.create({ data: { code: familyCode, name: 'HTTP katalog ailesi', productId: (await db.product.findUniqueOrThrow({ where: { code: 'ODK' } })).id } }); customFamilyId = customFamily.id;
    const curriculum = await db.curriculumVersion.create({ data: { code: `http-${randomUUID()}`, title: 'HTTP katalog müfredatı', academicYear: 2026, examFamilyRefId: customFamily.id, createdById: admin.user.id, subjects: { create: [{ code: 'A', name: 'Alan A', position: 0 }, { code: 'B', name: 'Alan B', position: 1 }] } } }); curriculumId = curriculum.id;
    const registryCatalog = await (await request.get(path, { headers: admin.headers })).json(); expect(registryCatalog.families.some((f: { code: string; legacy: boolean }) => f.code === familyCode && !f.legacy)).toBe(true);
    const registryHeaders = { ...headers, 'X-Od-Idempotency-Key': randomUUID(), 'X-Od-Expected-Revision': registryCatalog.revision };
    const registryCommand = { operation: 'exam', input: { examFamilyCode: familyCode, title: 'Katalog native denemesi', slug: `registry-${randomUUID()}`, structureMode: 'FULL_TEMPLATE', templateCode: null } };
    const registry = await request.post(path, { headers: registryHeaders, data: registryCommand }); expect(registry.status(), await registry.text()).toBe(200); const registryId = (await registry.json()).id; exams.push(registryId);
    expect(await db.odkExamSection.count({ where: { version: { examId: registryId } } })).toBe(2); expect(await db.odkExamQuestion.count({ where: { section: { version: { examId: registryId } } } })).toBe(4);
    const webSeries = await request.post('/api/odk/admin/exam-series', { headers: admin.headers, data: { ...seriesCommand.input, slug: `web-series-${randomUUID()}` } }); expect(webSeries.status(), await webSeries.text()).toBe(201); series.push((await webSeries.json()).series.id);
    await db.productStaffAssignment.updateMany({ where: { userId: editor.user.id }, data: { revokedAt: new Date() } });
    expect((await request.post(path, { headers: { ...headers, ...editor.headers }, data: command })).status()).toBe(403);
  } finally {
    await db.odkExam.deleteMany({ where: { id: { in: exams } } }); await db.odkExamSeries.deleteMany({ where: { id: { in: series } } });
    if (curriculumId) await db.curriculumVersion.delete({ where: { id: curriculumId } }); if (customFamilyId) await db.examFamily.delete({ where: { id: customFamilyId } });
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } }); await db.productStaffAssignment.deleteMany({ where: { userId: { in: users } } }); await db.session.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
