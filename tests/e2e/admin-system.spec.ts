import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../../lib/auth/password';
import { parseAdminAnalytics, parseAdminAudit, parseAdminFeatures, parseAdminQuality } from '../../lib/mobile-contracts/admin-system';
test.skip(process.env.P28_ISOLATED_HTTP_TEST !== 'true', 'İzole P2.8 HTTP ortamı gerekli');
const db = new PrismaClient();
const mobile = { 'x-od-client': 'mobile', 'x-od-client-version': '1.0.0', 'user-agent': 'OnlineDershanemMobile/1.0.0 (ios)' };
test('P2.8 gerçek HTTP: dört okuma ucunda rol sınırı, private/no-store ve sözleşme; web okumaları korunur', async ({ request, page }) => {
 const users: string[] = [];
 const endpoints = ['/api/panel/admin/analytics', '/api/panel/admin/audit', '/api/panel/admin/features', '/api/panel/admin/quality'];
 async function user(role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT') {
  const password = randomUUID(); const row = await db.user.create({ data: { email: `p28-${randomUUID()}@example.com`, role, passwordHash: await hashPassword(password), status: 'ACTIVE', mustChangePassword: false, inviteAcceptedAt: new Date() } }); users.push(row.id); return { ...row, password };
 }
 async function login(u: Awaited<ReturnType<typeof user>>) {
  const response = await request.post('/api/auth/login', { headers: mobile, data: { email: u.email, password: u.password } }); const body = await response.json(); expect(body.token, JSON.stringify(body)).toBeTruthy(); return { ...mobile, authorization: `Bearer ${body.token}` };
 }
 try {
  for (const endpoint of endpoints) expect((await request.get(endpoint, { headers: mobile })).status()).toBe(401);
  for (const role of ['TEACHER', 'STUDENT', 'PARENT'] as const) { const headers = await login(await user(role)); for (const endpoint of endpoints) expect((await request.get(endpoint, { headers })).status()).toBe(403); }
  const admin = await user('ADMIN'); const headers = await login(admin);
  const parsers = [parseAdminAnalytics, parseAdminAudit, parseAdminFeatures, parseAdminQuality];
  for (const [i, endpoint] of endpoints.entries()) {
   const response = await request.get(endpoint, { headers }); expect(response.status(), await response.text()).toBe(200); expect(response.headers()['cache-control']).toContain('private'); expect(response.headers()['cache-control']).toContain('no-store'); expect(parsers[i](await response.json()).ok).toBe(true);
  }
  for (const path of ['/api/panel/admin/audit?tur=BAD', '/api/panel/admin/analytics?product=BAD', '/api/panel/admin/analytics?from=yesterday', '/api/panel/admin/analytics?unknown=1']) expect((await request.get(path, { headers })).status()).toBe(400);
  await page.goto('/giris'); await page.getByRole('textbox', { name: 'E-posta' }).fill(admin.email); await page.getByLabel('Şifre').fill(admin.password); await page.getByRole('button', { name: /^Giriş Yap$/ }).click(); await page.waitForURL(/\/panel\//);
  for (const [path, heading] of [['/panel/yonetim/analitik/lead_count', 'Lead sayısı'], ['/panel/yonetim/ozellikler', 'Özellik yayını tek yerde görünür.'], ['/panel/yonetim/kayitlar', 'İşlem geçmişi'], ['/panel/yonetim/kalite', 'Öğrenme kalitesini adil bir zeminde görün.']]) { await page.goto(path); await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible(); }
 } finally { await db.auditLog.deleteMany({ where: { actorUserId: { in: users } } }); await db.session.deleteMany({ where: { userId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } }); await db.$disconnect(); }
});
