import { ApiError, classifyHttpError, parseErrorBody } from './errors';

/**
 * Ortak API katmanı — web paneline ince istemci; ikinci bir backend YOK.
 *
 * Güvenlik kuralları (docs/mobile/m1-auth-security-review.md):
 * - Kimlik YALNIZ `Authorization: Bearer` ile taşınır; token SecureStore'dan
 *   gelir, URL'e asla konmaz.
 * - `credentials: 'omit'`: Expo 57'nin native fetch'i iOS'ta
 *   `httpShouldHandleCookies = false`, Android'de `CookieJar.NO_COOKIES`
 *   kullanır — sistem çerez deposu ne okunur ne yazılır. Sunucu da mobil
 *   girişte çerez yazmaz ve çerez ≠ Bearer çakışmasında oturum açmaz.
 * - `X-Od-Client` ve sürüm başlıkları yalnız taşıma/sürüm sinyalidir;
 *   yetki değildir.
 * - Yazma istekleri bu katmanda ASLA otomatik tekrarlanmaz.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  /** Varsayılan: oturum token'ı eklenir. Giriş / parola sıfırlama gibi uçlarda false. */
  authenticated?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export type ApiClientConfig = {
  baseUrl: string | null;
  appVersion: string | null;
  userAgent: string;
  getToken: () => string | null;
  /** 401 / UNAUTHENTICATED geldiğinde bir kez çağrılır (yerel oturumu kapatır). */
  onUnauthenticated?: (error: ApiError) => void;
  fetchImpl?: typeof fetch;
  defaultTimeoutMs?: number;
};

export type ApiClient = {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  /** Yalnız dosya indirme gibi fetch dışı araçlar için: istemci başlıkları + Bearer. */
  authHeaders(): Record<string, string>;
  readonly baseUrl: string | null;
};

const DEFAULT_TIMEOUT_MS = 15_000;

function linkSignals(timeoutMs: number, external?: AbortSignal): { signal: AbortSignal; cleanup: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', onAbort);
  }
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const fetchImpl = config.fetchImpl ?? fetch;

  function clientHeaders(): Record<string, string> {
    return {
      'X-Od-Client': 'mobile',
      ...(config.appVersion ? { 'X-Od-Client-Version': config.appVersion } : {}),
      'User-Agent': config.userAgent,
    };
  }

  function authHeaders(): Record<string, string> {
    const token = config.getToken();
    return { ...clientHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!config.baseUrl) {
      throw new ApiError({ kind: 'unavailable', message: 'Uygulama yapılandırması eksik: sunucu adresi tanımlı değil.' });
    }
    if (!path.startsWith('/')) throw new Error(`API yolu "/" ile başlamalı: ${path}`);

    const authenticated = options.authenticated ?? true;
    const token = authenticated ? config.getToken() : null;
    if (authenticated && !token) {
      throw new ApiError({ kind: 'unauthenticated', status: 401 });
    }

    const headers: Record<string, string> = { Accept: 'application/json', ...clientHeaders(), ...options.headers };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const { signal, cleanup, timedOut } = linkSignals(options.timeoutMs ?? config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS, options.signal);
    let response: Response;
    try {
      response = await fetchImpl(`${config.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        credentials: 'omit',
        signal,
      });
    } catch {
      cleanup();
      if (timedOut()) throw new ApiError({ kind: 'timeout' });
      if (options.signal?.aborted) throw new ApiError({ kind: 'cancelled' });
      throw new ApiError({ kind: 'network' });
    }

    let text: string;
    try {
      text = await response.text();
    } catch {
      cleanup();
      if (timedOut()) throw new ApiError({ kind: 'timeout' });
      throw new ApiError({ kind: 'network' });
    }
    cleanup();

    let data: unknown = null;
    let jsonOk = true;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        jsonOk = false;
      }
    }

    if (!response.ok) {
      const parsed = jsonOk ? parseErrorBody(data) : { message: null, code: undefined };
      const kind = classifyHttpError(response.status, parsed.code);
      const error = new ApiError({
        kind,
        status: response.status,
        // JSON olmayan hata gövdesi (ör. ağ geçidi HTML'i) kullanıcıya gösterilmez.
        message: parsed.message,
        code: parsed.code,
        details: parsed.details,
        retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
      });
      if (error.kind === 'unauthenticated' && authenticated) config.onUnauthenticated?.(error);
      throw error;
    }

    if (!jsonOk) throw new ApiError({ kind: 'invalid_response', status: response.status });
    return data as T;
  }

  return { request, authHeaders, baseUrl: config.baseUrl };
}
