import { activationDeskFixture as desk } from './admin-activation-fixture';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
import { orderFixture as order, ordersFixture as orders, orderCenter as center } from './admin-orders-fixture';
beforeEach(() => secureStore.__store.clear()); afterEach(() => jest.restoreAllMocks());
async function open(routes: NonNullable<FakeAccount['routes']> = {}) {
  const h = await boot([account('admin@example.com', makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, center), 'GET /api/panel/admin/orders': ({ query }) => jsonResponse(200, query.get('q') === 'yok' ? { ...orders, orders: [] } : { ...orders, page: Number(query.get('sayfa') ?? 1) }), 'GET /api/panel/admin/orders/o1': () => jsonResponse(200, { contractVersion: 1, order }), ...routes } })]);
  await signIn(h, 'admin@example.com'); await go('/screen/orders'); await h.screen.findByTestId('orders-search', {}, WAIT); return h;
}
function confirm() { jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.find((b) => b.text === 'Onayla')?.onPress?.()); }
it('sunucu araması, filtre ve sayfalama; detayda ödeme ve erişim ayrı, ürün ve ödeme geçmişi görünür', async () => {
  const h = await open(); await press(h, await h.screen.findByTestId('orders-next', {}, WAIT));
  await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/orders').some((c) => c.path.includes('sayfa=2'))).toBe(true), WAIT);
  await press(h, h.screen.getByTestId('chip-sorun')); await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/orders').some((c) => c.path.includes('filtre=sorun&sayfa=1'))).toBe(true), WAIT);
  fireEvent.changeText(h.screen.getByTestId('orders-search'), 'yok'); await press(h, h.screen.getByTestId('orders-search-submit')); expect(await h.screen.findByText('Erişim sorunu olan sipariş yok', {}, WAIT)).toBeTruthy();
  fireEvent.changeText(h.screen.getByTestId('orders-search'), 'Ece'); await press(h, h.screen.getByTestId('orders-search-submit')); await press(h, await h.screen.findByTestId('orders-row-o1', {}, WAIT));
  expect(await h.screen.findByText('Ne oldu?', {}, WAIT)).toBeTruthy(); expect(h.screen.getByText('Ürün erişimleri')).toBeTruthy(); expect(h.screen.getByText('Ödeme geçmişi')).toBeTruthy(); expect(h.screen.getByText('Veli bağlantısını tamamla')).toBeTruthy(); expect(h.screen.getByTestId('order-retry')).toBeTruthy();
});
it('onay ve 428 sonrasında aynı anahtar/sürümle tekrar eder; sunucu sonucunu gösterir', async () => {
  let count = 0; const bodies: unknown[] = [];
  const h = await open({ 'POST /api/panel/admin/orders/o1/provisioning-retry': ({ body }) => { bodies.push(body); return ++count === 1 ? jsonResponse(428, { code: 'STEP_UP_REQUIRED', error: 'Doğrulayın.' }) : jsonResponse(200, { ok: true, outcome: 'succeeded', succeeded: true, message: 'Erişim açıldı.' }); }, 'POST /api/auth/mfa/code/verify': () => jsonResponse(200, { verified: true, stepUpExpiresAt: '2026-10-12T20:00:00Z' }) });
  await press(h, await h.screen.findByTestId('orders-row-o1', {}, WAIT)); const alert = jest.spyOn(Alert, 'alert'); await press(h, await h.screen.findByTestId('order-retry', {}, WAIT)); expect(alert).toHaveBeenCalled(); expect(count).toBe(0);
  confirm(); await press(h, h.screen.getByTestId('order-retry')); fireEvent.changeText(await h.screen.findByTestId('step-up-code', {}, WAIT), '123456'); await press(h, h.screen.getByTestId('step-up-submit'));
  expect(await h.screen.findByText('Erişim açıldı.', {}, WAIT)).toBeTruthy(); expect(bodies).toHaveLength(2); expect(bodies[0]).toEqual(bodies[1]); expect(bodies[0]).toEqual(expect.objectContaining({ expectedRevision: order.revision, idempotencyKey: expect.any(String) }));
});
it('409 görünümü yeniler; otomatik yazmaz, iade edilmiş siparişte tekrar yok', async () => {
  let reads = 0;
  const h = await open({ 'GET /api/panel/admin/orders/o1': () => { reads++; return jsonResponse(200, { contractVersion: 1, order: reads > 1 ? { ...order, status: 'REFUNDED', canRetry: false } : order }); }, 'POST /api/panel/admin/orders/o1/provisioning-retry': () => jsonResponse(409, { error: 'Sipariş değişti.' }) });
  await press(h, await h.screen.findByTestId('orders-row-o1', {}, WAIT)); confirm(); await press(h, await h.screen.findByTestId('order-retry', {}, WAIT));
  expect(await h.screen.findByText(/Görünüm yenilendi/, {}, WAIT)).toBeTruthy(); await waitFor(() => expect(h.screen.queryByTestId('order-retry')).toBeNull(), WAIT); expect(h.server.called('POST', '/api/panel/admin/orders/o1/provisioning-retry')).toHaveLength(1);
});
it('sipariş detay derin bağlantısı öğrenciye kapalıdır', async () => {
  const h = await boot([account('ada@example.com', makeBootstrap())]); await signIn(h, 'ada@example.com'); await go('/admin/order/o1');
  expect(await h.screen.findByText('Bu bölüm hesabında yok', {}, WAIT)).toBeTruthy(); expect(h.server.called('GET', '/api/panel/admin/orders/o1')).toHaveLength(0);
});

