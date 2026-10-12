import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../../lib/auth/password';
import { parseAdminOrder, parseAdminOrders } from '../../lib/mobile-contracts/admin-orders';
test.skip(process.env.P26_ISOLATED_HTTP_TEST !== 'true', 'İzole P2.6 HTTP ortamı gerekli');
const db = new PrismaClient();
const mobile = { 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0', 'user-agent': 'OnlineDershanemMobile/1.0.0 (ios)' };
test('P2.6 gerçek HTTP ve web: rol, özel önbellek, girdi, step-up, tekrar ve eski sürüm', async ({ request, page }) => {
  const users: string[] = [];
  async function user(role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT') {
    const password = randomUUID(); const row = await db.user.create({ data: { email: `p26-${randomUUID()}@example.com`, role, passwordHash: await hashPassword(password), status: 'ACTIVE', mustChangePassword: false, inviteAcceptedAt: new Date() } }); users.push(row.id); return { ...row, password };
  }
  const admin = await user('ADMIN'), teacher = await user('TEACHER'), student = await user('STUDENT'), parent = await user('PARENT');
  const order = await db.odOrder.create({ data: { packageName: `P26-${randomUUID()}`, status: 'PAID', subtotalCents: 10000, totalCents: 10000, userId: student.id, provisioningStatus: 'MANUAL_REVIEW', buyerInfo: { tc: 'P26_PRIVATE_BUYER' }, onboarding: { create: {} } } });
  async function login(u: typeof admin) { const response = await request.post('/api/auth/login', { headers: mobile, data: { email: u.email, password: u.password } }); const body = await response.json(); expect(body.token, JSON.stringify(body)).toBeTruthy(); return { ...mobile, authorization: `Bearer ${body.token}` }; }
  const path = `/api/panel/admin/orders/${order.id}`;
  try {
    expect((await request.get('/api/panel/admin/orders', { headers: mobile })).status()).toBe(401);
    for (const u of [teacher, student, parent]) { const headers = await login(u); for (const url of ['/api/panel/admin/orders', path, `${path}/provisioning-retry`]) expect((await request.get(url, { headers })).status()).toBe(403); expect((await request.post(`${path}/provisioning-retry`, { headers, data: {} })).status()).toBe(403); }
    const headers = await login(admin);
    const list = await request.get(`/api/panel/admin/orders?q=${order.packageName}&filtre=sorun`, { headers }); expect(list.status()).toBe(200); expect(list.headers()['cache-control']).toContain('no-store'); expect(parseAdminOrders(await list.json()).ok).toBe(true);
    const response = await request.get(path, { headers }); expect(response.status()).toBe(200); expect(response.headers()['cache-control']).toContain('private'); const text = await response.text(); expect(text).not.toContain('P26_PRIVATE_BUYER'); const detail = parseAdminOrder(JSON.parse(text)); if (!detail.ok) throw new Error(detail.error);
    expect((await request.get('/api/panel/admin/orders?sayfa=0', { headers })).status()).toBe(400); expect((await request.get('/api/panel/admin/orders/missing', { headers })).status()).toBe(404);
    const input = { idempotencyKey: randomUUID(), expectedRevision: detail.value.order.revision };
    expect((await request.post(`${path}/provisioning-retry`, { headers, data: input })).status()).toBe(428);
    await db.session.updateMany({ where: { userId: admin.id }, data: { stepUpAt: new Date() } });
    expect((await request.post(`${path}/provisioning-retry`, { headers, data: {} })).status()).toBe(400);
    expect((await request.post('/api/panel/admin/orders/missing/provisioning-retry', { headers, data: input })).status()).toBe(404);
    const first = await request.post(`${path}/provisioning-retry`, { headers, data: input }); expect(first.status(), await first.text()).toBe(200); const firstBody = await first.json();
    const again = await request.post(`${path}/provisioning-retry`, { headers, data: input }); expect(again.status()).toBe(200); expect(await again.json()).toEqual(firstBody);
    expect((await request.post(`${path}/provisioning-retry`, { headers, data: { ...input, idempotencyKey: randomUUID() } })).status()).toBe(409);
    expect((await db.odOrder.findUniqueOrThrow({ where: { id: order.id } })).provisioningAttempts).toBe(1);
    await page.goto('/giris'); await page.getByRole('textbox', { name: 'E-posta' }).fill(admin.email); await page.getByLabel('Şifre').fill(admin.password); await page.getByRole('button', { name: /^Giriş Yap$/ }).click(); await page.waitForURL(/\/panel\//);
    await db.session.updateMany({ where: { userId: admin.id }, data: { stepUpAt: new Date() } });
    await page.goto(`/panel/yonetim/siparisler/${order.id}`); await expect(page.getByRole('heading', { name: order.packageName })).toBeVisible(); await page.getByRole('button', { name: 'Erişim açmayı yeniden dene' }).click();
    await expect.poll(async () => (await db.odOrder.findUniqueOrThrow({ where: { id: order.id } })).provisioningAttempts).toBe(2); expect((await db.odOrder.findUniqueOrThrow({ where: { id: order.id } })).status).toBe('PAID');
  } finally {
    await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } }); await db.odOnboardingTransition.deleteMany({ where: { onboarding: { orderId: order.id } } }); await db.odOnboarding.deleteMany({ where: { orderId: order.id } }); await db.odOrder.delete({ where: { id: order.id } }); await db.session.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect();
  }
});
