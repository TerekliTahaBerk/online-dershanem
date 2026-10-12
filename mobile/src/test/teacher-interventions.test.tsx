import { fireEvent, waitFor } from '@testing-library/react-native';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

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
const revision = 'a'.repeat(64);
const bootstrap = () => makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['interventions', 'Müdahale', '/panel/ogretmen/mudahale']] });
const path = '/api/panel/staff/teacher/interventions';
it('teacher writes preserve retry key and case version; success refreshes the scoped inbox', async () => {
  let attempts = 0; const keys: string[] = [];
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, { ...inbox(), revision }),
    [`POST ${path}`]: ({ headers, body }) => {
      expect(body).toEqual({ operation: 'update', id: 'c1', input: { action: 'LOG_ACTION', expectedVersion: 4, note: 'Görüşme yapıldı' } });
      expect(headers['X-Od-Expected-Revision']).toBe(revision); keys.push(headers['X-Od-Idempotency-Key']);
      if (++attempts === 1) return jsonResponse(503, { error: 'Tekrar deneyin.' });
      return jsonResponse(200, { updated: true });
    },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/interventions');
  await press(h, await h.screen.findByTestId('teacher-intervention-c1', {}, WAIT));
  fireEvent.changeText(h.screen.getByTestId('intervention-note'), 'Görüşme yapıldı');
  await press(h, h.screen.getByTestId('intervention-log'));
  expect(await h.screen.findByText('Tekrar deneyin.', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('intervention-log'));
  await waitFor(() => expect(attempts).toBe(2), WAIT); expect(keys[0]).toBe(keys[1]);
  await waitFor(() => expect(h.server.called('GET', path).length).toBeGreaterThan(1), WAIT);
  expect(h.server.called('PATCH', '/api/panel/interventions/c1')).toHaveLength(0);
}, 30000);
it('manual create and rule generation use native forms; another owner has no write controls', async () => {
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, { ...inbox([row({ canAct: false, ownerName: 'Başka öğretmen' })]), revision }),
    [`POST ${path}`]: ({ body }) => (body as { operation: string }).operation === 'create' ? jsonResponse(200, { id: 'new' }) : jsonResponse(200, { createdCount: 2, reactivatedCount: 0, evaluatedStudentCount: 3 }),
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/interventions');
  await press(h, await h.screen.findByTestId('teacher-intervention-c1', {}, WAIT));
  expect(await h.screen.findByText('Bu kayıt başka bir sorumluya ait.', {}, WAIT)).toBeTruthy();
  expect(h.screen.queryByTestId('intervention-start')).toBeNull();
  await press(h, h.screen.getAllByLabelText('Kapat')[0]);
  await press(h, h.screen.getByTestId('teacher-intervention-create-open'));
  fireEvent.changeText(h.screen.getByTestId('intervention-create-search'), 'Ece');
  await press(h, await h.screen.findByTestId('intervention-create-student-s1', {}, WAIT));
  fireEvent.changeText(h.screen.getByTestId('intervention-create-explanation'), 'Tekrarda zorlanıyor');
  fireEvent.changeText(h.screen.getByTestId('intervention-create-action'), 'Görüşme planla');
  await press(h, h.screen.getByTestId('intervention-create-submit'));
  expect(await h.screen.findByText('Müdahale kaydı oluşturuldu.', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('teacher-intervention-generate'));
  expect(await h.screen.findByText('2 yeni açıklanabilir kayıt eklendi.', {}, WAIT)).toBeTruthy();
}, 30000);
it('stale case refreshes the teacher inbox and reports conflict', async () => {
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, { ...inbox(), revision }),
    [`POST ${path}`]: () => jsonResponse(409, { error: 'Kayıt değişti.' }),
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/interventions');
  await press(h, await h.screen.findByTestId('teacher-intervention-c1', {}, WAIT));
  await press(h, h.screen.getByTestId('intervention-start'));
  expect(await h.screen.findByText(/Kayıt değişti. Görünüm yenilendi/, {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(h.server.called('GET', path).length).toBeGreaterThan(1), WAIT);
});