it('sipariş detayından mevcut hesaba bağlama formu aynı API ile tamamlanır', async () => {
  const h = await open({ 'GET /api/panel/admin/orders/o1': () => jsonResponse(200, { contractVersion: 1, order: { ...order, userId: null, studentProfileId: null, canRetry: false } }), 'GET /api/panel/admin/activation-desk': () => jsonResponse(200, desk), 'POST /api/panel/orders/o1/user': () => jsonResponse(200, { ok: true }) });
  await press(h, await h.screen.findByTestId('orders-row-o1', {}, WAIT)); await press(h, await h.screen.findByTestId('order-activation', {}, WAIT));
  fireEvent.changeText(await h.screen.findByTestId('link-order-search', {}, WAIT), 'Ece'); await press(h, h.screen.getByTestId('link-order-student-u1')); await press(h, h.screen.getByTestId('link-order-submit'));
  await waitFor(() => expect(h.server.called('POST', '/api/panel/orders/o1/user')).toHaveLength(1), WAIT); expect(h.server.called('POST', '/api/panel/orders/o1/user')[0].body).toEqual({ userId: 'u1' });
});
it('sipariş detayından onboarding formu sunucunun izin verdiği geçişi kullanır', async () => {
  const h = await open({ 'GET /api/panel/admin/activation-desk': () => jsonResponse(200, { ...desk, onboardings: desk.onboardings.map((o) => ({ ...o, linkedToAccount: true })) }), 'POST /api/panel/orders/o1/onboarding': () => jsonResponse(200, { ok: true }) });
  await press(h, await h.screen.findByTestId('orders-row-o1', {}, WAIT)); await press(h, await h.screen.findByTestId('order-activation', {}, WAIT));
  await press(h, await h.screen.findByTestId('onboarding-to-CONTACT_PENDING', {}, WAIT)); await press(h, h.screen.getByTestId('onboarding-submit'));
  await waitFor(() => expect(h.server.called('POST', '/api/panel/orders/o1/onboarding')).toHaveLength(1), WAIT); expect(h.server.called('POST', '/api/panel/orders/o1/onboarding')[0].body).toEqual(expect.objectContaining({ toState: 'CONTACT_PENDING' }));
});
