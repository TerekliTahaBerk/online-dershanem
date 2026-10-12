import { waitFor } from '@testing-library/react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

it('öğretmen roster filtresini sunucuya gönderir, öğrenciyi native açar', async () => {
  const h = await boot([account('teacher@example.com', makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['students', 'Öğrenciler', '/panel/ogretmen/gruplar']] }), { routes: {
    'GET /api/panel/staff/teacher/students': ({ query }) => jsonResponse(200, {
      filter: query.get('filtre') ?? 'all', filters: [{ id: 'all', label: 'Tümü' }, { id: 'risky', label: 'Riskli' }], totalCount: 1,
      rows: [{ studentId: 'sp1', name: 'Ece Kaya', groupName: 'Matematik', riskLevel: 'high', riskReason: 'Ödev gecikmiş', lastLessonAt: null, lastLessonTitle: null, planLabel: null, examDeltaLabel: null }],
    }),
    'GET /api/panel/staff/teacher/students/sp1': () => jsonResponse(404, { error: 'Erişim artık yok.' }),
  } })]);
  await signIn(h, 'teacher@example.com');
  await go('/screen/students');
  expect(await h.screen.findByText('Ece Kaya', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('chip-risky'));
  expect(await h.screen.findByText('Ece Kaya', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByText('Ece Kaya'));
  expect(await h.screen.findByTestId('teacher-student', {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(h.server.called('GET', '/api/panel/staff/teacher/students/sp1').length).toBeGreaterThan(0), WAIT);
});
