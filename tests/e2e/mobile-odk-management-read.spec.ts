import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { defaultOdkPackagePolicy } from '../../lib/odk/product-contract';
import { parseOdkManagementHome, parseOdkManagementPackages } from '../../lib/mobile-contracts/odk-management-read';

test('P4 management reads enforce role permissions, private projections and read-only packages', async ({ request }) => {
  test.skip(!process.env.DATABASE_URL, 'Isolated DB required');
  const enforce = process.env.P4_MANAGEMENT_ENFORCE === 'true';
  const db = new PrismaClient(); const users: string[] = []; let packageId: string | undefined, examId: string | undefined;
  async function actor(role: 'ADMIN' | 'TEACHER' | 'STUDENT') {
    const user = await db.user.create({ data: { role, email: `odk-read-${randomUUID()}@example.com`, status: 'ACTIVE', passwordHash: 'unused', mustChangePassword: false, inviteAcceptedAt: new Date() } }); users.push(user.id);
    const token = randomBytes(32).toString('base64url'); await db.session.create({ data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000), mfaVerifiedAt: new Date() } });
    return { user, headers: { authorization: `Bearer ${token}`, 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0' } };
  }
  try {
    const admin = await actor('ADMIN'), editor = await actor('TEACHER'), manager = await actor('TEACHER'), learner = await actor('STUDENT'), unassigned = await actor('TEACHER');
    const product = await db.product.findUniqueOrThrow({ where: { code: 'ODK' } });
    await db.productStaffAssignment.create({ data: { userId: editor.user.id, productId: product.id, role: 'EXAM_EDITOR' } });
    const grant = await db.productStaffAssignment.create({ data: { userId: manager.user.id, productId: product.id, role: 'PRODUCT_MANAGER' } });
    const exam = await db.odkExam.create({ data: { title: 'HTTP paket denemesi', slug: `http-read-${randomUUID()}`, family: 'LGS', createdById: admin.user.id, meetUrl: 'https://secret.invalid/DO_NOT_RETURN' } }); examId = exam.id;
    const pkg = await db.odkPackage.create({ data: { title: 'HTTP paket sözleşmesi', slug: `http-read-${randomUUID()}`, priceCents: 12345, contractPolicy: defaultOdkPackagePolicy } }); packageId = pkg.id;
    await db.odkPackageExam.create({ data: { packageId: pkg.id, examId: exam.id } });
    const home = '/api/panel/odk/management/home', packages = '/api/panel/odk/management/packages';
    for (const path of [home, packages]) {
      expect((await request.get(path)).status()).toBe(401);
      expect((await request.get(path, { headers: learner.headers })).status()).toBe(403);
      expect([403, 404]).toContain((await request.get(path, { headers: unassigned.headers })).status());
      const response = await request.get(path, { headers: admin.headers }); expect(response.status(), await response.text()).toBe(200); expect(response.headers()['cache-control']).toContain('no-store'); expect(await response.text()).not.toContain('DO_NOT_RETURN');
    }
    const homeResponse = await request.get(home, { headers: admin.headers }); const overview = parseOdkManagementHome(await homeResponse.json()); expect(overview.ok).toBe(true); if (!overview.ok) throw new Error(overview.error); expect(overview.value.pilotBlocked).not.toBeNull(); expect(overview.value.modules.some((m) => m.id === 'odk-packages')).toBe(true);
    const parsed = parseOdkManagementPackages(await (await request.get(packages, { headers: admin.headers })).json()); expect(parsed.ok).toBe(true); if (!parsed.ok) throw new Error(parsed.error);
    const row = parsed.value.rows.find((p) => p.id === pkg.id)!; expect(row.priceCents).toBe(12345); expect(row.policy?.rights.parentReports).toBe(true); expect(row.exams[0].id).toBe(exam.id); expect(row.exams[0]).not.toHaveProperty('meetUrl'); expect(row).not.toHaveProperty('orders');
    const editorHome = await request.get(home, { headers: editor.headers }); expect(editorHome.status(), await editorHome.text()).toBe(enforce ? 200 : 403);
    expect((await request.get(packages, { headers: editor.headers })).status()).toBe(403);
    const managerPackages = await request.get(packages, { headers: manager.headers }); expect(managerPackages.status(), await managerPackages.text()).toBe(enforce ? 200 : 403);
    if (enforce) { const data = parseOdkManagementHome(await editorHome.json()); if (!data.ok) throw new Error(data.error); expect(data.value.pilotBlocked).toBeNull(); expect(data.value.awaitingReleaseCount).toBeNull(); expect(data.value.modules.map((m) => m.id)).toEqual(['odk-exams']); expect(data.value.live).toEqual([]); }
    // No write handler exists on either projection.
    expect((await request.post(packages, { headers: admin.headers, data: {} })).status()).toBe(405);
    expect((await request.post(home, { headers: admin.headers, data: {} })).status()).toBe(405);
    await db.productStaffAssignment.update({ where: { id: grant.id }, data: { revokedAt: new Date() } });
    expect((await request.get(packages, { headers: manager.headers })).status()).toBe(403);
  } finally {
    if (packageId) await db.odkPackage.delete({ where: { id: packageId } }); if (examId) await db.odkExam.delete({ where: { id: examId } });
    await db.productStaffAssignment.deleteMany({ where: { userId: { in: users } } }); await db.session.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
