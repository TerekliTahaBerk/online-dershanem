import { fireEvent, waitFor, within } from 'expo-router/testing-library';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT, type Harness } from './harness';
import { makeInsights } from './od-fixtures';

beforeEach(() => secureStore.__store.clear());

async function openProgress(h: Harness) {
  await h.screen.findByTestId('od-home', {}, WAIT);
  await go('/slot-3');
  return within(await h.screen.findByTestId('od-progress', {}, WAIT));
}

describe('M2.5 Gidişatım ve dış denemeler', () => {
  it('web Analiz servisi: anlatı + katılım/çalışma oranları; eski progress ucu çağrılmaz; Yön plan oranı yok', async () => {
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes: { 'GET /api/panel/student/insights': () => jsonResponse(200, makeInsights()) } })]);
    await signIn(h, 'ada@example.com');
    const view = await openProgress(h);
    expect(await view.findByText('Derslere düzenli katılıyorsun.', {}, WAIT)).toBeTruthy();
    expect(view.getByText('%90')).toBeTruthy();
    expect(view.getByText('9 / 10 ders')).toBeTruthy();
    expect(view.getByText('1 / 2 çalışma')).toBeTruthy();
    expect(view.queryByText(/Plan tamamlama/)).toBeNull();
    expect(h.server.called('GET', '/api/panel/student/progress')).toHaveLength(0);
  });

  it.each(['OK', 'ODK'] as const)('%s Analiz menüsü ortak servisi açar ve hedefi aynı alanda yeniler', async (product) => {
    let goal: string | null = null;
    const bootstrap = makeBootstrap({ products: { [product]: 'ACTIVE' }, extraNav: [['analiz', 'Analiz', '/panel/ogrenci/analiz']] });
    const h = await boot([account('ada@example.com', bootstrap, { routes: {
      'GET /api/panel/student/insights': () => jsonResponse(200, makeInsights({ weeklyGoal: goal })),
      'PATCH /api/panel/student/weekly-goal': ({ body }) => { goal = (body as { goal: string }).goal; return jsonResponse(200, { goal }); },
    } })]);
    await signIn(h, 'ada@example.com');
    await go('/screen/analiz');
    const view = within(await h.screen.findByTestId('od-progress', {}, WAIT));
    expect(await view.findByText('Derslere düzenli katılıyorsun.', {}, WAIT)).toBeTruthy();
    await press(h, view.getByTestId('weekly-goal-edit'));
    fireEvent.changeText(view.getByTestId('weekly-goal-input'), 'Her gün okuma yapacağım.');
    const before = h.server.called('GET', '/api/panel/student/insights').length;
    await press(h, view.getByTestId('weekly-goal-save'));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/student/insights').length).toBeGreaterThan(before), WAIT);
    expect(await view.findByText('Her gün okuma yapacağım.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/student/home')).toHaveLength(0);
  });

  it('haftalık hedef: sınır doğrulaması; kayıt sunucu onayından sonra; gidişat yenilenir', async () => {
    let goal: string | null = null;
    const h = await boot([
      account('ada@example.com', makeBootstrap(), {
        routes: {
          'GET /api/panel/student/insights': () => jsonResponse(200, makeInsights({ weeklyGoal: goal })),
          'PATCH /api/panel/student/weekly-goal': ({ body }) => {
            goal = (body as { goal: string }).goal;
            return jsonResponse(200, { goal });
          },
        },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const view = await openProgress(h);
    await press(h, await view.findByTestId('weekly-goal-edit', {}, WAIT));
    fireEvent.changeText(view.getByTestId('weekly-goal-input'), 'ab');
    expect(view.getByTestId('weekly-goal-save').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.changeText(view.getByTestId('weekly-goal-input'), '  Üç deneme çözeceğim.  ');
    const before = h.server.called('GET', '/api/panel/student/insights').length;
    await press(h, view.getByTestId('weekly-goal-save'));
    expect(await view.findByText('Hedefini kaydettik. Başarılar!', {}, WAIT)).toBeTruthy();
    expect(h.server.called('PATCH', '/api/panel/student/weekly-goal')[0].body).toEqual({ goal: 'Üç deneme çözeceğim.' });
    await waitFor(() => expect(h.server.called('GET', '/api/panel/student/insights').length).toBeGreaterThan(before), WAIT);
    expect(await view.findByText('Üç deneme çözeceğim.', {}, WAIT)).toBeTruthy();
  });

  it('haftalık hedef sunucu hatası: mesaj gösterilir, başarı gösterilmez', async () => {
    const h = await boot([
      account('ada@example.com', makeBootstrap(), {
        routes: {
          'GET /api/panel/student/insights': () => jsonResponse(200, makeInsights()),
          'PATCH /api/panel/student/weekly-goal': () => jsonResponse(429, { error: 'Çok fazla deneme yapıldı.' }),
        },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const view = await openProgress(h);
    await press(h, await view.findByTestId('weekly-goal-edit', {}, WAIT));
    fireEvent.changeText(view.getByTestId('weekly-goal-input'), 'Her gün okuma.');
    await press(h, view.getByTestId('weekly-goal-save'));
    expect(await view.findByText('Çok fazla deneme yapıldı.', {}, WAIT)).toBeTruthy();
    expect(view.queryByText('Hedefini kaydettik. Başarılar!')).toBeNull();
  });

  it('progressInsights kapalı (404 FEATURE_DISABLED): kırık ekran değil, açıklama', async () => {
    const h = await boot([
      account('ada@example.com', makeBootstrap(), { routes: { 'GET /api/panel/student/insights': () => jsonResponse(404, { error: 'Kapalı.', code: 'FEATURE_DISABLED' }) } }),
    ]);
    await signIn(h, 'ada@example.com');
    const view = await openProgress(h);
    expect(await view.findByText('Gidişat ekranı şimdilik kapalı.', {}, WAIT)).toBeTruthy();
  });

  it('dış denemeler: bayrak + menü öğesiyle açılır; Deneme Ligi uçları asla çağrılmaz; deneme seçimi sunucudan', async () => {
    const exams = {
      profile: { id: 'sp' },
      exams: [
        { id: 'e2', title: 'Kurum denemesi 2', takenAt: '2026-10-05T09:00:00.000Z' },
        { id: 'e1', title: 'Kurum denemesi 1', takenAt: '2026-09-20T09:00:00.000Z' },
      ],
      trend: [],
      current: { id: 'e2', title: 'Kurum denemesi 2', takenAt: '2026-10-05T09:00:00.000Z', durationMinutes: null, nextAction: null, total: 14.5, delta: 2, sections: [{ id: 's1', subjectName: 'Matematik', correctCount: 15, incorrectCount: 2, net: 14.5 }] },
    };
    const bootstrap = makeBootstrap({ flags: { mockExamAnalysis: true }, extraNav: [['mock-exams', 'Denemeler', '/panel/ogrenci/denemeler']] });
    const h = await boot([
      account('ada@example.com', bootstrap, {
        routes: {
          'GET /api/panel/student/insights': () => jsonResponse(200, makeInsights({ mockExamAnalysis: true })),
          'GET /api/panel/mock-exams': ({ query }) => jsonResponse(200, query.get('deneme') === 'e1' ? { ...exams, current: { ...exams.current, id: 'e1', title: 'Kurum denemesi 1', total: 12.5, delta: null } } : exams),
        },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const progress = await openProgress(h);
    await press(h, await progress.findByText('Dış denemelerimi gör', {}, WAIT));
    const view = within(await h.screen.findByTestId('external-mock-exams', {}, WAIT));
    expect(await view.findByText('14,5', {}, WAIT)).toBeTruthy();
    await press(h, view.getByTestId('mock-exam-e1'));
    expect(await view.findByText('12,5', {}, WAIT)).toBeTruthy();
    expect(h.server.calls.some((call) => call.path.includes('/odk/'))).toBe(false);
    expect(h.server.called('GET', '/api/panel/mock-exams').map((call) => call.path)).toContain('/api/panel/mock-exams?deneme=e1');
  });
});
