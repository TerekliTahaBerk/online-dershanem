import { fireEvent, waitFor } from '@testing-library/react-native';

import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

import { activationDeskFixture as desk } from './admin-activation-fixture';

const center = { contractVersion: 1, generatedAt: '2026-10-11T08:00:00.000Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };

async function openDesk(routes: NonNullable<FakeAccount['routes']>) {
  const bootstrap = makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' });
  const h = await boot([account('admin@example.com', bootstrap, { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, center), 'GET /api/panel/admin/activation-desk': () => jsonResponse(200, desk), ...routes } })]);
  await signIn(h, 'admin@example.com');
  await press(h, await h.screen.findByTestId('nav-provisioning', {}, WAIT));
  expect(await h.screen.findByTestId('admin-activation-desk', {}, WAIT)).toBeTruthy();
  return h;
}

describe('Faz 2.1 aktivasyon masası', () => {
  it('onboarding geçişi: 428 → native step-up → AYNI gövdeyle tek tekrar; izinli geçişler sunucudan', async () => {
    let attempts = 0;
    const h = await openDesk({
      'POST /api/panel/orders/o1/onboarding': () => {
        attempts += 1;
        return attempts === 1 ? jsonResponse(428, { error: 'Bu hassas işlem için kimliğinizi yeniden doğrulayın.', code: 'STEP_UP_REQUIRED' }) : jsonResponse(200, { ok: true });
      },
      'POST /api/auth/mfa/code/verify': ({ body }) => ((body as { code?: string }).code === '654321' ? jsonResponse(200, { verified: true, stepUpExpiresAt: '2026-10-11T08:10:00.000Z' }) : jsonResponse(400, { error: 'Kod geçersiz.' })),
    });
    await press(h, await h.screen.findByTestId('admin-onboarding-ob1', {}, WAIT));
    expect(h.screen.queryByTestId('onboarding-to-ACTIVE')).toBeNull();
    await press(h, await h.screen.findByTestId('onboarding-to-MANUAL_REVIEW', {}, WAIT));
    await press(h, h.screen.getByTestId('onboarding-owner-admin-1'));
    fireEvent.changeText(h.screen.getByTestId('onboarding-note'), 'Veli aranacak');
    await press(h, h.screen.getByTestId('onboarding-submit'));

    fireEvent.changeText(await h.screen.findByTestId('step-up-code', {}, WAIT), '654321');
    await press(h, h.screen.getByTestId('step-up-submit'));

    await waitFor(() => expect(h.server.called('POST', '/api/panel/orders/o1/onboarding')).toHaveLength(2), WAIT);
    const [first, second] = h.server.called('POST', '/api/panel/orders/o1/onboarding');
    expect(first.body).toEqual({ toState: 'MANUAL_REVIEW', ownerId: 'admin-1', blockerReason: null, note: 'Veli aranacak' });
    expect(second.body).toEqual(first.body);
    expect(h.server.called('POST', '/api/auth/mfa/code/verify')[0].body).toEqual({ code: '654321', method: 'TOTP', purpose: 'STEP_UP' });
  });

  it('step-up vazgeçilirse istek tekrarlanmaz ve kullanıcıya söylenir', async () => {
    const h = await openDesk({ 'POST /api/panel/orders/o1/onboarding': () => jsonResponse(428, { error: 'Doğrulayın.', code: 'STEP_UP_REQUIRED' }) });
    await press(h, await h.screen.findByTestId('admin-onboarding-ob1', {}, WAIT));
    await press(h, await h.screen.findByTestId('onboarding-submit', {}, WAIT));
    await press(h, await h.screen.findByTestId('step-up-cancel', {}, WAIT));
    expect(await h.screen.findByText('İşlem kimlik doğrulaması tamamlanmadığı için yapılmadı.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/orders/o1/onboarding')).toHaveLength(1);
  });

  it('sipariş bağlama, talep durumu ve e-posta tekrarı mevcut web uçlarına gider', async () => {
    const h = await openDesk({
      'POST /api/panel/orders/o1/user': () => jsonResponse(200, { ok: true }),
      'PATCH /api/panel/leads/l1': () => jsonResponse(200, { ok: true }),
      'PATCH /api/panel/email-outbox/e1/retry': () => jsonResponse(200, { ok: true }),
    });
    await press(h, await h.screen.findByTestId('chip-siparisler', {}, WAIT));
    await press(h, await h.screen.findByTestId('admin-order-o1', {}, WAIT));
    fireEvent.changeText(await h.screen.findByTestId('link-order-search', {}, WAIT), 'ece');
    await press(h, await h.screen.findByTestId('link-order-student-u1', {}, WAIT));
    await press(h, h.screen.getByTestId('link-order-submit'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/orders/o1/user')[0]?.body).toEqual({ userId: 'u1' }), WAIT);

    await press(h, await h.screen.findByTestId('chip-CONTACTED', {}, WAIT));
    await waitFor(() => expect(h.server.called('PATCH', '/api/panel/leads/l1')[0]?.body).toEqual({ status: 'CONTACTED' }), WAIT);

    await press(h, h.screen.getByTestId('chip-sistem'));
    await press(h, await h.screen.findByTestId('admin-email-retry-e1', {}, WAIT));
    expect(await h.screen.findByText('E-posta yeniden kuyruğa alındı.', {}, WAIT)).toBeTruthy();
  });
});
