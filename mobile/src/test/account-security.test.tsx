import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

const CODES = ['AAAA-1111', 'BBBB-2222'];

describe('C09 doğrulayıcı kurulumu', () => {
  it('ikinci faktörü olmayan personel MFA kapısında doğrulayıcı kurar; kodlar onaylanınca panel açılır', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const h = await boot([account('editor@example.com', makeBootstrap({ role: 'TEACHER', gate: 'MFA_REQUIRED', mfa: { enrolled: false, totp: false, recoveryCodes: false, passkey: false } }), { routes: {
      'PUT /api/auth/mfa/totp/enroll': () => jsonResponse(200, { secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' }),
      'POST /api/auth/mfa/totp/enroll': ({ body, account: current }) => {
        if ((body as { code: string }).code !== '123456') return jsonResponse(400, { error: 'Kod doğrulanamadı.' });
        current.bootstrap = makeBootstrap({ role: 'TEACHER', products: { ODK: 'ACTIVE' } });
        return jsonResponse(200, { verified: true, recoveryCodes: CODES, redirect: '/panel' });
      },
    } })]);
    await signIn(h, 'editor@example.com');
    await press(h, await h.screen.findByTestId('totp-begin', {}, WAIT));
    expect(await h.screen.findByText('JBSW Y3DP EHPK 3PXP', {}, WAIT)).toBeTruthy();
    fireEvent.changeText(h.screen.getByTestId('totp-code'), '000000');
    await press(h, h.screen.getByTestId('totp-confirm'));
    expect(await h.screen.findByText('Kod doğrulanamadı.', {}, WAIT)).toBeTruthy();
    fireEvent.changeText(h.screen.getByTestId('totp-code'), '123456');
    await press(h, h.screen.getByTestId('totp-confirm'));
    expect(await h.screen.findByText('AAAA-1111', {}, WAIT)).toBeTruthy();
    await press(h, h.screen.getByTestId('totp-share'));
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('BBBB-2222') });
    await press(h, h.screen.getByTestId('totp-done'));
    expect(await h.screen.findByTestId('staff-home-TEACHER', {}, WAIT)).toBeTruthy();
  }, 30000);

  it('yönetici güvenlik ekranında onayla doğrulayıcıyı değiştirir', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    const h = await boot([account('admin@example.com', makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: {
      'GET /api/panel/admin/operations-center': () => jsonResponse(200, { contractVersion: 1, generatedAt: '2026-10-12T08:00:00.000Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] }),
      'PUT /api/auth/mfa/totp/enroll': () => jsonResponse(200, { secret: 'ABCDEFGHABCDEFGH', otpauthUri: 'otpauth://totp/y' }),
      'POST /api/auth/mfa/totp/enroll': () => jsonResponse(200, { verified: true, recoveryCodes: CODES }),
    } })]);
    await signIn(h, 'admin@example.com');
    await go('/account');
    await press(h, await h.screen.findByTestId('account-security', {}, WAIT));
    await press(h, await h.screen.findByTestId('security-replace-totp', {}, WAIT));
    await press(h, await h.screen.findByTestId('totp-begin', {}, WAIT));
    fireEvent.changeText(await h.screen.findByTestId('totp-code', {}, WAIT), '654321');
    await press(h, h.screen.getByTestId('totp-confirm'));
    await press(h, await h.screen.findByTestId('totp-done', {}, WAIT));
    expect(await h.screen.findByText('Doğrulayıcı uygulama kaydedildi.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/auth/mfa/totp/enroll')[0].body).toEqual({ code: '654321' });
  });
});

describe('P5.3 hesap silme talebi', () => {
  it('parolayla onaylı talep gönderir; açık talep durumu gösterilir', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    let requested: string | null = null;
    const h = await boot([account('parent@example.com', makeBootstrap({ role: 'PARENT', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: {
      'GET /api/panel/parent/children': () => jsonResponse(200, { contractVersion: 1, children: [] }),
      'GET /api/panel/me/deletion-request': () => jsonResponse(200, { contractVersion: 1, requestedAt: requested, processing: null }),
      'POST /api/panel/me/deletion-request': ({ body }) => {
        if ((body as { password: string }).password !== 'dogru') return jsonResponse(400, { error: 'Parola doğrulanamadı.', code: 'INVALID_PASSWORD' });
        requested = '2026-10-13T08:00:00.000Z';
        return jsonResponse(200, { ok: true, requestedAt: requested, alreadyRequested: false, replayed: false });
      },
    } })]);
    await signIn(h, 'parent@example.com');
    await go('/account/deletion');
    fireEvent.changeText(await h.screen.findByTestId('deletion-password', {}, WAIT), 'yanlis');
    await press(h, h.screen.getByTestId('deletion-submit'));
    expect(await h.screen.findByText('Parola doğrulanamadı.', {}, WAIT)).toBeTruthy();
    fireEvent.changeText(h.screen.getByTestId('deletion-password'), 'dogru');
    await press(h, h.screen.getByTestId('deletion-submit'));
    expect(await h.screen.findByText('Hesap silme talebiniz alındı. Sonuç size e-postayla bildirilecek.', {}, WAIT)).toBeTruthy();
    expect(await h.screen.findByText('Açık talebiniz var', {}, WAIT)).toBeTruthy();
    const calls = h.server.called('POST', '/api/panel/me/deletion-request');
    expect(calls[1].body).toEqual({ password: 'dogru', idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    await waitFor(() => expect(h.screen.queryByTestId('deletion-submit')).toBeNull(), WAIT);
  });
});
