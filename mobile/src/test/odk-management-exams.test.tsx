import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { RefreshControl } from 'react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
beforeEach(() => secureStore.__store.clear());
const path = '/api/panel/odk/management/exams';
const base = { contractVersion: 1, canCreate: true, revision: 'a'.repeat(64), view: 'tumu', query: '', familyCode: null, status: null, total: 0, page: 1, pageSize: 50, views: [{ id: 'tumu', label: 'Tümü', count: 0 }, { id: 'hazirlik', label: 'Hazırlıkta', count: 0 }], families: [{ code: 'TYT', name: 'TYT', legacy: true }], series: [] as { id: string; title: string; familyCode: string }[], templates: [{ code: 'TYT_FULL', familyCode: 'TYT', label: 'TYT tam deneme', mode: 'FULL_TEMPLATE', durationMinutes: 165, questionCount: 120, sections: [{ title: 'Matematik', questionCount: 40 }] }], rows: [] };
const bootstrap = () => makeBootstrap({ role: 'ADMIN', products: { ODK: 'ACTIVE' }, activeProduct: 'ODK', adminNav: { primary: [['odk-exams', 'Denemeler', '/panel/odk/yonetim/sinavlar']], sections: [] } });
it('native exam create freezes full request, key and revision across an uncertain response and catalog refresh', async () => {
  let current = { ...base }; const keys: string[] = []; let attempts = 0;
  const h = await boot([account('admin@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, current), [`POST ${path}`]: ({ body, headers }) => {
      expect(body).toMatchObject({ operation: 'exam', input: { title: 'Türkçe Sınavı', slug: 'turkce-sinavi', examFamilyCode: 'TYT', templateCode: 'TYT_FULL', structureMode: 'FULL_TEMPLATE' } }); keys.push(headers['X-Od-Idempotency-Key']); expect(headers['X-Od-Expected-Revision']).toBe(base.revision);
      return ++attempts === 1 ? jsonResponse(503, { error: 'Tekrar deneyin.' }) : jsonResponse(200, { ok: true, id: 'e1', replayed: true });
    },
  } })]);
  await signIn(h, 'admin@example.com'); await go('/screen/odk-exams'); expect(await h.screen.findByTestId('odk-management-exams', {}, WAIT)).toBeTruthy();
  fireEvent.changeText(await h.screen.findByTestId('odk-create-title', {}, WAIT), 'Türkçe Sınavı'); await press(h, h.screen.getByTestId('odk-create-submit'));
  expect(await h.screen.findByText('Tekrar deneyin.', {}, WAIT)).toBeTruthy(); current = { ...base, revision: 'b'.repeat(64) };
  await act(async () => { h.screen.UNSAFE_getAllByType(RefreshControl)[0].props.onRefresh(); }); await waitFor(() => expect(h.server.called('GET', path).length).toBeGreaterThan(1), WAIT);
  await press(h, h.screen.getByTestId('odk-create-submit')); expect(await h.screen.findByText(/Deneme taslağı oluşturuldu/, {}, WAIT)).toBeTruthy(); expect(keys[0]).toBe(keys[1]);
}, 30000);
it('series creation selects the refreshed series for the following exam', async () => {
  let current = { ...base }; let created = false;
  const h = await boot([account('admin@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, current), [`POST ${path}`]: ({ body }) => {
      const command = body as { operation: string; input: { seriesId?: string } }; if (!created) { expect(command.operation).toBe('series'); current = { ...base, revision: 'c'.repeat(64), series: [{ id: 's1', title: 'Yeni seri', familyCode: 'TYT' }] }; created = true; return jsonResponse(200, { ok: true, id: 's1', replayed: false }); }
      expect(command.operation).toBe('exam'); expect(command.input.seriesId).toBe('s1'); return jsonResponse(200, { ok: true, id: 'e1', replayed: false });
    },
  } })]);
  await signIn(h, 'admin@example.com'); await go('/screen/odk-exams'); await press(h, await h.screen.findByText('Yeni seri', {}, WAIT)); fireEvent.changeText(h.screen.getByTestId('odk-create-title'), 'Yeni seri'); await press(h, h.screen.getByTestId('odk-create-submit'));
  expect(await h.screen.findByText(/Seri oluşturuldu ve seçildi/, {}, WAIT)).toBeTruthy(); fireEvent.changeText(h.screen.getByTestId('odk-create-title'), 'Seriye yeni deneme'); await press(h, h.screen.getByTestId('odk-create-submit')); expect(await h.screen.findByText(/Deneme taslağı oluşturuldu/, {}, WAIT)).toBeTruthy();
});
it('read-only operator cannot see creation form', async () => {
  const h = await boot([account('admin@example.com', bootstrap(), { routes: { [`GET ${path}`]: () => jsonResponse(200, { ...base, canCreate: false, templates: [], series: [] }) } })]);
  await signIn(h, 'admin@example.com'); await go('/screen/odk-exams'); expect(await h.screen.findByText('Bu görünümde deneme yok', {}, WAIT)).toBeTruthy(); expect(h.screen.queryByTestId('odk-create-submit')).toBeNull();
});
