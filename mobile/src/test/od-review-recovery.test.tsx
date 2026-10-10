import { waitFor, within } from 'expo-router/testing-library';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT, type Harness } from './harness';
import { makeRecovery, makeReviewQueue, makeWeeklyDigest } from './od-fixtures';

beforeEach(() => secureStore.__store.clear());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const bothFlags = makeBootstrap({ flags: { reviewQueue: true, recoveryPackage: true }, extraNav: [['review-recovery', 'Tekrar ve telafi', '/panel/ogrenci/tekrar']] });

async function open(h: Harness, path: string) {
  await h.screen.findByTestId('od-home', {}, WAIT);
  await go(path);
  return within(await h.screen.findByTestId('od-review-recovery', {}, WAIT));
}

describe('M2.6 Tekrar, telafi ve kalan OD menüsü', () => {
  it('tekrar: yanıt idempotency anahtarıyla; ağ hatasında aynı anahtar; sonuç sunucudan; erteleme ayrı uç', async () => {
    let answered = false;
    const h = await boot([
      account('ada@example.com', bothFlags, {
        routes: {
          'GET /api/panel/student/review-queue': () => jsonResponse(200, answered ? { ...makeReviewQueue(), items: [] } : makeReviewQueue()),
          'POST /api/panel/review-queue/rv-1/respond': () => {
            answered = true;
            return jsonResponse(200, { nextDueAt: '2026-10-11T06:00:00.000Z', stage: 1, status: 'ACTIVE', replayed: false });
          },
        },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const view = await open(h, '/od/review-recovery?tab=tekrar');
    await view.findByText('Kesirler tekrarı', {}, WAIT);
    h.server.override('POST /api/panel/review-queue/rv-1/respond', () => Promise.reject(new TypeError('Network request failed')));
    await press(h, view.getByTestId('review-rv-1-CORRECT'));
    expect(await view.findByText('Sunucuya ulaşamadık. İnternet bağlantını kontrol edip bir daha dener misin?', {}, WAIT)).toBeTruthy();
    h.server.override('POST /api/panel/review-queue/rv-1/respond', null);
    await press(h, view.getByTestId('review-rv-1-CORRECT'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/review-queue/rv-1/respond')).toHaveLength(2), WAIT);
    const [first, second] = h.server.called('POST', '/api/panel/review-queue/rv-1/respond');
    expect((first.body as { idempotencyKey: string }).idempotencyKey).toMatch(UUID);
    expect(second.body).toEqual(first.body);
    expect(await view.findByText('Bugünlük tekrarların bitti.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/review-queue/rv-1/defer')).toHaveLength(0);
  });

  it('tekrar ertele: mevcut defer ucu çağrılır, kuyruk yenilenir', async () => {
    const h = await boot([
      account('ada@example.com', bothFlags, {
        routes: {
          'GET /api/panel/student/review-queue': () => jsonResponse(200, makeReviewQueue()),
          'POST /api/panel/review-queue/rv-1/defer': () => new Response(null, { status: 204 }),
        },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const view = await open(h, '/od/review-recovery');
    await press(h, await view.findByTestId('review-rv-1-defer', {}, WAIT));
    expect(await view.findByText('Tamam, bu tekrarı yarına bıraktık.', {}, WAIT)).toBeTruthy();
  });

  it('telafi: bağlantıdaki ders öne; adım tamamla + mini kontrol sunucu onayından sonra; tamamlanma sunucudan', async () => {
    const h = await boot([
      account('ada@example.com', bothFlags, {
        routes: {
          'GET /api/panel/student/recovery': () => jsonResponse(200, makeRecovery()),
          'POST /api/panel/recovery-packages/rp-1/items/ri-1/complete': () => jsonResponse(200, { completed: false, replayed: false }),
          'POST /api/panel/recovery-packages/rp-1/checkpoint': () => jsonResponse(200, { completed: true }),
        },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const view = await open(h, '/od/review-recovery?tab=telafi&lessonId=l-missed');
    await press(h, await view.findByTestId('recovery-step-ri-1', {}, WAIT));
    expect(await view.findByText('Adım tamamlandı olarak kaydedildi.', {}, WAIT)).toBeTruthy();
    await press(h, view.getByTestId('recovery-rp-1-READY'));
    expect(await view.findByText('Telafiyi tamamladın, aferin!', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/recovery-packages/rp-1/checkpoint')[0].body).toEqual({ response: 'READY' });
  });

  it('yalnız telafi bayrağı açık: tekrar sekmesi yok, tekrar ucu çağrılmaz', async () => {
    const recoveryOnly = makeBootstrap({ flags: { recoveryPackage: true }, extraNav: [['review-recovery', 'Tekrar ve telafi', '/panel/ogrenci/telafi']] });
    const h = await boot([account('ada@example.com', recoveryOnly, { routes: { 'GET /api/panel/student/recovery': () => jsonResponse(200, makeRecovery()) } })]);
    await signIn(h, 'ada@example.com');
    const view = await open(h, '/screen/review-recovery');
    expect(await view.findByText('Paragrafta ana fikir', {}, WAIT)).toBeTruthy();
    expect(view.queryByTestId('tab-tekrar')).toBeNull();
    expect(h.server.called('GET', '/api/panel/student/review-queue')).toHaveLength(0);
  });

  it('menüde olmayan tekrar/telafi derin bağlantısı açılmaz', async () => {
    const h = await boot([account('ada@example.com', makeBootstrap())]);
    await signIn(h, 'ada@example.com');
    await h.screen.findByTestId('od-home', {}, WAIT);
    await go('/od/review-recovery?tab=telafi');
    expect(await h.screen.findByText('Bu bölümü burada bulamadık', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/student/recovery')).toHaveLength(0);
  });

  it('haftalık özet gösterilir ve geri bildirim sunucuya yazılır; check-in native ekran açar (kırık ekran yok)', async () => {
    const bootstrap = makeBootstrap({
      flags: { parentWeeklyDigest: true, studentCheckIn: true },
      extraNav: [
        ['weekly-digest', 'Haftalık özet', '/panel/ogrenci/haftalik'],
        ['check-in', 'Durum bildir', '/panel/ogrenci/check-in'],
      ],
    });
    const h = await boot([
      account('ada@example.com', bootstrap, {
        routes: {
          'GET /api/panel/student/weekly-digest': () => jsonResponse(200, makeWeeklyDigest()),
          'POST /api/panel/weekly-digests/wd-1/feedback': () => jsonResponse(200, { saved: true }),
        },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    await h.screen.findByTestId('od-home', {}, WAIT);
    await go('/screen/weekly-digest');
    const digest = within(await h.screen.findByTestId('od-weekly-digest', {}, WAIT));
    expect(await digest.findByText('Tüm derslere katıldın.', {}, WAIT)).toBeTruthy();
    await press(h, digest.getByTestId('digest-helpful'));
    expect(await digest.findByText('Teşekkürler, geri bildirimini aldık.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/weekly-digests/wd-1/feedback')[0].body).toEqual({ helpful: true, anxietyPulse: null });
    // M3: check-in artık OD + Yön ortak native ekran.
    await go('/screen/check-in');
    expect(await h.screen.findByTestId('check-in', {}, WAIT)).toBeTruthy();
  });
});
