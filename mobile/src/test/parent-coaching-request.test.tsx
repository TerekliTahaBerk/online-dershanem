import { waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
const coaching = (session: Record<string, unknown>) => ({ contractVersion: 1, studentId: 'child-1', available: true, coach: { name: 'Koç Deniz', nextScheduledAt: future, awaitingNewTime: false, focus: null, sharedNote: null }, sessions: [{ id: 's1', scheduledAt: future, rescheduleRequested: false, proposedAt: null, version: 2, meetingUrl: 'https://meet.example.com/s1', ...session }], week: null, summary: null, notes: [], goals: [] });

async function open(routes: Record<string, (request: { body: unknown }) => Response>) {
  const h = await boot([account('parent@example.com', makeBootstrap({ role: 'PARENT', products: { OK: 'ACTIVE' }, activeProduct: 'OK', extraNav: [['coaching', 'Koçluk', '/panel/veli/kocluk']] }), { routes: {
    'GET /api/panel/parent/children': () => jsonResponse(200, { contractVersion: 1, children: [{ studentId: 'child-1', name: 'Can', products: ['OK'] }] }),
    ...routes,
  } })]);
  await signIn(h, 'parent@example.com');
  await go('/screen/coaching');
  return h;
}

describe('V07 veli görüşmeleri', () => {
  it('saat değişikliği talebini görülen sürüm ve işlem anahtarıyla iletir; katılım bağlantısı açılır', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const h = await open({
      'GET /api/panel/parent/coaching': () => jsonResponse(200, coaching({})),
      'POST /api/panel/coaching-sessions/s1': () => jsonResponse(200, { id: 's1', version: 3 }),
    });
    await press(h, await h.screen.findByTestId('parent-join-s1', {}, WAIT));
    expect(openURL).toHaveBeenCalledWith('https://meet.example.com/s1');
    await press(h, h.screen.getByTestId('parent-reschedule-s1'));
    await press(h, await h.screen.findByTestId('parent-reason-FAMILY_SCHEDULE', {}, WAIT));
    await press(h, h.screen.getByTestId('parent-reschedule-submit'));
    expect(await h.screen.findByText('Saat değişikliği talebiniz koça iletildi 📨 En kısa sürede dönüş yapılacaktır.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/coaching-sessions/s1')[0].body).toEqual({ action: 'REQUEST', reason: 'FAMILY_SCHEDULE', expectedVersion: 2, idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    await waitFor(() => expect(h.server.called('GET', '/api/panel/parent/coaching').length).toBeGreaterThan(1), WAIT);
  }, 30000);

  it('talep zaten varsa veya sunucu sürüm vermiyorsa talep düğmesi yoktur', async () => {
    const h = await open({ 'GET /api/panel/parent/coaching': () => jsonResponse(200, coaching({ rescheduleRequested: true, meetingUrl: null })) });
    expect(await h.screen.findByText('Saat değişikliği talebiniz alındı', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByTestId('parent-reschedule-s1')).toBeNull();
    expect(h.screen.queryByTestId('parent-join-s1')).toBeNull();
  });
});
