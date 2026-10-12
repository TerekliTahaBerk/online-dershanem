import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, RefreshControl } from 'react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
beforeEach(() => secureStore.__store.clear());
const path = '/api/panel/staff/coach/students/s1/preparation';
const detail = { contractVersion: 1, studentId: 's1', name: 'Ece', classLevel: null, targetGoal: null, nextSession: null, plan: null, recentSessions: [], canReadInternal: true, notes: [] };
const base = { contractVersion: 1, studentId: 's1', weekStart: '2026-10-12T00:00:00Z', revision: 'a'.repeat(64), plans: [{ id: 'p1', status: 'DRAFT', weekStart: '2026-10-12T00:00:00Z', version: 1, taskCount: 2 }], templates: [{ id: 't1', title: 'Başlangıç' }], subjects: ['Matematik'], nextSession: null, goals: [], summary: null };
const bootstrap = () => makeBootstrap({ role: 'TEACHER', products: { OK: 'ACTIVE' }, activeProduct: 'OK', extraNav: [['coach-students', 'Öğrenciler', '/panel/ogretmen/yon/ogrenciler']] });
it('uncertain write preserves original command, revision and key across refresh', async () => {
  let revision = base.revision; let attempts = 0; const keys: string[] = [];
  const h = await boot([account('coach@example.com', bootstrap(), { routes: {
    'GET /api/panel/staff/coach/students/s1': () => jsonResponse(200, detail),
    [`GET ${path}`]: () => jsonResponse(200, { ...base, revision }),
    [`POST ${path}`]: ({ body, headers }) => { expect(body).toEqual({ action: 'goal', payload: { studentId: 's1', kind: 'PLAN_COMPLETION', targetValue: 90, nearTermNote: '' } }); expect(headers['X-Od-Expected-Revision']).toBe(base.revision); keys.push(headers['X-Od-Idempotency-Key']); return ++attempts === 1 ? jsonResponse(503, { error: 'Tekrar deneyin.' }) : jsonResponse(200, { ok: true, id: 'g1', replayed: true }); },
  } })]);
  await signIn(h, 'coach@example.com'); await go('/coach/student/s1');
  await press(h, await h.screen.findByTestId('prep-open-goal', {}, WAIT)); await press(h, h.screen.getByTestId('prep-save-goal'));
  expect(await h.screen.findByText('Tekrar deneyin.', {}, WAIT)).toBeTruthy(); revision = 'b'.repeat(64);
  await act(async () => { h.screen.UNSAFE_getAllByType(RefreshControl)[0].props.onRefresh(); });
  await waitFor(() => expect(h.server.called('GET', path).length).toBeGreaterThan(1), WAIT);
  await press(h, h.screen.getByTestId('prep-save-goal')); expect(await h.screen.findByText('İşlem kaydedildi.', {}, WAIT)).toBeTruthy(); expect(keys[0]).toBe(keys[1]);
}, 30000);
it('all six forms submit native commands; destructive and shared actions require confirmation', async () => {
  const commands: { action: string; payload?: Record<string, unknown> }[] = [];
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.find((b) => b.text === 'Onayla')?.onPress?.());
  const h = await boot([account('coach@example.com', bootstrap(), { routes: {
    'GET /api/panel/staff/coach/students/s1': () => jsonResponse(200, detail), [`GET ${path}`]: () => jsonResponse(200, base),
    [`POST ${path}`]: ({ body }) => { commands.push(body as typeof commands[number]); return jsonResponse(200, { ok: true, id: 'id1', replayed: false }); },
  } })]);
  await signIn(h, 'coach@example.com'); await go('/coach/student/s1');
  await press(h, await h.screen.findByTestId('prep-open-task', {}, WAIT)); fireEvent.changeText(h.screen.getByLabelText('Görev başlığı'), 'Kısa tekrar'); await press(h, h.screen.getByTestId('prep-save-task'));
  await waitFor(() => expect(commands).toHaveLength(1), WAIT);
  for (const action of ['copy', 'template', 'summary', 'record', 'goal']) {
    await press(h, h.screen.getByTestId(`prep-open-${action}`));
    await press(h, h.screen.getByTestId(`prep-save-${action === 'summary' ? 'summary-true' : action}`));
    await waitFor(() => expect(h.screen.queryByTestId(`prep-save-${action === 'summary' ? 'summary-true' : action}`)).toBeNull(), WAIT);
  }
  expect(commands.map((c) => c.action)).toEqual(['task', 'copy', 'template', 'summary', 'record', 'goal']); expect(alert).toHaveBeenCalledTimes(3);
  expect(commands.find((c) => c.action === 'summary')?.payload?.publish).toBe(true);
}, 30000);
it('conflict refreshes data and invalid percentage blocks goal write', async () => {
  const h = await boot([account('coach@example.com', bootstrap(), { routes: {
    'GET /api/panel/staff/coach/students/s1': () => jsonResponse(200, detail), [`GET ${path}`]: () => jsonResponse(200, base), [`POST ${path}`]: () => jsonResponse(409, { error: 'Değişti.' }),
  } })]);
  await signIn(h, 'coach@example.com'); await go('/coach/student/s1'); await press(h, await h.screen.findByTestId('prep-open-goal', {}, WAIT));
  fireEvent.changeText(h.screen.getByLabelText('Hedef değer'), '101'); await press(h, h.screen.getByTestId('prep-save-goal')); expect(h.server.called('POST', path)).toHaveLength(0);
  fireEvent.changeText(h.screen.getByLabelText('Hedef değer'), '80'); await press(h, h.screen.getByTestId('prep-save-goal')); expect(await h.screen.findByText(/Hazırlık verileri değişti/, {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(h.server.called('GET', path).length).toBeGreaterThan(1), WAIT);
});
