import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
it('öğretmen analizinde ortalamalar ve boş değerler native gösterilir', async () => {
  const h = await boot([account('teacher@example.com', makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['analiz', 'Akademik gelişim', '/panel/ogretmen/analiz']] }), { routes: {
    'GET /api/panel/staff/teacher/analysis': () => jsonResponse(200, { contractVersion: 1, periodLabel: 'Son dönem', studentCount: 1, narrative: ['Katılım izleniyor.'], averages: { attendancePercent: 75, assignmentPercent: null, planPercent: null, medianNetDelta: -2 }, rows: [{ studentId: 's1', studentName: 'Ece', classLevel: '8', attendancePercent: 75, assignmentPercent: null, planPercent: null, netDelta: -2, declining: true, riskHint: 'Katılım' }] }),
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/analiz');
  expect(await h.screen.findByText('Grup gidişatı', {}, WAIT)).toBeTruthy();
  expect(h.screen.getByText('%75')).toBeTruthy();
  expect(h.screen.getAllByTestId('analysis-student-s1')).toHaveLength(2);
  expect(h.screen.getByText('Katılım izleniyor.')).toBeTruthy();
});
