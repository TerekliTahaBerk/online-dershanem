import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { EducationEditor, EducationForm, EditorKind } from '@contracts/admin-education-editor';
import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
const revision = 'a'.repeat(64);
const field = (key: string, value: string, type: EducationForm['fields'][number]['type'] = 'text'): EducationForm['fields'][number] => ({ key, value, type, label: key, required: false, options: [] });
const form = (path: string, fields: EducationForm['fields'] = [], extras: Partial<EducationForm> = {}): EducationForm => ({ id: 'SAVE', title: 'Kaydet', path: `/api/panel/${path}`, method: 'POST', fields, revision, preview: false, upload: false, ...extras });
const editor = (forms: EducationForm[]): EducationEditor => ({ contractVersion: 1, title: 'Eğitim işlemi', description: '', forms, rows: [], hasMore: false, file: null });
const center = { contractVersion: 1, generatedAt: '2026-10-11T08:00:00Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };
beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());
async function open(kind: EditorKind, data: EducationEditor, routes: NonNullable<FakeAccount['routes']> = {}) {
  const h = await boot([account('admin@example.com', makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: {
    'GET /api/panel/admin/operations-center': () => jsonResponse(200, center),
    'GET /api/panel/admin/education/editor': () => jsonResponse(200, data), ...routes,
  } })]);
  await signIn(h, 'admin@example.com'); await go(`/admin/education-editor?kind=${kind}`);
  await h.screen.findByText('Eğitim işlemi', {}, WAIT); return h;
}
function confirm() { jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.find((button) => button.text === 'Onayla')?.onPress?.(); }); }
it.each([
  ['assignment', 'assignments', [field('title', 'Çalışma'), field('dueAt', '2026-10-12T12:00:00Z', 'date')]],
  ['material', 'materials', [field('title', 'Materyal'), field('url', 'https://example.com/resource')]],
  ['setup', 'setup', [field('name', 'Grup'), field('studentIds', 's1,s2', 'ids'), field('parentLinks', 'p1|s1', 'links')]],
  ['version', 'curriculum/versions', [field('code', 'TEST2026'), field('academicYear', '2026', 'number')]],
  ['outcome', 'curriculum/outcomes', [field('versionId', 'v1'), field('title', 'Kazanım')]],
  ['submission', 'assignment-submissions/sub1/review', [field('expectedVersion', '1', 'number'), field('score:c1', 'MEETS', 'score'), field('score:c2', 'DEVELOPING', 'score'), field('feedback', 'İyi çalışma')]],
] as const)('%s native formu onaydan sonra sürüm ve anahtarla yazar', async (kind, path, fields) => {
  let receivedHeaders: Record<string, string> = {};
  const h = await open(kind, editor([form(path, [...fields])]), { [`POST /api/panel/${path}`]: ({ headers }) => { receivedHeaders = headers; return jsonResponse(200, { id: 'saved' }); } });
  const alert = jest.spyOn(Alert, 'alert'); await press(h, h.screen.getByTestId('education-save-SAVE'));
  expect(h.server.called('POST', `/api/panel/${path}`)).toHaveLength(0); expect(alert).toHaveBeenCalled();
  confirm(); await press(h, h.screen.getByTestId('education-save-SAVE'));
  await waitFor(() => expect(h.server.called('POST', `/api/panel/${path}`)).toHaveLength(1), WAIT);
  expect(receivedHeaders['X-Od-Expected-Revision']).toBe(revision); expect(receivedHeaders['X-Od-Idempotency-Key']).toEqual(expect.any(String));
  expect(await h.screen.findByText('İşlem kaydedildi.', {}, WAIT)).toBeTruthy();
});
it('seri önizlemesi alan değişince geçersizleşir', async () => {
  const h = await open('lesson', editor([form('lessons', [field('title', 'Ders'), field('mode', 'SERIES'), field('startsAt', '2026-10-12T12:00:00Z', 'date')], { preview: true })]), { 'POST /api/panel/lessons/preview-series': () => jsonResponse(200, { count: 2, hasConflicts: false, conflicts: [], occurrences: [{ startsAt: '2026-10-12T12:00:00Z', endsAt: '2026-10-12T13:00:00Z', label: '12 Ekim' }] }) });
  expect(h.screen.getByTestId('education-save-SAVE').props.accessibilityState.disabled).toBe(true);
  await press(h, h.screen.getByText('Seriyi önizle'));
  await waitFor(() => expect(h.screen.getByTestId('education-save-SAVE').props.accessibilityState.disabled).toBe(false), WAIT);
  fireEvent.changeText(h.screen.getByTestId('field-title'), 'Yeni ders'); expect(h.screen.getByTestId('education-save-SAVE').props.accessibilityState.disabled).toBe(true);
});
it('428 aynı eğitim anahtarıyla tekrarlar', async () => {
  let attempts = 0; const keys: string[] = [];
  const h = await open('assignment', editor([form('assignments', [field('title', 'Çalışma')])]), {
    'POST /api/panel/assignments': ({ headers }) => { keys.push(headers['X-Od-Idempotency-Key']); return ++attempts === 1 ? jsonResponse(428, { code: 'STEP_UP_REQUIRED', error: 'Doğrulayın.' }) : jsonResponse(200, { id: 'saved' }); },
    'POST /api/auth/mfa/code/verify': () => jsonResponse(200, { verified: true, stepUpExpiresAt: '2026-10-12T20:00:00Z' }),
  });
  confirm(); await press(h, h.screen.getByTestId('education-save-SAVE'));
  fireEvent.changeText(await h.screen.findByTestId('step-up-code', {}, WAIT), '123456'); await press(h, h.screen.getByTestId('step-up-submit'));
  await waitFor(() => expect(attempts).toBe(2), WAIT); expect(keys[0]).toBe(keys[1]);
});
it('409 veriyi yeniler ve sessiz tekrar yapmaz', async () => {
  let reads = 0;
  const h = await open('material', editor([form('materials/m1', [], { method: 'PATCH' })]), {
    'GET /api/panel/admin/education/editor': () => { reads++; return jsonResponse(200, editor([form('materials/m1', [], { method: 'PATCH' })])); },
    'PATCH /api/panel/materials/m1': () => jsonResponse(409, { error: 'Kayıt değişti.' }),
  });
  confirm(); await press(h, h.screen.getByTestId('education-save-SAVE'));
  expect(await h.screen.findByText(/Görünüm yenilendi/, {}, WAIT)).toBeTruthy(); expect(reads).toBeGreaterThan(1); expect(h.server.called('PATCH', '/api/panel/materials/m1')).toHaveLength(1);
});
