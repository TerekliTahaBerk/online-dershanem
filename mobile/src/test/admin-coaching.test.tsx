import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { AdminCoaching } from '@contracts/admin-coaching';
import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
const revision = 'a'.repeat(64);
const overview: AdminCoaching = { contractVersion: 1, students: [{ id: 's1', name: 'Ece', coachId: null, coachName: null, cadenceDays: null, revision, lastCompletedAt: null, nextAt: null, overdue: false }], coaches: [{ id: 'c1', name: 'Mert', load: 1, capacity: 1, today: 2, overdue: 1, assignable: true }], queues: [{ id: 'koc-bekleyen', label: 'Koç bekleyen', count: 1, rows: [{ id: 's1', studentId: 's1', title: 'Ece', detail: 'Koç atanmadı' }] }, { id: 'kapasite', label: 'Kapasite üstü koçlar', count: 0, rows: [] }], sessions: [{ id: 'session1', studentId: 's1', studentName: 'Ece', coachName: 'Mert', scheduledAt: '2026-10-12T09:00:00Z', completedAt: null, status: 'PLANNED', focus: 'Haftalık hedef' }] };
const center = { contractVersion: 1, generatedAt: '2026-10-11T08:00:00Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };
beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());
async function open(routes: NonNullable<FakeAccount['routes']> = {}) {
  const h = await boot([account('admin@example.com', makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, center), 'GET /api/panel/admin/coaching': () => jsonResponse(200, overview), ...routes } })]);
  await signIn(h, 'admin@example.com'); await go('/admin/coaching'); await h.screen.findByText('Koçluk operasyonu', {}, WAIT); return h;
}
async function fill(h: Awaited<ReturnType<typeof open>>) {
  await press(h, h.screen.getByTestId('coaching-row-s1'));
  fireEvent.changeText(h.screen.getByTestId('coaching-coach-search'), 'Mert');
  await press(h, h.screen.getByTestId('coaching-coach-c1'));
  expect(h.screen.getByTestId('coaching-assign').props.accessibilityState.disabled).toBe(true);
  fireEvent.changeText(h.screen.getByTestId('coaching-reason'), 'Dönem sonu desteği');
  fireEvent.changeText(h.screen.getByTestId('coaching-cadence'), '7');
}
function confirm() { jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.find((button) => button.text === 'Onayla')?.onPress?.()); }
it('kapasite gerekçesi, onay ve 428 aynı anahtar ile devam eder; görüşme detayı açılır', async () => {
  let attempts = 0; const keys: string[] = [];
  const h = await open({
    'POST /api/panel/admin/coach-assignments': ({ body }) => { keys.push((body as { idempotencyKey: string }).idempotencyKey); return ++attempts === 1 ? jsonResponse(428, { code: 'STEP_UP_REQUIRED', error: 'Doğrulayın.' }) : jsonResponse(200, { ok: true }); },
    'POST /api/auth/mfa/code/verify': () => jsonResponse(200, { verified: true, stepUpExpiresAt: '2026-10-12T20:00:00Z' }),
    'GET /api/panel/admin/coaching/sessions/session1': () => jsonResponse(200, { contractVersion: 1, session: overview.sessions[0], sharedNote: 'Birlikte çalışıyoruz', meetingUrl: 'https://meet.example.com/session1', proposedAt: null, rescheduleRequestedAt: null, rescheduleReason: null }),
  });
  await fill(h);
  const alert = jest.spyOn(Alert, 'alert'); await press(h, h.screen.getByTestId('coaching-assign')); expect(alert).toHaveBeenCalled(); expect(attempts).toBe(0);
  confirm(); await press(h, h.screen.getByTestId('coaching-assign'));
  fireEvent.changeText(await h.screen.findByTestId('step-up-code', {}, WAIT), '123456'); await press(h, h.screen.getByTestId('step-up-submit'));
  await waitFor(() => expect(attempts).toBe(2), WAIT); expect(keys[0]).toBe(keys[1]);
  expect(h.server.called('POST', '/api/panel/admin/coach-assignments')[1].body).toEqual(expect.objectContaining({ studentId: 's1', coachId: 'c1', cadenceDays: '7', expectedRevision: revision, overrideReason: 'Dönem sonu desteği' }));
  expect(await h.screen.findByText('Koç ataması kaydedildi.', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('coaching-session-session1'));
  expect(await h.screen.findByText('Görüşme detayı', {}, WAIT)).toBeTruthy(); expect(h.screen.getByText('Birlikte çalışıyoruz')).toBeTruthy();
});
it('409 görünümü yeniler, yeniden yazmaz; arama ve boş kuyruk çalışır', async () => {
  let reads = 0;
  const h = await open({ 'GET /api/panel/admin/coaching': () => { reads++; return jsonResponse(200, overview); }, 'POST /api/panel/admin/coach-assignments': () => jsonResponse(409, { error: 'Atama değişti.' }) });
  await fill(h); confirm(); await press(h, h.screen.getByTestId('coaching-assign'));
  expect(await h.screen.findByText(/Görünüm yenilendi/, {}, WAIT)).toBeTruthy(); expect(reads).toBeGreaterThan(1); expect(h.server.called('POST', '/api/panel/admin/coach-assignments')).toHaveLength(1);
  fireEvent.changeText(h.screen.getByTestId('coaching-search'), 'Bulunmayan öğrenci'); expect(h.screen.queryByTestId('coaching-row-s1')).toBeNull();
  await press(h, h.screen.getByTestId('chip-kapasite')); expect(h.screen.getByText('Bu kuyrukta kayıt yok')).toBeTruthy();
});
