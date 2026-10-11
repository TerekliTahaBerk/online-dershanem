import { fireEvent, waitFor } from '@testing-library/react-native';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

const center = {
  contractVersion: 1,
  generatedAt: '2026-10-11T08:00:00.000Z',
  partialData: false,
  group: 'tumu',
  groups: [
    { id: 'tumu', label: 'Tümü', count: 2 },
    { id: 'OD', label: 'onlinedershanem.', count: 1 },
    { id: 'COMMERCE', label: 'Ticaret', count: 1 },
  ],
  openActionCount: 2,
  blockingCount: 1,
  actions: [
    { id: 'a1', code: 'PROVISIONING_FAILED', group: 'COMMERCE', severity: 'BLOCKING', title: 'Provizyon başarısız', subject: 'Paket A', ageLabel: '2 sa', owner: null, ctaLabel: 'Siparişi aç', createdAt: '2026-10-11T06:00:00.000Z', webPath: '/panel/yonetim/siparisler/o1' },
    { id: 'a2', code: 'STUDENT_NO_GROUP', group: 'OD', severity: 'ACTION_REQUIRED', title: 'Grupsuz öğrenci', subject: 'Ece', ageLabel: '1 g', owner: 'Ada', ctaLabel: 'Öğrenciyi aç', createdAt: null, webPath: '/panel/yonetim/ogrenciler/s1' },
  ],
  summary: [{ id: 'today_lessons', label: 'Bugünkü dersler', value: 4, hint: '2 tamamlandı', tone: 'neutral', available: true, webPath: null }],
  risk: { critical: 1, watch: 2, normal: 3, total: 6 },
  health: [{ id: 'database', label: 'Veritabanı', status: 'ok', detail: '12 ms' }],
  activities: [],
};

const admin = () => makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE', OK: 'ACTIVE', ODK: 'ACTIVE' }, activeProduct: 'OD' });

describe('Faz 1 yönetim kabuğu', () => {
  it('ADMIN ilk sekmede Operasyon Merkezi\'ni görür; sekmeler ve menü sunucu menüsünden gelir', async () => {
    const h = await boot([account('admin@example.com', admin(), { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, center) } })]);
    await signIn(h, 'admin@example.com');
    expect(await h.screen.findByTestId('admin-operations-center', {}, WAIT)).toBeTruthy();
    expect(await h.screen.findByText('Provizyon başarısız', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('2 açık iş · 1 engelleyici')).toBeTruthy();
    expect(h.screen.getByText('Engelleyici')).toBeTruthy();
    expect(h.screen.getByTestId('nav-operations')).toBeTruthy();
    expect(h.screen.queryByText('Yönetim web panelinde')).toBeNull();

    await press(h, h.screen.getByTestId('nav-menu'));
    expect(await h.screen.findByTestId('menu-people', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByTestId('menu-orders')).toBeTruthy();
    expect(h.screen.getByTestId('menu-admin-search')).toBeTruthy();
  });

  it('alan süzgeci sunucuya ?grup= ile gider; satır yetkili menüdeki bölüme (en uzun önek) açılır', async () => {
    const h = await boot([
      account('admin@example.com', admin(), {
        routes: { 'GET /api/panel/admin/operations-center': ({ query }) => jsonResponse(200, query.get('grup') === 'COMMERCE' ? { ...center, group: 'COMMERCE', actions: [center.actions[0]] } : center) },
      }),
    ]);
    await signIn(h, 'admin@example.com');
    await press(h, await h.screen.findByTestId('chip-COMMERCE', {}, WAIT));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/operations-center').some((call) => call.path.endsWith('?grup=COMMERCE'))).toBe(true), WAIT);
    await press(h, await h.screen.findByTestId('admin-action-a1', {}, WAIT));
    // "Siparişler" henüz native değil: faz etiketli yer tutucu (P2), başka ekrana düşmez.
    expect(await h.screen.findByTestId('placeholder-orders', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText(/yönetim bölümü mobil uygulamaya geliyor/)).toBeTruthy();
  });

  it('global arama: kısa sorguda yalnız komutlar; sonuçlar türüne göre gruplanır, menüde karşılığı yoksa "Mobilde yakında"', async () => {
    const h = await boot([
      account('admin@example.com', admin(), {
        routes: {
          'GET /api/panel/admin/operations-center': () => jsonResponse(200, center),
          'GET /api/panel/admin-search': ({ query }) =>
            jsonResponse(200, {
              query: query.get('q') ?? '',
              commands: [],
              results: (query.get('q') ?? '').length < 2 ? [] : [
                { kind: 'ORDER', id: 'o1', label: 'Sipariş #o1', detail: 'Paket A', href: '/panel/yonetim/siparisler/o1' },
                { kind: 'STUDENT', id: 's1', label: 'Ece Kaya', detail: 'OD', href: '/panel/yonetim/ogrenciler/s1' },
              ],
            }),
        },
      }),
    ]);
    await signIn(h, 'admin@example.com');
    await press(h, await h.screen.findByTestId('admin-search-open', {}, WAIT));
    expect(await h.screen.findByText('Aramak için en az 2 karakter yaz.', {}, WAIT)).toBeTruthy();
    fireEvent.changeText(h.screen.getByTestId('admin-search-input'), 'ece');
    expect(await h.screen.findByText('Ece Kaya', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Siparişler')).toBeTruthy();
    expect(h.screen.getByText('Mobilde yakında')).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/admin-search').some((call) => call.path === '/api/panel/admin-search?q=ece')).toBe(true);
  });

  it('yönetim arama rotası öğrenciye kapalıdır (derin bağlantı yetki doğurmaz)', async () => {
    const h = await boot([account('ada@example.com', makeBootstrap())]);
    await signIn(h, 'ada@example.com');
    await go('/admin/search');
    expect(await h.screen.findByText('Bu bölüm hesabında yok', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/admin-search')).toHaveLength(0);
  });
});
