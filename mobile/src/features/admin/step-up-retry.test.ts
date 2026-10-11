import { ApiError } from '@/lib/api/errors';

import { runWithStepUp, StepUpCancelledError } from './step-up-retry';

const stepUpError = () => new ApiError({ kind: 'step_up_required', status: 428, code: 'STEP_UP_REQUIRED' });

describe('runWithStepUp', () => {
  it('step-up gerekmiyorsa bir kez çalışır ve doğrulama istemez', async () => {
    const attempt = jest.fn().mockResolvedValue('ok');
    const request = jest.fn();
    await expect(runWithStepUp(attempt, request)).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });

  it('428 → doğrulama başarılı → aynı deneme bir kez tekrarlanır', async () => {
    const attempt = jest.fn().mockRejectedValueOnce(stepUpError()).mockResolvedValueOnce('ok');
    const request = jest.fn().mockResolvedValue(true);
    await expect(runWithStepUp(attempt, request)).resolves.toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('kullanıcı vazgeçerse işlem tekrarlanmaz', async () => {
    const attempt = jest.fn().mockRejectedValue(stepUpError());
    await expect(runWithStepUp(attempt, jest.fn().mockResolvedValue(false))).rejects.toBeInstanceOf(StepUpCancelledError);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('doğrulamadan sonra ikinci 428 çağırana geçer (döngü yok)', async () => {
    const attempt = jest.fn().mockRejectedValue(stepUpError());
    const request = jest.fn().mockResolvedValue(true);
    await expect(runWithStepUp(attempt, request)).rejects.toMatchObject({ kind: 'step_up_required' });
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('başka hatalar (403, 409) doğrulama istemeden geçer', async () => {
    for (const kind of ['forbidden', 'conflict'] as const) {
      const request = jest.fn();
      await expect(runWithStepUp(jest.fn().mockRejectedValue(new ApiError({ kind })), request)).rejects.toMatchObject({ kind });
      expect(request).not.toHaveBeenCalled();
    }
  });
});
