import { waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
beforeEach(() => secureStore.__store.clear());
const row = { studentId: 's1', name: 'Ece', revision: 'a'.repeat(64), digest: null as null | object };
const draft = { id: 'd1', status: 'DRAFT', version: 1, goodThingOne: 'Ritmini korudu.', goodThingTwo: 'İki adımı tamamladı.', supportArea: 'Kısa tekrar.', homeQuestion: 'Hangi adım rahattı?', dataThrough: '2026-10-12T10:00:00Z' };
const bootstrap = () => makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['digests', 'Özetler', '/panel/ogretmen/ozetler']] });
const path = '/api/panel/staff/teacher/digests';
it('draft retry keeps the key; exact preview is published only after human confirmation', async () => {
  let current = { ...row }; let attempts = 0; const keys: string[] = [];
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, { contractVersion: 1, rows: [current] }),
    [`POST ${path}`]: ({ headers, body }) => {
      const input = body as { action: string; studentId: string }; expect(input.studentId).toBe('s1'); expect(headers['X-Od-Expected-Revision']).toBe(current.revision);
      if (input.action === 'generate') { keys.push(headers['X-Od-Idempotency-Key']); if (++attempts === 1) return jsonResponse(503, { error: 'Tekrar deneyin.' }); current = { ...row, revision: 'b'.repeat(64), digest: draft }; }
      else current = { ...current, revision: 'c'.repeat(64), digest: { ...draft, status: 'PUBLISHED' } };
      return jsonResponse(200, input.action === 'generate' ? { id: 'd1', generated: true, replayed: false } : { published: true, replayed: false });
    },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/digests');
  await press(h, await h.screen.findByTestId('digest-generate-s1', {}, WAIT)); await waitFor(() => expect(attempts).toBe(1), WAIT);
  await press(h, h.screen.getByTestId('digest-generate-s1'));
  expect(await h.screen.findByText('Ritmini korudu.', {}, WAIT)).toBeTruthy(); expect(h.screen.getByText('Hangi adım rahattı?')).toBeTruthy(); expect(keys[0]).toBe(keys[1]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await press(h, h.screen.getByTestId('digest-publish-s1')); expect(alert).toHaveBeenCalled(); expect(h.server.called('POST', path)).toHaveLength(2);
  alert.mockImplementation((_title, _body, buttons) => buttons?.find((button) => button.text === 'Yayımla')?.onPress?.());
  await press(h, h.screen.getByTestId('digest-publish-s1'));
  expect(await h.screen.findByText('Haftalık özet öğrenci ve veliye açıldı.', {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(h.screen.queryByTestId('digest-publish-s1')).toBeNull(), WAIT);
}, 30000);
it('recipient or draft conflict refreshes preview and blocks silent overwrite', async () => {
  let current = { ...row, digest: draft };
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, { contractVersion: 1, rows: [current] }),
    [`POST ${path}`]: () => { current = { ...current, revision: 'b'.repeat(64), digest: { ...draft, status: 'PUBLISHED' } }; return jsonResponse(409, { error: 'Özet değişti.' }); },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/digests');
  await press(h, await h.screen.findByTestId('digest-generate-s1', {}, WAIT));
  expect(await h.screen.findByText(/Özet veya alıcılar değişti/, {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(h.screen.queryByTestId('digest-generate-s1')).toBeNull(), WAIT); expect(h.screen.getByText('Yayımlandı')).toBeTruthy();
});
