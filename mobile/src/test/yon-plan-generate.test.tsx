import { waitFor } from '@testing-library/react-native';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

const preference = { availableDays: [1, 3, 5], minutesPerDay: 45, nextExamAt: null, examLabel: null, planningEnabled: true, overwhelmPulse: null };
const plan = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1', status: 'DRAFT', statusLabel: 'Taslak', version: 3, weekStart: '2026-10-12T00:00:00.000Z', weekEnd: '2026-10-18T00:00:00.000Z', autoApproved: false, changeRequestCategory: null,
  tasks: [], draftTaskCount: 4, canComplete: false, canRequestChange: false,
  progress: { completed: 0, total: 0, remaining: 0, plannedMinutes: 0, completedMinutes: 0, percent: null },
  ...overrides,
});
const view = (current: Record<string, unknown> | null) => ({ contractVersion: 1, state: 'READY', generatedAt: '2026-10-13T08:00:00.000Z', todayKey: '2026-10-13', plan: current, requiresApproval: true, preference, coachSummary: null });

async function open(routes: Record<string, (request: { body: unknown }) => Response>) {
  const h = await boot([account('student@example.com', makeBootstrap({ role: 'STUDENT', products: { OK: 'ACTIVE' }, activeProduct: 'OK', extraNav: [['plan', 'Planım', '/panel/ogrenci/plan']] }), { routes })]);
  await signIn(h, 'student@example.com');
  await go('/screen/plan');
  return h;
}

describe('S14 plan üretimi', () => {
  it('plan yokken sürüm 0 ile oluşturur ve görünümü yeniler', async () => {
    const h = await open({
      'GET /api/panel/student/plan': () => jsonResponse(200, view(null)),
      'POST /api/panel/adaptive-plan/generate': () => jsonResponse(200, { id: 'p1', version: 1, taskCount: 5, rebalanced: false, status: 'DRAFT', autoApproved: false, requiresApproval: true, examCountdown: null }),
    });
    await press(h, await h.screen.findByTestId('yon-plan-generate', {}, WAIT));
    expect(await h.screen.findByText('Planın hazır 🎉 (5 çalışma). Koçun onayladığında görevlerin açılacak.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/adaptive-plan/generate')[0].body).toEqual({ expectedVersion: 0 });
    await waitFor(() => expect(h.server.called('GET', '/api/panel/student/plan').length).toBeGreaterThan(1), WAIT);
  }, 30000);

  it('taslak planı görülen sürümle dengeler; 409 uyarı verir ve yeniler', async () => {
    const h = await open({
      'GET /api/panel/student/plan': () => jsonResponse(200, view(plan())),
      'POST /api/panel/adaptive-plan/generate': () => jsonResponse(409, { error: 'Planın başka bir yerde güncellendi.', code: 'STALE_VERSION' }),
    });
    await press(h, await h.screen.findByTestId('yon-plan-generate', {}, WAIT));
    expect(await h.screen.findByText('Planın başka bir yerde güncellendi.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/adaptive-plan/generate')[0].body).toEqual({ expectedVersion: 3 });
    await waitFor(() => expect(h.server.called('GET', '/api/panel/student/plan').length).toBeGreaterThan(1), WAIT);
  });

  it('koç onaylı plan kilitlidir; düğme istek atmaz', async () => {
    const h = await open({ 'GET /api/panel/student/plan': () => jsonResponse(200, view(plan({ status: 'APPROVED', statusLabel: 'Onaylı', draftTaskCount: 0, canRequestChange: true }))) });
    expect(await h.screen.findByText('Planın koçun tarafından onaylandı 🔒 Değiştirmek istersen önce koçundan değişiklik isteyebilirsin.', {}, WAIT)).toBeTruthy();
    await press(h, h.screen.getByTestId('yon-plan-generate'));
    expect(h.server.called('POST', '/api/panel/adaptive-plan/generate')).toHaveLength(0);
  });
});
