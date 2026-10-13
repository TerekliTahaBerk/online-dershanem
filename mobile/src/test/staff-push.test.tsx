import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

const preferences = { inAppEnabled: true, emailEnabled: false, whatsappEnabled: false, lessonSummary: true, weeklyDigest: true, absence: true, assignment: true, payment: true, pushEnabled: false, examUpdates: true, quietStartMinute: null, quietEndMinute: null, dailyDigest: false, dailyDigestMinute: null };

async function teacher(flags: Record<string, boolean>) {
  const h = await boot([account('teacher@example.com', makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', flags }), { routes: {
    'GET /api/panel/notifications/preferences': () => jsonResponse(200, { preferences }),
  } })]);
  await signIn(h, 'teacher@example.com');
  return h;
}

describe('P5.4 personel push', () => {
  it('staffPush açıkken öğretmen bildirim ayarlarını açar; öğrenci kategorileri gösterilmez', async () => {
    const h = await teacher({ staffPush: true });
    await go('/account');
    await press(h, await h.screen.findByTestId('account-notifications', {}, WAIT));
    expect(await h.screen.findByText('İçerik', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByTestId('pref-assignment')).toBeNull();
    expect(h.screen.getByText('Sessiz saatler')).toBeTruthy();
  }, 30000);

  it('bayrak kapalıyken giriş noktası yoktur; ekran istek atmadan kapalıdır', async () => {
    const h = await teacher({});
    await go('/account');
    expect(await h.screen.findByTestId('account-sessions', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByTestId('account-notifications')).toBeNull();
    await go('/account/notifications');
    expect(await h.screen.findByText('Bildirim ayarları bu hesap için mobilde açık değil.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/notifications/preferences')).toHaveLength(0);
  });
});
