import { makeBootstrap } from '@/test/fixtures';

import { createApiClient } from './client';
import * as endpoints from './endpoints';

function apiReturning(status: number, body: unknown) {
  return createApiClient({
    baseUrl: 'https://panel.example.test',
    appVersion: '1.0.0',
    userAgent: 'test',
    getToken: () => 'tok',
    fetchImpl: (async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })) as unknown as typeof fetch,
  });
}

describe('uç noktalar — güven sınırında sözleşme doğrulaması', () => {
  it('geçerli bootstrap kabul edilir', async () => {
    await expect(endpoints.fetchBootstrap(apiReturning(200, makeBootstrap()))).resolves.toMatchObject({ user: { role: 'STUDENT' } });
  });

  it('geçersiz bootstrap (eksik alan, yanlış rol, kapı açık değilken veri) invalid_response olur', async () => {
    const valid = makeBootstrap();
    await expect(endpoints.fetchBootstrap(apiReturning(200, { ...valid, user: { ...valid.user, role: 'ROOT' } }))).rejects.toMatchObject({ kind: 'invalid_response' });
    await expect(endpoints.fetchBootstrap(apiReturning(200, { ok: true }))).rejects.toMatchObject({ kind: 'invalid_response' });
    const gated = makeBootstrap({ gate: 'MFA_REQUIRED' });
    await expect(endpoints.fetchBootstrap(apiReturning(200, { ...gated, workspace: valid.workspace }))).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('giriş yanıtında token yoksa / kısaysa başarı sayılmaz', async () => {
    await expect(endpoints.login(apiReturning(200, { redirect: '/panel/urun-sec' }), 'a@b.c', 'x')).rejects.toMatchObject({ kind: 'invalid_response' });
    await expect(endpoints.login(apiReturning(200, { redirect: '/x', token: 'short' }), 'a@b.c', 'x')).rejects.toMatchObject({ kind: 'invalid_response' });
    await expect(endpoints.login(apiReturning(200, { redirect: '/panel/parola', token: 'x'.repeat(43) }), 'a@b.c', 'x')).resolves.toMatchObject({ redirect: '/panel/parola' });
  });

  it('giriş hatası sunucu mesajıyla döner (enumeration mesajı değiştirilmez)', async () => {
    await expect(endpoints.login(apiReturning(401, { error: 'E-posta veya parola hatalı.' }), 'a@b.c', 'x')).rejects.toMatchObject({ message: 'E-posta veya parola hatalı.' });
  });

  it('MFA doğrulaması sunucu açıkça doğrulamadıkça başarılı sayılmaz', async () => {
    await expect(endpoints.verifyMfaCode(apiReturning(200, { verified: false }), '123456', 'TOTP')).rejects.toMatchObject({ kind: 'invalid_response' });
    await expect(endpoints.verifyMfaCode(apiReturning(200, { verified: true, redirect: '/panel' }), '123456', 'TOTP')).resolves.toBeUndefined();
    await expect(endpoints.verifyMfaCode(apiReturning(400, { error: 'Kod geçersiz, kullanılmış veya süresi dolmuş.' }), '000000', 'TOTP')).rejects.toMatchObject({ kind: 'validation' });
  });

  it('okundu işaretleme sunucu ok demedikçe başarı sayılmaz; bildirim sayfası doğrulanır', async () => {
    await expect(endpoints.markNotificationsRead(apiReturning(200, {}), 'n1')).rejects.toMatchObject({ kind: 'invalid_response' });
    await expect(endpoints.markNotificationsRead(apiReturning(200, { ok: true, count: 1 }), 'n1')).resolves.toBe(1);
    await expect(endpoints.fetchNotifications(apiReturning(200, { page: 1, totalPages: 1, unreadTotal: 0, notifications: [{ id: 'n', type: 'NOPE' }] }), 1, 'all')).rejects.toMatchObject({ kind: 'invalid_response' });
  });
});
