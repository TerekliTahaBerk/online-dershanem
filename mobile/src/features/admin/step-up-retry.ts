import { ApiError } from '@/lib/api/errors';

/** Kullanıcı step-up sayfasını kapattı; işlem gönderilmedi. */
export class StepUpCancelledError extends Error {
  constructor() {
    super('İşlem kimlik doğrulaması tamamlanmadığı için yapılmadı.');
    this.name = 'StepUpCancelledError';
  }
}

/**
 * Hassas yazma: sunucu 428 `STEP_UP_REQUIRED` derse step-up istenir ve
 * doğrulama başarılıysa AYNI deneme (aynı idempotency anahtarı) BİR KEZ
 * tekrarlanır. İkinci 428 veya başka hata çağırana geçer; sonsuz döngü yok.
 * Tekrar, kullanıcının açık doğrulamasından sonra yapılır ve idempotency
 * anahtarı sunucuda çift uygulamayı engeller.
 */
export async function runWithStepUp<T>(attempt: () => Promise<T>, requestStepUp: () => Promise<boolean>): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (!(error instanceof ApiError) || error.kind !== 'step_up_required') throw error;
    if (!(await requestStepUp())) throw new StepUpCancelledError();
    return attempt();
  }
}
