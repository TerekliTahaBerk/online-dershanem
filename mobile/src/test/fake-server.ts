import type { MobileBootstrap, MobileProductCode } from '@contracts/bootstrap';

import { makeOdHome } from './od-fixtures';

/**
 * Bellek içi sahte panel sunucusu — akış testleri için. Sunucu kurallarını
 * TAKLİT ETMEZ; yalnız sözleşmedeki yanıtları üretir ve hangi uçların hangi
 * kimlikle çağrıldığını kaydeder. Gerçek sunucu davranışı
 * `tests/e2e/mobile-api.spec.ts` ile doğrulanır.
 */
export type FakeAccount = {
  email: string;
  password: string;
  bootstrap: MobileBootstrap;
  /** MFA kodu doğrulanınca kullanılacak bootstrap. */
  afterMfa?: MobileBootstrap;
  /** Parola değişince kullanılacak bootstrap. */
  afterPasswordChange?: MobileBootstrap;
  /** Çalışma alanı seçilince: ürün → bootstrap. */
  afterSelect?: Partial<Record<MobileProductCode, MobileBootstrap>>;
  notifications?: { id: string; title: string; href: string | null }[];
  /**
   * Hesaba özel uç yanıtları: anahtar `METHOD /yol` (sorgu dizesi hariç).
   * M2 OD ekran testleri sunucu yanıtlarını buradan verir.
   */
  routes?: Record<string, (request: { body: unknown; path: string; query: URLSearchParams; account: FakeAccount }) => Response | Promise<Response>>;
};

type Call = { method: string; path: string; authorization: string | null; body: unknown };

export const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export function createFakeServer(accounts: FakeAccount[]) {
  const sessions = new Map<string, FakeAccount>();
  const revoked = new Set<string>();
  const calls: Call[] = [];
  let counter = 0;
  const overrides = new Map<string, () => Response | Promise<Response>>();

  async function handle(url: string, init: RequestInit = {}): Promise<Response> {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = (init.headers ?? {}) as Record<string, string>;
    const authorization = headers.Authorization ?? null;
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, authorization, body });

    const override = overrides.get(`${method} ${path.split('?')[0]}`);
    if (override) return override();

    if (method === 'POST' && path === '/api/auth/login') {
      const account = accounts.find((candidate) => candidate.email === body?.email && candidate.password === body?.password);
      if (!account) return json(401, { error: 'E-posta veya parola hatalı.' });
      counter += 1;
      const token = `token-${counter}-${'x'.repeat(40)}`;
      sessions.set(token, account);
      return json(200, { token, redirect: '/panel/urun-sec' });
    }

    const token = authorization?.replace(/^Bearer /, '') ?? '';
    const account = !revoked.has(token) ? sessions.get(token) : undefined;
    if (!account) return json(401, { error: 'Oturumunuz sona ermiş. Tekrar giriş yapın.', code: 'UNAUTHENTICATED' });

    const [pathname, search = ''] = path.split('?');
    const route = account.routes?.[`${method} ${pathname}`];
    if (route) return route({ body, path, query: new URLSearchParams(search), account });

    if (method === 'GET' && path === '/api/panel/me') return json(200, account.bootstrap);
    if (method === 'POST' && path === '/api/auth/logout') {
      revoked.add(token);
      return json(200, { redirect: '/giris' });
    }
    if (method === 'POST' && path === '/api/auth/mfa/code/verify') {
      if (body?.code !== '123456' || !account.afterMfa) return json(400, { error: 'Kod geçersiz, kullanılmış veya süresi dolmuş.' });
      account.bootstrap = account.afterMfa;
      return json(200, { verified: true, redirect: '/panel' });
    }
    if (method === 'POST' && path === '/api/auth/change-password') {
      if (body?.currentPassword !== account.password || !account.afterPasswordChange) return json(400, { error: 'Mevcut parolanız hatalı.' });
      account.bootstrap = account.afterPasswordChange;
      return json(200, { ok: true });
    }
    if (method === 'POST' && path === '/api/panel/active-product') {
      const next = account.afterSelect?.[body?.product as MobileProductCode];
      if (!next) return json(403, { error: 'Bu ürüne erişiminiz yok.', code: 'PRODUCT_ACCESS_REQUIRED' });
      account.bootstrap = next;
      return json(200, { redirect: '/panel' });
    }
    if (method === 'GET' && path.startsWith('/api/panel/notifications')) {
      const items = (account.notifications ?? []).map((item) => ({ ...item, type: 'SYSTEM', body: 'Ayrıntı', read: false, createdAt: '2026-10-08T08:00:00.000Z' }));
      return json(200, { page: 1, totalPages: 1, unreadTotal: items.length, notifications: items });
    }
    if (method === 'POST' && path === '/api/panel/notifications/read') return json(200, { ok: true, count: 1 });
    if (method === 'GET' && path === '/api/panel/student/home?scope=OD') return json(200, makeOdHome());
    return json(404, { error: 'Bulunamadı.' });
  }

  return {
    fetch: jest.fn(handle) as unknown as typeof fetch,
    calls,
    revoked,
    /** Belirli bir `METHOD /yol` yanıtını geçici olarak değiştirir. */
    override(key: string, reply: (() => Response | Promise<Response>) | null) {
      if (reply) overrides.set(key, reply);
      else overrides.delete(key);
    },
    called: (method: string, prefix: string) => calls.filter((call) => call.method === method && call.path.startsWith(prefix)),
  };
}
