import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { operationsRefreshInterval } from '@/features/staff/odk/management-operations';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

const path = '/api/panel/odk/management/operations';
const REV = 'a'.repeat(64);
const counters = { notStarted: 3, inProgress: 4, disconnected: 1, submitted: 2, autoSubmitted: 0, review: 1 };
const consoleView = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1, generatedAt: '2026-10-13T09:00:00.000Z', canReview: true, view: 'all', filters: { status: 'tumu', integrity: 'tumu', heartbeat: 'tumu' },
  exams: [{ id: 'e1', title: 'TYT Deneme 3', live: true }, { id: 'e2', title: 'AYT Deneme 1', live: false }],
  selected: { id: 'e1', title: 'TYT Deneme 3', live: true, startsAt: '2026-10-13T08:30:00.000Z', endsAt: '2026-10-13T11:15:00.000Z', meetRequired: true, attemptCount: 7, counters },
  rows: [{ id: 'a1', name: 'Ece Kaya', state: 'DISCONNECTED', statusLabel: 'Bağlantı koptu', tone: 'warning', lastActivityAt: '2026-10-13T08:55:00.000Z', answerCount: 41, integrity: { level: 'HIGH', label: 'Yüksek sinyal', tone: 'critical', reviewed: false }, meet: 'Onayladı' }],
  alerts: [{ attemptId: 'a1', name: 'Ece Kaya', text: 'Bağlantı 5 dk önce koptu' }],
  ...overrides,
});
const attempt = { contractVersion: 1, id: 'a1', name: 'Ece Kaya', examTitle: 'TYT Deneme 3', statusLabel: 'Bağlantı koptu', tone: 'warning', lastActivityAt: '2026-10-13T08:55:00.000Z', answerCount: 41, integrity: { level: 'HIGH', label: 'Yüksek sinyal', tone: 'critical', reviewed: false }, reviewedAt: null, revision: REV, canReview: true, events: [{ id: 'ev1', label: 'Bağlantı koptu', signal: true, at: '2026-10-13T08:55:00.000Z' }] };
const bootstrap = () => makeBootstrap({ role: 'ADMIN', products: { ODK: 'ACTIVE' }, activeProduct: 'ODK', adminNav: { primary: [['odk-ops', 'Canlı Operasyon', '/panel/odk/yonetim/operasyon']], sections: [] } });

describe('K04 canlı operasyon', () => {
  it('sayaçlar, uyarılar ve kayıtlar gösterilir; süzgeç ve deneme seçimi sunucuya gider', async () => {
    const h = await boot([account('admin@example.com', bootstrap(), { routes: { [`GET ${path}`]: () => jsonResponse(200, consoleView()) } })]);
    await signIn(h, 'admin@example.com');
    await go('/screen/odk-ops');
    expect(await h.screen.findByText('Bağlantı 5 dk önce koptu', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByTestId('ops-row-a1')).toBeTruthy();
    await press(h, h.screen.getByTestId('chip-kopuk'));
    await waitFor(() => expect(h.server.called('GET', path).some((call) => call.path.includes('durum=kopuk'))).toBe(true), WAIT);
    await press(h, await h.screen.findByTestId('chip-e2', {}, WAIT));
    await waitFor(() => expect(h.server.called('GET', path).some((call) => call.path.includes('deneme=e2') && call.path.includes('durum=kopuk'))).toBe(true), WAIT);
  }, 30000);

  it('otomatik yenileme 15 sn; kapatılınca veya kayıt paneli açıkken durur', async () => {
    expect(operationsRefreshInterval(true, false)).toBe(15_000);
    expect(operationsRefreshInterval(false, false)).toBe(false);
    expect(operationsRefreshInterval(true, true)).toBe(false);
    const h = await boot([account('admin@example.com', bootstrap(), { routes: { [`GET ${path}`]: () => jsonResponse(200, consoleView()) } })]);
    await signIn(h, 'admin@example.com');
    await go('/screen/odk-ops');
    expect(await h.screen.findByText(/Son güncelleme .* 15 sn'de bir/, {}, WAIT)).toBeTruthy();
    await act(async () => { fireEvent(h.screen.getByTestId('ops-auto-refresh'), 'valueChange', false); });
    expect(h.screen.getByTestId('ops-auto-refresh').props.value).toBe(false);
  });

  it('kayıt panelinde olaylar görünür; inceleme onayla, anahtar ve okunan sürümle gönderilir; 409 uyarı verir', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.at(-1)?.onPress?.());
    let reviews = 0;
    const h = await boot([account('admin@example.com', bootstrap(), { routes: {
      [`GET ${path}`]: () => jsonResponse(200, consoleView()),
      [`GET ${path}/attempts/a1`]: () => jsonResponse(200, attempt),
      [`POST ${path}/attempts/a1/review`]: () => (++reviews === 1 ? jsonResponse(200, { ok: true, id: 'a1', status: 'SUBMITTED', integrityReviewedAt: '2026-10-13T09:01:00.000Z', revision: 'b'.repeat(64), replayed: false }) : jsonResponse(409, { error: 'Kayıt başka bir işlemde değişti.', code: 'STALE_REVISION' })),
    } })]);
    await signIn(h, 'admin@example.com');
    await go('/screen/odk-ops');
    await press(h, await h.screen.findByTestId('ops-row-a1', {}, WAIT));
    expect(await h.screen.findByTestId('ops-attempt', {}, WAIT)).toBeTruthy();
    expect(h.screen.getAllByText('Bağlantı koptu').length).toBeGreaterThan(0);
    await press(h, h.screen.getByTestId('ops-review-MARK_REVIEWED'));
    expect(await h.screen.findByText('İnceleme kaydedildi.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', `${path}/attempts/a1/review`)[0].body).toEqual({ action: 'MARK_REVIEWED', idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/), expectedRevision: REV });
    await press(h, h.screen.getByTestId('ops-review-REQUIRE_REVIEW'));
    expect(await h.screen.findByText(/Güncel durum yüklendi/, {}, WAIT)).toBeTruthy();
  }, 30000);

  it('inceleme izni olmayan personel olayları görür, eylem görmez', async () => {
    const h = await boot([account('admin@example.com', bootstrap(), { routes: {
      [`GET ${path}`]: () => jsonResponse(200, consoleView({ canReview: false })),
      [`GET ${path}/attempts/a1`]: () => jsonResponse(200, { ...attempt, canReview: false }),
    } })]);
    await signIn(h, 'admin@example.com');
    await go('/screen/odk-ops');
    await press(h, await h.screen.findByTestId('ops-alert-a1', {}, WAIT));
    expect(await h.screen.findByTestId('ops-attempt', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByTestId('ops-review-MARK_REVIEWED')).toBeNull();
  });
});
