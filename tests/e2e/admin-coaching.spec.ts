import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../../lib/auth/password";
import { parseAdminCoaching, parseAdminCoachingSession } from "../../lib/mobile-contracts/admin-coaching";
test.skip(process.env.P24_ISOLATED_HTTP_TEST !== "true", "İzole P2.4 HTTP ortamı gerekli");
const db = new PrismaClient();
const mobile = { "x-od-client": "mobile", "x-od-client-version": "1.0.0", "user-agent": "OnlineDershanemMobile/1.0.0 (ios)" };
test('P2.4 gerçek HTTP: rol, step-up, sürüm, eşzamanlı tekrar, görüşme gizliliği', async ({ request, page }) => {
  const users: string[] = [];
  async function user(role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT') {
    const password = randomUUID();
    const row = await db.user.create({ data: { email: `p24-${randomUUID()}@example.com`, role, passwordHash: await hashPassword(password), status: 'ACTIVE', mustChangePassword: false, inviteAcceptedAt: new Date() } });
    users.push(row.id); return { ...row, password };
  }
  const admin = await user('ADMIN'), teacher = await user('TEACHER'), learner = await user('STUDENT'), parent = await user('PARENT');
  const coach = await db.teacherProfile.create({ data: { userId: teacher.id, isCoach: true, coachCapacity: 1 } });
  const student = await db.studentProfile.create({ data: { userId: learner.id } });
  await db.productMembership.create({ data: { userId: learner.id, product: 'OK', source: 'MANUAL' } });
  async function login(u: typeof admin) {
    const response = await request.post('/api/auth/login', { headers: mobile, data: { email: u.email, password: u.password } });
    const data = await response.json(); expect(data.token, JSON.stringify(data)).toBeTruthy(); return { ...mobile, authorization: `Bearer ${data.token}` };
  }
  try {
    expect((await request.get('/api/panel/admin/coaching', { headers: mobile })).status()).toBe(401);
    for (const u of [teacher, learner, parent]) {
      const headers = await login(u);
      for (const path of ['/api/panel/admin/coaching', '/api/panel/admin/coaching/sessions/missing']) expect((await request.get(path, { headers })).status()).toBe(403);
      expect((await request.post('/api/panel/admin/coach-assignments', { headers, data: {} })).status()).toBe(403);
    }
    const headers = await login(admin);
    const response = await request.get('/api/panel/admin/coaching', { headers }); expect(response.status()).toBe(200); expect(response.headers()['cache-control']).toContain('no-store');
    const overview = parseAdminCoaching(await response.json()); if (!overview.ok) throw new Error(overview.error);
    const revision = overview.value.students.find((s) => s.id === student.id)!.revision;
    const input = { studentId: student.id, coachId: coach.id, cadenceDays: '7', expectedRevision: revision, idempotencyKey: randomUUID() };
    expect((await request.post('/api/panel/admin/coach-assignments', { headers, data: input })).status()).toBe(428);
    await db.session.updateMany({ where: { userId: admin.id }, data: { stepUpAt: new Date() } });
    expect((await request.post('/api/panel/admin/coach-assignments', { headers, data: { studentId: student.id, coachId: coach.id } })).status()).toBe(400);
    expect((await request.post('/api/panel/admin/coach-assignments', { headers, data: { ...input, cadenceDays: '0' } })).status()).toBe(400);
    const results = await Promise.all([1, 2].map(() => request.post('/api/panel/admin/coach-assignments', { headers, data: input })));
    for (const result of results) expect(result.status(), await result.text()).toBe(200);
    expect((await Promise.all(results.map((r) => r.json()))).filter((r) => r.replayed)).toHaveLength(1);
    expect((await request.post('/api/panel/admin/coach-assignments', { headers, data: { ...input, idempotencyKey: randomUUID() } })).status()).toBe(409);
    expect((await request.post('/api/panel/admin/coach-assignments', { headers, data: { ...input, cadenceDays: '14' } })).status()).toBe(409);
    const assignment = await db.coachAssignment.findFirstOrThrow({ where: { studentId: student.id, endedAt: null } });
    const session = await db.coachingSession.create({ data: { assignmentId: assignment.id, scheduledAt: new Date(), sharedNote: 'Paylaşılan özet', privateNote: 'P24_PRIVATE' } });
    const detail = await request.get(`/api/panel/admin/coaching/sessions/${session.id}`, { headers }); expect(detail.status()).toBe(200);
    const text = await detail.text(); expect(text).not.toContain('P24_PRIVATE'); expect(parseAdminCoachingSession(JSON.parse(text)).ok).toBe(true);
    expect((await request.get('/api/panel/admin/coaching/sessions/missing', { headers })).status()).toBe(404);
    await page.goto('/giris');
    await page.getByRole('textbox', { name: 'E-posta' }).fill(admin.email);
    await page.getByLabel('Şifre').fill(admin.password);
    await page.getByRole('button', { name: /^Giriş Yap$/ }).click();
    await page.waitForURL(/\/panel\//);
    await db.session.updateMany({ where: { userId: admin.id }, data: { stepUpAt: new Date() } });
    await page.goto(`/panel/yonetim/kocluk?kuyruk=geciken&onizle=ata:${student.id}`);
    await expect(page.getByRole('heading', { name: 'Koçluk operasyonu' })).toBeVisible();
    await page.locator(`input[name="coachId"][value="${coach.id}"]:visible`).check();
    await page.locator('input[name="cadenceDays"]:visible').fill('14');
    await page.getByRole('button', { name: 'Devret', exact: true }).click();
    await expect(page.getByText('Koç ataması kaydedildi.')).toBeVisible();
    expect((await db.coachAssignment.findFirstOrThrow({ where: { studentId: student.id, endedAt: null } })).cadenceDays).toBe(14);

  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await db.coachingSession.deleteMany({ where: { assignment: { studentId: student.id } } });
    await db.coachAssignment.deleteMany({ where: { studentId: student.id } });
    await db.productMembership.deleteMany({ where: { userId: { in: users } } });
    await db.studentProfile.deleteMany({ where: { userId: { in: users } } });
    await db.teacherProfile.deleteMany({ where: { userId: { in: users } } });
    await db.session.deleteMany({ where: { userId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
