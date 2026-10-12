import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma as db } from '@/lib/prisma';
import { loadAdminAnalytics, loadAdminAudit, loadAdminFeatures, loadAdminQualityProjection } from '@/lib/panel/admin-system-server';
import { parseAdminAnalytics, parseAdminAudit, parseAdminFeatures, parseAdminQuality } from '@/lib/mobile-contracts/admin-system';
import { integration } from './integration-utils';
integration('P2.8 gerçek DB: audit filtresi ve hassas payload sınırı, özellik envanteri ve analitik sözleşmesi', async () => {
 const actor = await db.user.create({ data: { email: `p28-${randomUUID()}@example.com`, fullName: 'P28 Yönetici', role: 'ADMIN', passwordHash: 'P28_PRIVATE_PASSWORD' } });
 const row = await db.auditLog.create({ data: { actorUserId: actor.id, actorType: 'USER', entityType: 'User', entityId: actor.id, action: 'p28.test', summary: 'P28 test kaydı', payload: { secret: 'P28_PRIVATE_PAYLOAD' } } });
 try {
   const audit = await loadAdminAudit('User'); assert.equal(parseAdminAudit(audit).ok, true); assert.ok(audit.logs.some((l) => l.id === row.id && l.actor === actor.fullName)); assert.ok(!JSON.stringify(audit).includes('P28_PRIVATE'));
   assert.ok(!(await loadAdminAudit('Group')).logs.some((l) => l.id === row.id));
   const features = await loadAdminFeatures(); assert.equal(parseAdminFeatures(features).ok, true); assert.ok(features.features.length > 0); assert.ok(features.logs.length <= 12); assert.ok(!JSON.stringify(features).includes('P28_PRIVATE'));
   const analytics = await loadAdminAnalytics({ from: '2026-09-01', to: '2026-09-30', product: 'OD', examType: 'LGS', groupId: `missing-${randomUUID()}` });
   assert.equal(parseAdminAnalytics(analytics).ok, true); assert.equal(analytics.filters.product, 'OD'); assert.equal(analytics.filters.examType, 'LGS'); assert.ok(analytics.metrics.some((m) => m.key === 'lead_count')); assert.ok(analytics.gains.every((g) => g.status === 'INSUFFICIENT_SAMPLE'));
 } finally { await db.auditLog.delete({ where: { id: row.id } }); await db.user.delete({ where: { id: actor.id } }); }
});
integration('P2.8 kalite projeksiyonu küçük kohortun sayı, kapsama ve tazeliğini DB sınırında gizler', async () => {
 const actor = await db.user.create({ data: { email: `p28-${randomUUID()}@example.com`, role: 'STUDENT', passwordHash: 'unused', studentProfile: { create: {} } }, include: { studentProfile: true } });
 const now = new Date();
 try {
   for (const days of [20, 1]) await db.mockExam.create({ data: { studentId: actor.studentProfile!.id, createdById: actor.id, exam: 'YDT', takenAt: new Date(now.getTime() - days * 86400000), title: 'P28_PRIVATE_EXAM', sections: { create: { subjectCode: 'english', subjectName: 'English', questionCount: 80, correctCount: 40, incorrectCount: 10, blankCount: 30 } } } });
   const quality = await loadAdminQualityProjection(); assert.equal(parseAdminQuality(quality).ok, true); assert.ok(!JSON.stringify(quality).includes(actor.id)); assert.ok(!JSON.stringify(quality).includes('P28_PRIVATE_EXAM'));
   for (const g of quality.gains.filter((g) => g.status === 'INSUFFICIENT_SAMPLE')) assert.deepEqual(Object.keys(g).sort(), ['exam', 'status']);
 } finally { await db.mockExam.deleteMany({ where: { createdById: actor.id } }); await db.studentProfile.delete({ where: { userId: actor.id } }); await db.user.delete({ where: { id: actor.id } }); }
});
