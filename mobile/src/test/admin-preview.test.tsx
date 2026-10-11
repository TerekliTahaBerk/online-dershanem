import { waitFor } from '@testing-library/react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
const admin = () => makeBootstrap({ role: 'ADMIN', userId: 'admin', activeProduct: 'OD' });
const expiresAt = '2099-10-11T12:00:00.000Z';

it('candidate selection replaces actor workspace; banner exits and removes subject data', async () => {
  const base = admin();
  const subject = makeBootstrap({ userId: 'subject', activeProduct: 'OD', extraNav: [['weekly', 'Haftalık özet', '/panel/ogrenci/haftalik']] });
  subject.user.fullName = 'Önizlenen Öğrenci';
  subject.adminOverlay = { mode: 'PREVIEW', actorUserId: 'admin', expiresAt };
  subject.gates.previewActive = true;
  const unselected = { ...subject, workspace: { ...subject.workspace!, activeProduct: null, navigation: { primary: [], sections: [] } } };
  const h = await boot([account('admin@example.com', base, { routes: {
    'GET /api/panel/me': ({ headers, account }) => jsonResponse(200, headers['X-Od-Preview'] ? (headers['X-Od-Workspace'] === 'OD' ? subject : unselected) : account.bootstrap),
    'GET /api/panel/admin-preview/candidates': () => jsonResponse(200, { candidates: [{ userId: 'subject', fullName: 'Önizlenen Öğrenci', email: 'subject@example.com', status: 'ACTIVE', detail: null, invitePending: false }] }),
    'POST /api/panel/admin-preview': ({ account }) => { account.bootstrap = subject; return jsonResponse(200, { token: 'signed-preview', context: { expiresAt } }); },
    'DELETE /api/panel/admin-preview': ({ account }) => { account.bootstrap = base; return jsonResponse(200, { ok: true }); },
  } })]);
  await signIn(h, 'admin@example.com');
  await go('/admin/preview');
  await press(h, await h.screen.findByTestId('preview-person-subject', {}, WAIT));
  expect(await h.screen.findByTestId('admin-overlay-banner', {}, WAIT)).toBeTruthy();
  expect(h.screen.getByText('Önizleme: Önizlenen Öğrenci · Salt okunur')).toBeTruthy();
  await press(h, h.screen.getByTestId('nav-menu'));
  expect(await h.screen.findByTestId('menu-weekly', {}, WAIT)).toBeTruthy();
  expect(h.screen.queryByTestId('menu-admin-search')).toBeNull();
  expect(h.screen.queryByTestId('menu-account')).toBeNull();
  await press(h, h.screen.getByTestId('exit-admin-overlay'));
  await waitFor(() => expect(h.screen.queryByTestId('admin-overlay-banner')).toBeNull(), WAIT);
  await press(h, await h.screen.findByTestId('nav-menu', {}, WAIT));
  expect(await h.screen.findByTestId('menu-admin-search', {}, WAIT)).toBeTruthy();
  expect(h.server.called('DELETE', '/api/panel/admin-preview')).toHaveLength(1);
  expect(h.server.called('POST', '/api/panel/active-product')).toHaveLength(0);
  expect(h.server.called('GET', '/api/panel/me').some((call) => call.headers['X-Od-Preview'] === 'signed-preview' && call.headers['X-Od-Workspace'] === 'OD')).toBe(true);
});

it('teacher mode uses own account and exits through teacher endpoint', async () => {
  const base = admin();
  const teacher = makeBootstrap({ role: 'TEACHER', userId: 'admin', activeProduct: 'OD' });
  teacher.adminOverlay = { mode: 'TEACHER', actorUserId: 'admin', expiresAt };
  const h = await boot([account('admin@example.com', base, { routes: {
    'GET /api/panel/admin-preview/candidates': () => jsonResponse(200, { candidates: [] }),
    'POST /api/panel/admin-teacher-mode': ({ account }) => { account.bootstrap = teacher; return jsonResponse(200, { token: 'signed-teacher', expiresAt }); },
    'DELETE /api/panel/admin-teacher-mode': ({ account }) => { account.bootstrap = base; return jsonResponse(200, { ok: true }); },
  } })]);
  await signIn(h, 'admin@example.com');
  await go('/admin/preview');
  await press(h, await h.screen.findByTestId('start-teacher-mode', {}, WAIT));
  expect(await h.screen.findByText('Öğretmen çalışma modu', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('exit-admin-overlay'));
  await waitFor(() => expect(h.screen.queryByTestId('admin-overlay-banner')).toBeNull(), WAIT);
  expect(h.server.called('DELETE', '/api/panel/admin-teacher-mode')).toHaveLength(1);
});
