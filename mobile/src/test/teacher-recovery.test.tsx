import { waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
const row = { attendanceId: 'a1', revision: 'a'.repeat(64), studentName: 'Ece', lessonTitle: 'Köklü sayılar', lessonDate: '2026-10-11T10:00:00Z', status: 'ABSENT', package: null as null | object };
const draft = { id: 'p1', status: 'DRAFT', version: 1, summaryTopic: 'Kökler', summaryNextStep: 'Üç örnek çöz.', checkpointPrompt: 'Neyi tekrar edeceksin?', dueAt: '2026-10-14T10:00:00Z', items: [{ id: 'i1', kind: 'MATERIAL', title: 'Ortak föy' }] };
const bootstrap = () => makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['recovery', 'Telafi', '/panel/ogretmen/telafi']] });

it('taslak ağ hatasından sonra aynı işlem anahtarıyla hazırlanır; yayın insan onayı ister', async () => {
  let current = { ...row }; let attempts = 0; const keys: string[] = [];
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    'GET /api/panel/staff/teacher/recovery': () => jsonResponse(200, { contractVersion: 1, rows: [current] }),
    'POST /api/panel/staff/teacher/recovery': ({ headers, body }) => {
      const input = body as { action: string };
      expect(headers['X-Od-Expected-Revision']).toBe(current.revision);
      if (input.action === 'generate') {
        keys.push(headers['X-Od-Idempotency-Key']);
        if (++attempts === 1) return jsonResponse(503, { error: 'Tekrar deneyin.' });
        current = { ...row, revision: 'b'.repeat(64), package: draft };
      } else current = { ...current, revision: 'c'.repeat(64), package: { ...draft, status: 'PUBLISHED' } };
      return jsonResponse(200, {});
    },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/recovery');
  await press(h, await h.screen.findByTestId('recovery-generate-a1', {}, WAIT));
  await waitFor(() => expect(attempts).toBe(1), WAIT);
  await press(h, h.screen.getByTestId('recovery-generate-a1'));
  expect(await h.screen.findByText('Ortak föy', {}, WAIT)).toBeTruthy();
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await press(h, h.screen.getByTestId('recovery-publish-a1'));
  expect(alert).toHaveBeenCalled(); expect(h.server.called('POST', '/api/panel/staff/teacher/recovery')).toHaveLength(2);
  alert.mockImplementation((_title, _body, buttons) => buttons?.find((button) => button.text === 'Yayımla')?.onPress?.());
  await press(h, h.screen.getByTestId('recovery-publish-a1'));
  expect(await h.screen.findByText('Telafi paketi yayımlandı 🧩 Öğrenciniz artık kaldığı yerden yetişebilir.', {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(h.screen.queryByTestId('recovery-publish-a1')).toBeNull(), WAIT);
}, 30000);

it('eski revizyon reddedilince güncel paket gösterilir', async () => {
  let current = { ...row, package: draft };
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    'GET /api/panel/staff/teacher/recovery': () => jsonResponse(200, { contractVersion: 1, rows: [current] }),
    'POST /api/panel/staff/teacher/recovery': () => { current = { ...current, revision: 'b'.repeat(64), package: { ...draft, status: 'PUBLISHED' } }; return jsonResponse(409, { code: 'RECOVERY_CONFLICT', error: 'Paket değişti.' }); },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/recovery');
  await press(h, await h.screen.findByTestId('recovery-generate-a1', {}, WAIT));
  await waitFor(() => expect(h.screen.queryByTestId('recovery-generate-a1')).toBeNull(), WAIT);
  expect(h.screen.getByText('Yayımlandı')).toBeTruthy();
});
