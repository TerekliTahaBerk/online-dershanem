import { fireEvent, waitFor } from '@testing-library/react-native';

import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

const vocabulary = {
  reasons: [{ value: 'OVERDUE_WORK', label: 'Teslimi geçen çalışmalar' }],
  statuses: [
    { value: 'OPEN', label: 'Yeni' },
    { value: 'IN_PROGRESS', label: 'İnceleniyor' },
    { value: 'SNOOZED', label: 'Bekletildi' },
    { value: 'RESOLVED', label: 'Çözüldü' },
    { value: 'FALSE_POSITIVE', label: 'Yanlış işaret' },
  ],
  outcomes: [
    { value: 'SUPPORT_PLANNED', label: 'Destek adımı planlandı' },
    { value: 'FAMILY_CONTACTED', label: 'Aileyle iletişim kuruldu' },
  ],
  falsePositiveReasons: [{ value: 'CONTEXT_MISSING', label: 'Bağlam eksikti' }],
  activities: [{ value: 'GENERATED', label: 'Kural sinyali oluşturdu' }],
  manualReasons: [{ value: 'TEACHER_OBSERVED', label: 'Gözlem / diğer' }],
  snoozeDays: [1, 3, 7],
};

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  studentName: 'Ece Kaya',
  reasonCode: 'OVERDUE_WORK',
  explanation: 'Üç çalışma gecikti',
  suggestedAction: 'Kısa görüşme',
  evidenceCount: 3,
  dueAt: '2099-10-12T20:59:59.999Z',
  status: 'OPEN',
  ownerName: null,
  canAct: true,
  firstActionAt: null,
  snoozedUntil: null,
  outcomeCode: null,
  version: 4,
  activities: [{ id: 'a1', type: 'GENERATED', note: null, outcomeCode: null, falsePositiveReason: null, actorName: 'Sistem', createdAt: '2026-10-11T08:00:00.000Z' }],
  ...overrides,
});
const inbox = (rows = [row()]) => ({ contractVersion: 1, rows, students: [{ id: 's1', name: 'Ece Kaya' }, { id: 's2', name: 'Can Demir' }], vocabulary });
const admin = () => makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' });
const center = { contractVersion: 1, generatedAt: '2026-10-11T08:00:00.000Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };

async function openInbox(routes: NonNullable<FakeAccount['routes']>) {
  const h = await boot([account('admin@example.com', admin(), { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, center), ...routes } })]);
  await signIn(h, 'admin@example.com');
  await press(h, await h.screen.findByTestId('nav-operations', {}, WAIT));
  return h;
}

