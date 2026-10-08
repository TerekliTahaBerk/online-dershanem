import { ApiError } from '@/lib/api/errors';
import { createGateRefreshPolicy } from '@/lib/auth/gate-refresh';

import { queryKeys, sessionKeyFor } from './keys';
import { retryDelay, shouldRetryQuery } from './query-client';

describe('sorgu anahtarları ve önbellek izolasyonu', () => {
  it('her kullanıcı verisi kullanıcı kimliğiyle başlar; iki kullanıcının anahtarı asla çakışmaz', () => {
    const a = queryKeys.notifications('user-a', 'all');
    const b = queryKeys.notifications('user-b', 'all');
    expect(a[1]).toBe('user-a');
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
    expect(queryKeys.workspaceResource('u', 'OD', 'lessons')).toEqual(['user', 'u', 'workspace', 'OD', 'lessons', {}]);
    expect(queryKeys.workspaceResource('u', 'OK', 'lessons')).not.toEqual(queryKeys.workspaceResource('u', 'OD', 'lessons'));
  });

  it('bootstrap anahtarı token içermez ama token değişince değişir', () => {
    const token = 'gizli-oturum-token-1234567890abcdef';
    const key = sessionKeyFor(token);
    expect(key).not.toContain('gizli');
    expect(JSON.stringify(queryKeys.bootstrap(key))).not.toContain(token);
    expect(sessionKeyFor('baska-token')).not.toBe(key);
    expect(sessionKeyFor(null)).toBe('anonymous');
  });
});

describe('yeniden deneme politikası', () => {
  it('yalnız geçici hatalarda, en fazla iki kez', () => {
    expect(shouldRetryQuery(0, new ApiError({ kind: 'network' }))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError({ kind: 'server', status: 500 }))).toBe(true);
    expect(shouldRetryQuery(2, new ApiError({ kind: 'network' }))).toBe(false);
  });

  it.each(['unauthenticated', 'forbidden', 'mfa_required', 'password_change_required', 'product_access', 'not_found', 'validation', 'invalid_response', 'upgrade_required'] as const)('%s tekrar denenmez', (kind) => {
    expect(shouldRetryQuery(0, new ApiError({ kind }))).toBe(false);
  });

  it('Retry-After saygı görür, üst sınırlı', () => {
    expect(retryDelay(0, new ApiError({ kind: 'rate_limited', retryAfterMs: 5000 }))).toBe(5000);
    expect(retryDelay(0, new ApiError({ kind: 'rate_limited', retryAfterMs: 120_000 }))).toBe(30_000);
    expect(retryDelay(3, new ApiError({ kind: 'network' }))).toBe(8000);
  });
});

describe('kapı yenileme politikası (döngü önleme)', () => {
  it('kapı / ürün erişimi kodları bootstrap yeniler; düz 404 yenilemez', () => {
    let now = 0;
    const policy = createGateRefreshPolicy(15_000, () => now);
    expect(policy.shouldRefresh(new ApiError({ kind: 'not_found', status: 404 }))).toBe(false);
    expect(policy.shouldRefresh(new ApiError({ kind: 'mfa_required' }))).toBe(true);
    expect(policy.shouldRefresh(new ApiError({ kind: 'product_access' }))).toBe(false);
    now = 16_000;
    expect(policy.shouldRefresh(new ApiError({ kind: 'product_access' }))).toBe(true);
    expect(policy.shouldRefresh(new Error('x'))).toBe(false);
  });
});
