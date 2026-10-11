import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { Button, Text } from '@/design/primitives';
import type { MobileSecurityCapabilities } from '@contracts/bootstrap';

import { makeBootstrap } from '@/test/fixtures';

import { StepUpProvider, useStepUp } from './step-up';

const admin = (security?: MobileSecurityCapabilities | null) => makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD', ...(security !== undefined ? { security } : {}) });

/* ------------------------------------------------------------------ *
 * Native step-up sayfası
 * ------------------------------------------------------------------ */

const mockSession = { api: { request: jest.fn() }, bootstrap: admin(), refreshBootstrap: jest.fn().mockResolvedValue(undefined) };
jest.mock('@/lib/auth/session-provider', () => ({ useSession: () => mockSession }));

function Probe() {
  const { requestStepUp } = useStepUp();
  const [result, setResult] = useState('bekliyor');
  return (
    <>
      <Button label="Hassas işlem" onPress={() => void requestStepUp().then((ok) => setResult(ok ? 'doğrulandı' : 'vazgeçildi'))} testID="probe" />
      <Text>{`sonuç:${result}`}</Text>
    </>
  );
}

describe('Faz 1 native step-up', () => {
  beforeEach(() => {
    mockSession.api.request.mockReset();
    mockSession.bootstrap = admin();
  });

  it('kod sunucuda doğrulanır (purpose STEP_UP, TOTP); yalnız verified:true başarıdır', async () => {
    mockSession.api.request.mockRejectedValueOnce(new Error('Kod geçersiz, kullanılmış veya süresi dolmuş.')).mockResolvedValueOnce({ verified: true, stepUpExpiresAt: '2026-10-11T08:10:00.000Z' });
    const screen = render(<StepUpProvider><Probe /></StepUpProvider>);
    fireEvent.press(screen.getByTestId('probe'));
    fireEvent.changeText(await screen.findByTestId('step-up-code'), '123456');
    fireEvent.press(screen.getByTestId('step-up-submit'));
    await waitFor(() => expect(mockSession.api.request).toHaveBeenCalledTimes(1));
    expect(screen.getByText('sonuç:bekliyor')).toBeTruthy();
    fireEvent.press(screen.getByTestId('step-up-submit'));
    expect(await screen.findByText('sonuç:doğrulandı')).toBeTruthy();
    expect(mockSession.api.request).toHaveBeenLastCalledWith('/api/auth/mfa/code/verify', { method: 'POST', body: { code: '123456', method: 'TOTP', purpose: 'STEP_UP' } });
  });

  it('vazgeçmek false döner; doğrulayıcı kayıtlı değilse kod alanı gösterilmez', async () => {
    mockSession.bootstrap = admin({ mfa: { enrolled: false, totp: false, recoveryCodes: false, passkey: false }, stepUpExpiresAt: null });
    const screen = render(<StepUpProvider><Probe /></StepUpProvider>);
    fireEvent.press(screen.getByTestId('probe'));
    expect(await screen.findByText('İkinci faktör kurulu değil')).toBeTruthy();
    expect(screen.queryByTestId('step-up-code')).toBeNull();
    fireEvent.press(screen.getByTestId('step-up-cancel'));
    expect(await screen.findByText('sonuç:vazgeçildi')).toBeTruthy();
    expect(mockSession.api.request).not.toHaveBeenCalled();
  });
});
