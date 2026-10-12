import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());
const revision = 'a'.repeat(64);
const data = { contractVersion: 1, title: 'Ödev oluştur', description: '', rows: [], hasMore: false, file: null, forms: [{ id: 'SAVE', title: 'Kaydet', path: '/api/panel/assignments', method: 'POST', revision: null, preview: false, upload: false, fields: [
  { key: 'groupId', label: 'Grup', type: 'choice', value: 'g1', required: true, options: [{ id: 'g1', name: 'Kendi grubum', revision }] },
  { key: 'title', label: 'Başlık', type: 'text', value: 'Çalışma', required: true, options: [] },
  { key: 'dueAt', label: 'Son teslim', type: 'date', value: '2026-10-14T10:00:00Z', required: true, options: [] },
] }] };
it('öğretmen native editörü doğru ucu kullanır, belirsiz hatadan sonra aynı anahtarla tekrarlar', async () => {
  let attempts = 0; const keys: string[] = [];
  const h = await boot([account('teacher@example.com', makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['assignments', 'Çalışmalar', '/panel/ogretmen/odevler']] }), { routes: {
    'GET /api/panel/staff/teacher/education': () => jsonResponse(200, data),
    'POST /api/panel/assignments': ({ headers }) => { keys.push(headers['X-Od-Idempotency-Key']); return ++attempts === 1 ? jsonResponse(503, { error: 'Tekrar deneyin.' }) : jsonResponse(200, { id: 'a1' }); },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/teacher/education-editor?kind=assignment');
  fireEvent.changeText(await h.screen.findByTestId('field-title', {}, WAIT), 'Native ödev');
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => buttons?.find((button) => button.text === 'Onayla')?.onPress?.());
  await press(h, h.screen.getByTestId('education-save-SAVE'));
  await waitFor(() => expect(attempts).toBe(1), WAIT);
  await press(h, h.screen.getByTestId('education-save-SAVE'));
  expect(await h.screen.findByText('İşlem kaydedildi.', {}, WAIT)).toBeTruthy();
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
  expect(h.server.called('POST', '/api/panel/assignments')[1].body).toMatchObject({ groupId: 'g1', title: 'Native ödev' });
  expect(h.server.called('GET', '/api/panel/admin/education/editor')).toHaveLength(0);
});
