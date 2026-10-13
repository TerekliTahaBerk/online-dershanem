import { waitFor } from '@testing-library/react-native';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

const row = (id: string, title: string) => ({ id, title, family: 'TYT', startsAt: '2025-03-01T09:00:00.000Z', endsAt: null, durationMinutes: 165, state: { key: 'RESULT_RELEASED', label: 'Sonuç açıklandı', tone: 'success', actionLabel: 'Sonucu gör', tab: 'tamamlanan' }, net: 61.5, deadlineAt: null });
const list = (exams: ReturnType<typeof row>[], nextCursor: string | null) => ({ contractVersion: 1, generatedAt: '2026-10-13T08:00:00.000Z', view: 'tumu', counts: { tumu: exams.length, yaklasan: 0, acik: 0, tamamlanan: exams.length }, active: null, exams, truncated: Boolean(nextCursor), limit: 50, nextCursor });

it('S20: okuma sınırını aşan eski denemeler imleçle native yüklenir; son sayfada düğme kalkar', async () => {
  const h = await boot([account('student@example.com', makeBootstrap({ role: 'STUDENT', products: { ODK: 'ACTIVE' }, activeProduct: 'ODK' }), { routes: {
    'GET /api/odk/student/exams': ({ path }: { path: string }) => (path.includes('cursor=e2') ? jsonResponse(200, list([row('e3', 'Eski Deneme 3')], null)) : path.includes('cursor=e1') ? jsonResponse(200, list([row('e2', 'Eski Deneme 2')], 'e2')) : jsonResponse(200, list([row('e1', 'Yeni Deneme 1')], 'e1'))),
  } })]);
  await signIn(h, 'student@example.com');
  await go('/screen/odk-exams');
  expect(await h.screen.findByText('Yeni Deneme 1', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('odk-exams-older'));
  expect(await h.screen.findByText('Eski Deneme 2', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('odk-exams-older'));
  expect(await h.screen.findByText('Eski Deneme 3', {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(h.screen.queryByTestId('odk-exams-older')).toBeNull(), WAIT);
  expect(h.screen.queryByText(/web panelini kullanabilirsin/)).toBeNull();
  expect(h.server.called('GET', '/api/odk/student/exams').map((call) => call.path)).toEqual(expect.arrayContaining([expect.stringContaining('cursor=e1'), expect.stringContaining('cursor=e2')]));
}, 30000);
