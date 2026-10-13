import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
beforeEach(() => secureStore.__store.clear());
const resultsPath = '/api/panel/odk/management/results', reportsPath = '/api/panel/odk/management/reports';
const nav: [string, string, string][] = [['odk-results', 'Puanlama ve yayın', '/panel/odk/yonetim/sonuclar'], ['odk-reports', 'Sonuç raporları', '/panel/odk/yonetim/raporlar']];
const bootstrap = (role: 'ADMIN' | 'TEACHER') => makeBootstrap({ role, products: { ODK: 'ACTIVE' }, activeProduct: 'ODK', ...(role === 'ADMIN' ? { adminNav: { primary: nav, sections: [] } } : { extraNav: nav }) });
const queue = { contractVersion: 1, tab: 'kuyruk', tabs: [{ id: 'kuyruk', label: 'İş kuyruğu', count: 1 }], rows: [{ id: 'e1', title: 'LGS taslak puan', family: 'LGS', endsAt: null, submitted: 3, assigned: 4, scored: 2, unscored: 1, published: 0, review: 1, stage: 'PUANLANIYOR', stageLabel: 'Puanlama bekliyor', actionLabel: 'İncele', href: '/panel/odk/yonetim/sinavlar/e1?sekme=butunluk' }] };
const list = { contractVersion: 1, query: '', group: '', groups: ['8'], total: 1, rowLimit: 50, rows: [{ studentId: 's1', name: 'Öğrenci Bir', context: '8', latestTitle: 'LGS son', latestNet: 12, delta: 2, weakOutcomes: 1, examCount: 2 }], report: null as object | null };
const report = { studentId: 's1', studentName: 'Öğrenci Bir', available: true, latestExamId: 'e1', latestNet: 12, delta: 2, weakThreshold: 50, weakCount: 1, summary: ['Öğrencinin kendi önceki denemesine göre 2 net artış.'], exams: [{ id: 'e1', title: 'LGS son', family: 'LGS', takenAt: '2026-10-10T10:00:00Z', correctCount: 15, wrongCount: 12, blankCount: 3, totalNet: 12 }], outcomes: [{ id: 'o1', code: 'MAT.1', title: 'Kesirler', unitName: 'Sayılar', latestAccuracy: 40, previousAccuracy: 25, delta: 15, evidenceCount: 2, questionCount: 2 }] };
it.each(['ADMIN', 'TEACHER'] as const)('%s sees scoring queue and native complete report without mutations', async (role) => {
  const h = await boot([account('staff@example.com', bootstrap(role), { routes: {
    [`GET ${resultsPath}`]: () => jsonResponse(200, queue), [`GET ${reportsPath}`]: ({ query }) => jsonResponse(200, { ...list, report: query.has('ogrenci') ? report : null }),
  } })]);
  await signIn(h, 'staff@example.com'); await go('/screen/odk-results'); expect(await h.screen.findByTestId('odk-queue-e1', {}, WAIT)).toBeTruthy(); expect(h.screen.getByText(/3\/4 teslim/)).toBeTruthy();
  await go('/screen/odk-reports'); await press(h, await h.screen.findByTestId('odk-report-s1', {}, WAIT)); expect(await h.screen.findByText('Kendi önceki denemesine göre: +2.00 net', {}, WAIT)).toBeTruthy(); expect(h.screen.getByText(/2 deneme · 2 soru · Yeni kanıt gerekli/)).toBeTruthy(); expect(h.screen.getByText('Öğrencinin kendi önceki denemesine göre 2 net artış.')).toBeTruthy();
  expect(h.server.called('POST', resultsPath)).toHaveLength(0); expect(h.server.called('POST', reportsPath)).toHaveLength(0);
});
