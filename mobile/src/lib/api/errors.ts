import { MOBILE_API_ERROR_CODES, type MobileApiErrorCode } from '@contracts/api';

/**
 * İstemci tarafı hata sınıfları. Dallanma Türkçe mesaja göre DEĞİL, bu
 * sınıfa göre yapılır. Sınıf, sunucunun kararlı `code` alanından; kod yoksa
 * (eski uçlar) HTTP durumundan türetilir.
 */
export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'unauthenticated'
  | 'password_change_required'
  | 'mfa_required'
  | 'step_up_required'
  | 'forbidden'
  | 'product_access'
  | 'pilot_unavailable'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'locked'
  | 'rate_limited'
  | 'upgrade_required'
  | 'feature_disabled'
  | 'unavailable'
  | 'server'
  | 'invalid_response';

const CODE_KIND: Partial<Record<MobileApiErrorCode, ApiErrorKind>> = {
  UNAUTHENTICATED: 'unauthenticated',
  PASSWORD_CHANGE_REQUIRED: 'password_change_required',
  MFA_REQUIRED: 'mfa_required',
  STEP_UP_REQUIRED: 'step_up_required',
  FORBIDDEN: 'forbidden',
  PRODUCT_ACCESS_REQUIRED: 'product_access',
  PILOT_UNAVAILABLE: 'pilot_unavailable',
  PILOT_PAUSED: 'unavailable',
  PANEL_DISABLED: 'unavailable',
  CLIENT_UPGRADE_REQUIRED: 'upgrade_required',
  RATE_LIMIT: 'rate_limited',
  ORIGIN: 'forbidden',
  ADMIN_PREVIEW_READONLY: 'forbidden',
  FEATURE_DISABLED: 'feature_disabled',
  CHILD_NOT_FOUND: 'not_found',
};

export function isKnownErrorCode(code: unknown): code is MobileApiErrorCode {
  return typeof code === 'string' && (MOBILE_API_ERROR_CODES as readonly string[]).includes(code);
}

export function classifyHttpError(status: number, code: string | undefined): ApiErrorKind {
  if (isKnownErrorCode(code) && CODE_KIND[code]) return CODE_KIND[code]!;
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 423) return 'locked';
  if (status === 426) return 'upgrade_required';
  if (status === 428) return 'step_up_required';
  if (status === 429) return 'rate_limited';
  if (status === 503) return 'unavailable';
  if (status >= 500) return 'server';
  return 'validation';
}

const FALLBACK_MESSAGE: Record<ApiErrorKind, string> = {
  network: 'Sunucuya ulaşamadık. İnternet bağlantını kontrol edip bir daha dener misin?',
  timeout: 'Yanıt biraz gecikti. Bir daha dener misin?',
  cancelled: 'İstek iptal edildi.',
  unauthenticated: 'Güvenliğin için oturumunu kapattık. Tekrar giriş yapman yeterli.',
  password_change_required: 'Devam etmeden önce parolanı değiştirmen gerekiyor.',
  mfa_required: 'Devam etmek için ikinci doğrulama adımını tamamlaman gerekiyor.',
  step_up_required: 'Bu işlem için kimliğini bir kez daha doğrulaman gerekiyor.',
  forbidden: 'Bu işlemi yapma yetkin yok.',
  product_access: 'Bu ürün hesabında şu an açık değil.',
  pilot_unavailable: 'Bu panel şimdilik kapalı.',
  not_found: 'Aradığını bulamadık.',
  validation: 'Bilgilerde bir eksik ya da hata var gibi; kontrol eder misin?',
  conflict: 'Bu kayıt başka bir yerden değişmiş. Yenileyip bir daha dener misin?',
  locked: 'Güvenliğin için hesabını kısa süreliğine kilitledik.',
  rate_limited: 'Biraz hızlı gittik. Birkaç dakika bekleyip tekrar dener misin?',
  upgrade_required: 'Uygulamanın yeni bir sürümü var. Devam etmek için güncellemen yeterli.',
  feature_disabled: 'Bu bölüm şimdilik kapalı.',
  unavailable: 'Şu an kısa bir bakım ya da yoğunluk var. Biraz sonra tekrar dener misin?',
  server: 'Bizden kaynaklı bir sorun oldu. Bir daha dener misin?',
  invalid_response: 'Beklenmedik bir yanıt aldık. Bir daha dener misin?',
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code?: string;
  readonly retryAfterMs?: number;
  readonly details?: Record<string, unknown>;

  constructor(input: { kind: ApiErrorKind; status?: number; message?: string | null; code?: string; retryAfterMs?: number; details?: Record<string, unknown> }) {
    super(input.message?.trim() || FALLBACK_MESSAGE[input.kind]);
    this.name = 'ApiError';
    this.kind = input.kind;
    this.status = input.status ?? 0;
    this.code = input.code;
    this.retryAfterMs = input.retryAfterMs;
    this.details = input.details;
  }

  /** Aynı isteği tekrar göndermek güvenli ve anlamlı mı? (Yalnız okuma istekleri için kullanılır.) */
  get transient(): boolean {
    return this.kind === 'network' || this.kind === 'timeout' || this.kind === 'server' || this.kind === 'unavailable';
  }
}

export function fallbackMessage(kind: ApiErrorKind): string {
  return FALLBACK_MESSAGE[kind];
}

/**
 * Sunucu yanıt gövdesinden mesaj/kod çıkarır. İki zarf da desteklenir:
 *   eski: `{ error: string, code?: string, minSupportedVersion?: string }`
 *   yeni: `{ success: false, error: { code, message, details? } }`
 */
export function parseErrorBody(body: unknown): { message: string | null; code: string | undefined; details?: Record<string, unknown> } {
  if (!body || typeof body !== 'object') return { message: null, code: undefined };
  const record = body as Record<string, unknown>;
  if (record.error && typeof record.error === 'object') {
    const nested = record.error as Record<string, unknown>;
    return {
      message: typeof nested.message === 'string' ? nested.message : null,
      code: typeof nested.code === 'string' ? nested.code : undefined,
      details: nested.details && typeof nested.details === 'object' ? (nested.details as Record<string, unknown>) : undefined,
    };
  }
  const details: Record<string, unknown> = {};
  if (typeof record.minSupportedVersion === 'string') details.minSupportedVersion = record.minSupportedVersion;
  if (typeof record.redirect === 'string') details.redirect = record.redirect;
  return {
    message: typeof record.error === 'string' ? record.error : typeof record.message === 'string' ? record.message : null,
    code: typeof record.code === 'string' ? record.code : undefined,
    details: Object.keys(details).length ? details : undefined,
  };
}
