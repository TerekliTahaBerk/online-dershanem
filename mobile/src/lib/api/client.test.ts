import { createApiClient } from './client';
import { ApiError } from './errors';

type Call = { url: string; init: RequestInit };

function response(status: number, body: string, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers });
}

function setup(reply: (call: Call) => Promise<Response> | Response, token: string | null = 'tok-123') {
  const calls: Call[] = [];
  const onUnauthenticated = jest.fn();
  const api = createApiClient({
    baseUrl: 'https://panel.example.test',
    appVersion: '1.2.3',
    userAgent: 'OnlineDershanemMobile/1.2.3 (ios)',
    getToken: () => token,
    onUnauthenticated,
    defaultTimeoutMs: 50,
    fetchImpl: (async (url: string, init: RequestInit) => {
      const call = { url, init };
      calls.push(call);
      return reply(call);
    }) as unknown as typeof fetch,
  });
  return { api, calls, onUnauthenticated };
}

describe('API istemcisi', () => {
  it('Bearer, istemci ve sürüm başlıklarını ekler; çerez kullanmaz', async () => {
    const { api, calls } = setup(() => response(200, '{"ok":true}'));
    await expect(api.request('/api/panel/me')).resolves.toEqual({ ok: true });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok-123');
    expect(headers['X-Od-Client']).toBe('mobile');
    expect(headers['X-Od-Client-Version']).toBe('1.2.3');
    expect(calls[0].init.credentials).toBe('omit');
    expect(calls[0].url).toBe('https://panel.example.test/api/panel/me');
  });

  it('kimliksiz isteklerde token göndermez; token yoksa kimlikli istek ağa çıkmaz', async () => {
    const { api, calls } = setup(() => response(200, '{}'), null);
    await api.request('/api/auth/login', { method: 'POST', body: {}, authenticated: false });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBeUndefined();
    await expect(api.request('/api/panel/me')).rejects.toMatchObject({ kind: 'unauthenticated' });
    expect(calls).toHaveLength(1);
  });

  it('401 merkezi oturum sonlandırmayı bir kez tetikler; giriş ucunun 401i tetiklemez', async () => {
    const { api, onUnauthenticated } = setup(() => response(401, '{"error":"Oturumunuz sona ermiş.","code":"UNAUTHENTICATED"}'));
    await expect(api.request('/api/panel/me')).rejects.toMatchObject({ kind: 'unauthenticated', status: 401 });
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    await expect(api.request('/api/auth/login', { method: 'POST', body: {}, authenticated: false })).rejects.toMatchObject({ kind: 'unauthenticated' });
    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
  });

  it.each([
    [403, '{"error":"Devam etmeden önce parolanızı değiştirmeniz gerekiyor.","code":"PASSWORD_CHANGE_REQUIRED"}', 'password_change_required'],
    [403, '{"error":"Bu hesap için ikinci faktörü doğrulayın.","code":"MFA_REQUIRED","redirect":"/giris/mfa"}', 'mfa_required'],
    [404, '{"error":"Bu ürün için aktif erişiminiz yok.","code":"PRODUCT_ACCESS_REQUIRED"}', 'product_access'],
    [404, '{"error":"Bu pilot erişimi etkin değil.","code":"PILOT_UNAVAILABLE"}', 'pilot_unavailable'],
    [404, '{"error":"Deneme analizi henüz açık değil."}', 'not_found'],
    [403, '{"error":"Bu işlem için yetkiniz yok."}', 'forbidden'],
    [423, '{"error":"Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin."}', 'locked'],
    [428, '{"error":"x","code":"STEP_UP_REQUIRED"}', 'step_up_required'],
    [503, '{"error":"Panel şu anda kapalı.","code":"PANEL_DISABLED"}', 'unavailable'],
    [500, '{"error":"x"}', 'server'],
  ])('HTTP %i hata sınıfı kararlı koddan / durumdan çıkarılır', async (status, body, kind) => {
    const { api } = setup(() => response(status, body));
    await expect(api.request('/api/x')).rejects.toMatchObject({ kind, status });
  });

  it('yeni hata zarfını ({ success:false, error:{code,message} }) çözer', async () => {
    const { api } = setup(() => response(400, '{"success":false,"error":{"code":"VALIDATION_ERROR","message":"Alanları kontrol edin."}}'));
    await expect(api.request('/api/x')).rejects.toMatchObject({ kind: 'validation', message: 'Alanları kontrol edin.', code: 'VALIDATION_ERROR' });
  });

  it('426 minimum sürümü ayrıntıda taşır', async () => {
    const { api } = setup(() => response(426, '{"error":"Güncelleyin.","code":"CLIENT_UPGRADE_REQUIRED","minSupportedVersion":"2.0.0"}'));
    const error = (await api.request('/api/panel/me').catch((cause) => cause)) as ApiError;
    expect(error.kind).toBe('upgrade_required');
    expect(error.details?.minSupportedVersion).toBe('2.0.0');
  });

  it('JSON olmayan hata gövdesi (ağ geçidi HTML) kullanıcıya gösterilmez', async () => {
    const { api } = setup(() => response(502, '<html><body>Bad gateway</body></html>'));
    const error = (await api.request('/api/x').catch((cause) => cause)) as ApiError;
    expect(error.kind).toBe('server');
    expect(error.message).not.toContain('<html>');
  });

  it('başarılı ama JSON olmayan yanıt "başarılı" sayılmaz', async () => {
    const { api } = setup(() => response(200, 'ok'));
    await expect(api.request('/api/x')).rejects.toMatchObject({ kind: 'invalid_response' });
  });

  it('429 Retry-After süresini taşır', async () => {
    const { api } = setup(() => response(429, '{"error":"Çok fazla istek.","code":"RATE_LIMIT"}', { 'retry-after': '7' }));
    await expect(api.request('/api/x')).rejects.toMatchObject({ kind: 'rate_limited', retryAfterMs: 7000 });
  });

  it('ağ hatası ve zaman aşımı ayrı sınıflardır; çağıran iptali "cancelled" olur', async () => {
    const network = setup(() => Promise.reject(new TypeError('Network request failed')));
    await expect(network.api.request('/api/x')).rejects.toMatchObject({ kind: 'network' });

    const hang = (call: Call) =>
      new Promise<Response>((_, reject) => {
        call.init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const slow = setup(hang);
    await expect(slow.api.request('/api/x')).rejects.toMatchObject({ kind: 'timeout' });

    const cancelled = setup(hang);
    const controller = new AbortController();
    const pending = cancelled.api.request('/api/x', { signal: controller.signal, timeoutMs: 5_000 });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' });
  });

  it('sunucu adresi yapılandırılmamışsa ağ isteği yapılmaz', async () => {
    const api = createApiClient({ baseUrl: null, appVersion: null, userAgent: 'x', getToken: () => 't' });
    await expect(api.request('/api/x')).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
