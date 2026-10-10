import { waitFor, within } from 'expo-router/testing-library';

import { makeBootstrap } from './fixtures';
import { account, boot, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
import { makeOdHome } from './od-fixtures';

beforeEach(() => secureStore.__store.clear());

const home = makeOdHome({
  now: {
    id: 'lesson-l-1',
    kind: 'OPEN_LESSON',
    reasonCode: 'LIVE_LESSON',
    title: 'Kesirler · Canlı ders',
    description: 'Ece Öğretmen · 8-A',
    reason: '10 dakika sonra başlıyor.',
    ctaLabel: 'Derse Katıl',
    joinable: true,
    target: { type: 'lesson', lessonId: 'l-1' },
    webPath: '/panel/ogrenci/takvim/l-1',
  },
  today: [
    {
      id: 'assignment:a-1',
      kind: 'ASSIGNMENT_DUE',
      title: 'Kesirler çalışma kâğıdı',
      subtitle: 'Son tarih',
      startsAt: null,
      dueAt: '2026-10-08T17:00:00.000Z',
      isFlexible: false,
      target: { type: 'assignment', assignmentId: 'a-1' },
      webPath: '/panel/ogrenci/odevler',
    },
  ],
  week: {
    weekStart: '2026-10-04T21:00:00.000Z',
    lessonsPlanned: 4,
    lessonsRemainingToday: 1,
    assignmentsDue: 3,
    assignmentsCompleted: 1,
    pendingAssignments: 2,
    overdueAssignments: 1,
    dueReviews: null,
  },
  insight: { sentence: 'Derslere düzenli katılıyorsun.', isEmpty: false },
});

describe('M2.1 OD Bugün', () => {
  it('OD kapsamlı yanıt: Şimdi, Bugün, Bu hafta ve gidişat sunucudan; Yön içeriği yok, Yön yalnız ayrı giriş satırı', async () => {
    const both = makeBootstrap({ products: { OD: 'ACTIVE', OK: 'ACTIVE' }, activeProduct: 'OD' });
    const h = await boot([account('ada@example.com', both, { routes: { 'GET /api/panel/student/home': () => jsonResponse(200, home) } })]);
    await signIn(h, 'ada@example.com');
    expect(await h.screen.findByText('Kesirler · Canlı ders', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/student/home')[0].path).toBe('/api/panel/student/home?scope=OD');
    expect(h.screen.getByText('Derse Katıl')).toBeTruthy();
    expect(h.screen.getByText('Kesirler çalışma kâğıdı')).toBeTruthy();
    expect(h.screen.getByText('4 ders')).toBeTruthy();
    expect(h.screen.getByText('1/3 tamamlandı')).toBeTruthy();
    expect(h.screen.getByText('1 çalışmanın süresi geçti; yetiştirmek için hâlâ geç değil')).toBeTruthy();
    expect(h.screen.getByText('Derslere düzenli katılıyorsun.')).toBeTruthy();
    expect(h.screen.getByTestId('od-other-OK')).toBeTruthy();
    expect(h.screen.queryByTestId('od-other-OD')).toBeNull();
    // Tekrar kuyruğu kapalı: sayı uydurulmaz.
    expect(h.screen.queryByText('Bugünün tekrarları')).toBeNull();
  });

  it('diğer çalışma alanı satırı seçimi sunucuya yazar (yetki istemcide verilmez)', async () => {
    const both = makeBootstrap({ products: { OD: 'ACTIVE', OK: 'ACTIVE' }, activeProduct: 'OD' });
    const h = await boot([
      account('ada@example.com', both, {
        routes: { 'GET /api/panel/student/home': () => jsonResponse(200, home) },
        afterSelect: { OK: makeBootstrap({ products: { OD: 'ACTIVE', OK: 'ACTIVE' }, activeProduct: 'OK' }) },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    await press(h, await h.screen.findByTestId('od-other-OK', {}, WAIT));
    expect(await h.screen.findByTestId('yon-today', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/active-product')[0].body).toEqual({ product: 'OK' });
  });

  it('profil yok: ürün verisi olmadan açıklamalı boş durum', async () => {
    const h = await boot([
      account('ada@example.com', makeBootstrap(), {
        routes: { 'GET /api/panel/student/home': () => jsonResponse(200, { ...makeOdHome(), state: 'NO_PROFILE', week: null }) },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const view = within(await h.screen.findByTestId('od-home', {}, WAIT));
    expect(await view.findByText('Hesabını hazırlıyoruz.', {}, WAIT)).toBeTruthy();
  });

  it('şimdi eylemi yok: sakin boş durum ve yalnız menüdeki hedeflere bağlantı', async () => {
    const h = await boot([account('ada@example.com', makeBootstrap())]);
    await signIn(h, 'ada@example.com');
    expect(await h.screen.findByTestId('od-now-empty', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Gidişatıma Bak')).toBeTruthy();
    expect(h.screen.getByText('Bugün dersin ya da teslimin yok. Yeni bir şey eklendiğinde ilk burada göreceksin.')).toBeTruthy();
  });

  it('sunucu hatası: kullanıcı hatası tekrar denenmez; mesaj sunucudan', async () => {
    const h = await boot([
      account('ada@example.com', makeBootstrap(), {
        routes: { 'GET /api/panel/student/home': () => jsonResponse(400, { error: 'Geçici sorun.' }) },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const view = within(await h.screen.findByTestId('od-home', {}, WAIT));
    expect(await view.findByText('Geçici sorun.', {}, WAIT)).toBeTruthy();
    // 400 kullanıcı hatası tekrarla düzelmez: "Tekrar dene" yalnız geçici hatalarda.
    expect(view.queryByText('Tekrar dene')).toBeNull();
  });

  it('bozuk yanıt (sözleşme dışı) başarılı sayılmaz', async () => {
    const h = await boot([
      account('ada@example.com', makeBootstrap(), {
        routes: { 'GET /api/panel/student/home': () => jsonResponse(200, { ...home, scope: 'OK' }) },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    expect(await h.screen.findByText('Beklenmedik bir yanıt aldık. Bir daha dener misin?', {}, WAIT)).toBeTruthy();
    await waitFor(() => expect(h.screen.queryByText('Kesirler · Canlı ders')).toBeNull());
  });
});