describe('Faz 2.1 müdahale kutusu', () => {
  it('kayıtlar sunucu sözlüğüyle listelenir; çözüm sürümle ve seçilen sonuçla web ucuna gider', async () => {
    let version = 4;
    const h = await openInbox({
      'GET /api/panel/admin/interventions': () => jsonResponse(200, inbox([row({ version })])),
      'PATCH /api/panel/interventions/c1': () => {
        version += 1;
        return jsonResponse(200, { updated: true });
      },
    });
    expect(await h.screen.findByText('Ece Kaya', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Teslimi geçen çalışmalar · Sahipsiz')).toBeTruthy();
    expect(h.screen.getByText('1 açık · 0 gecikmiş · 0 yanlış işaret')).toBeTruthy();
    await press(h, h.screen.getByTestId('admin-intervention-c1'));
    await press(h, await h.screen.findByTestId('intervention-outcome-FAMILY_CONTACTED', {}, WAIT));
    fireEvent.changeText(h.screen.getByTestId('intervention-note'), 'Veliyle konuşuldu');
    await press(h, h.screen.getByTestId('intervention-resolve'));
    await waitFor(() => expect(h.server.called('PATCH', '/api/panel/interventions/c1')).toHaveLength(1), WAIT);
    expect(h.server.called('PATCH', '/api/panel/interventions/c1')[0].body).toEqual({ action: 'RESOLVE', outcomeCode: 'FAMILY_CONTACTED', note: 'Veliyle konuşuldu', expectedVersion: 4 });
    // Sunucu onayından sonra liste yeniden çekilir.
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/interventions').length).toBeGreaterThanOrEqual(2), WAIT);
  });

  it('409: üzerine yazılmaz; açık mesaj gösterilir ve liste yenilenir', async () => {
    const h = await openInbox({
      'GET /api/panel/admin/interventions': () => jsonResponse(200, inbox()),
      'PATCH /api/panel/interventions/c1': () => jsonResponse(409, { error: 'Kayıt başka bir sekmede değişti.' }),
    });
    await press(h, await h.screen.findByTestId('admin-intervention-c1', {}, WAIT));
    await press(h, await h.screen.findByTestId('intervention-assign', {}, WAIT));
    expect(await h.screen.findByText(/Kayıt başka bir sekmede değişti\. Görünüm yenilendi/, {}, WAIT)).toBeTruthy();
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/interventions').length).toBeGreaterThanOrEqual(2), WAIT);
  });

  it('kapanmış kayıt yalnız yeniden açılabilir', async () => {
    const h = await openInbox({ 'GET /api/panel/admin/interventions': () => jsonResponse(200, inbox([row({ status: 'RESOLVED', outcomeCode: 'SUPPORT_PLANNED' })])) });
    await press(h, await h.screen.findByTestId('chip-ALL', {}, WAIT));
    await press(h, await h.screen.findByTestId('admin-intervention-c1', {}, WAIT));
    expect(await h.screen.findByTestId('intervention-reopen', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByTestId('intervention-resolve')).toBeNull();
  });

  it('elle kayıt: öğrenci aranır, şema sınırları istemcide de uygulanır, takip tarihi gün anahtarıdır', async () => {
    const h = await openInbox({
      'GET /api/panel/admin/interventions': () => jsonResponse(200, inbox([])),
      'POST /api/panel/interventions': () => jsonResponse(200, { id: 'c9' }),
    });
    await press(h, await h.screen.findByTestId('admin-intervention-create-open', {}, WAIT));
    fireEvent.changeText(await h.screen.findByTestId('intervention-create-search', {}, WAIT), 'can');
    await press(h, await h.screen.findByTestId('intervention-create-student-s2', {}, WAIT));
    fireEvent.changeText(h.screen.getByTestId('intervention-create-explanation'), 'kısa');
    fireEvent.changeText(h.screen.getByTestId('intervention-create-action'), 'Ara');
    expect(h.screen.getByTestId('intervention-create-submit').props.accessibilityState?.disabled).toBe(true);
    fireEvent.changeText(h.screen.getByTestId('intervention-create-explanation'), 'Derslerde dikkat dağınık');
    fireEvent.changeText(h.screen.getByTestId('intervention-create-action'), 'Veliyi ara');
    await press(h, h.screen.getByTestId('intervention-create-submit'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/interventions')).toHaveLength(1), WAIT);
    const body = h.server.called('POST', '/api/panel/interventions')[0].body as Record<string, string>;
    expect(body).toMatchObject({ studentId: 's2', reasonCode: 'TEACHER_OBSERVED', explanation: 'Derslerde dikkat dağınık', suggestedAction: 'Veliyi ara' });
    expect(body.followUpDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await h.screen.findByText('Müdahale kaydı oluşturuldu.', {}, WAIT)).toBeTruthy();
  });

  it('bayrak kapalı (404 FEATURE_DISABLED): ekran açıkça kapalı der, sahte veri yok', async () => {
    const h = await openInbox({ 'GET /api/panel/admin/interventions': () => jsonResponse(404, { error: 'Müdahale kutusu henüz açık değil.', code: 'FEATURE_DISABLED' }) });
    expect(await h.screen.findByText('Müdahale kutusu şu an kullanıma kapalı.', {}, WAIT)).toBeTruthy();
  });
});
