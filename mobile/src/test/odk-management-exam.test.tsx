import { waitFor } from '@testing-library/react-native';

import { workspaceTarget } from '@/features/staff/odk/management-shared';
import { mapAdminWebPath, sanitizeIncomingPath } from '@/navigation/route-map';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

const path = '/api/panel/odk/management/exams/e1';
const tabs = [{ id: 'genel', label: 'Genel' }, { id: 'sorular', label: 'Sorular' }, { id: 'zamanlama', label: 'Zamanlama' }, { id: 'butunluk', label: 'Bütünlük' }, { id: 'raporlar', label: 'Raporlar' }];
const view = (tab: string, extra: Record<string, unknown> = {}) => ({
  contractVersion: 1, revision: 'r'.repeat(64), tab, tabs,
  caps: { edit: true, schedule: true, assign: true, ops: true, score: true, rescore: true, release: true, integrity: true, reports: true },
  exam: { id: 'e1', title: 'TYT Deneme 3', familyCode: 'TYT', status: 'ENDED', statusLabel: 'Kapandı', tone: 'warning', versionNumber: 2, versionStatus: 'LOCKED', description: 'Tam deneme', startsAt: '2026-10-12T07:00:00.000Z', endsAt: '2026-10-12T10:00:00.000Z', lateEntryMinutes: 15, durationMinutes: 165, meet: 'Gerekmiyor', createdAt: '2026-10-01T07:00:00.000Z', contentLockedAt: '2026-10-05T07:00:00.000Z', publishedAt: '2026-10-06T07:00:00.000Z', resultsReleasedAt: null, windowEnded: true, draftEditable: false },
  counts: { assigned: 30, attempts: 28, submitted: 27, scored: 0, review: 1 },
  primaryAction: { label: 'Puanla', tab: 'puanlama' },
  readiness: { done: 4, items: [{ id: 'yapi', label: 'Yapı', ok: true, detail: '120 soru, 4 bölüm' }, { id: 'anahtar', label: 'Cevap anahtarı', ok: false, detail: '2 soru anahtarsız' }] },
  issues: { total: 1, items: [{ level: 'error', message: 'Cevap anahtarı eksik.', questionNumber: 14 }] },
  questions: null, files: null, sessions: null, schedule: null, live: null, integrity: null, report: null, history: null,
  ...extra,
});
const routes = {
  [`GET ${path}`]: ({ query }: { query: URLSearchParams }) => {
    const tab = query.get('sekme') ?? 'genel';
    if (tab === 'sorular') return jsonResponse(200, view('sorular', { questions: { filter: query.get('filtre') ?? 'tumu', counts: { tumu: 2, kazanimsiz: 1, anahtarsiz: 1 }, rows: [{ id: 'q14', number: 14, section: 'Matematik', correctOption: null, outcomeCount: 0, hasPrimaryOutcome: false, contentType: 'BOOKLET_PDF', bookletPage: 7 }] } }));
    if (tab === 'butunluk') return jsonResponse(200, view('butunluk', { integrity: [{ id: 'a1', name: 'Ece Kaya', statusLabel: 'Teslim edildi', tone: 'success', level: 'REVIEW', levelLabel: 'İncelenmeli', levelTone: 'warning', reviewed: false }] }));
    if (tab === 'raporlar') return jsonResponse(200, view('raporlar', { report: { submitted: 27, participation: 30, averageNet: 61.25, medianNet: 60, integrityReviewCount: 1, sections: [{ code: 'MAT', title: 'Matematik', averageNet: 18.5, averageAccuracy: 62 }], weakest: [{ outcomeId: 'o1', title: 'M.9.1 · Kümeler', accuracy: 31 }] } }));
    if (tab === 'zamanlama') return jsonResponse(200, view('zamanlama', { schedule: { fullscreenLabel: 'Tam ekran önerilir', blockCopyPaste: true, logCopyPaste: true, trackVisibility: true, allowExtraTimeMinutes: 0, autoSubmit: true } }));
    return jsonResponse(200, view('genel'));
  },
  [`GET ${path}/attempts/a1`]: () => jsonResponse(200, { contractVersion: 1, id: 'a1', name: 'Ece Kaya', examTitle: 'TYT Deneme 3', statusLabel: 'Teslim edildi', tone: 'success', lastActivityAt: '2026-10-12T09:00:00.000Z', answerCount: 118, integrity: { level: 'REVIEW', label: 'İncelenmeli', tone: 'warning', reviewed: false }, reviewedAt: null, revision: 'a'.repeat(64), canReview: true, events: [{ id: 'ev1', label: 'Sekmeden ayrıldı', signal: true, at: '2026-10-12T08:10:00.000Z' }] }),
};
const bootstrap = () => makeBootstrap({ role: 'ADMIN', products: { ODK: 'ACTIVE' }, activeProduct: 'ODK', adminNav: { primary: [['odk-exams', 'Denemeler', '/panel/odk/yonetim/sinavlar']], sections: [] } });

describe('K03a deneme çalışma alanı', () => {
  it('genel sekmesi yaşam döngüsü, sorunlar ve hazırlığı gösterir; sekmeler sunucudan okunur', async () => {
    const h = await boot([account('admin@example.com', bootstrap(), { routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1');
    expect(await h.screen.findByText('Soru 14: Cevap anahtarı eksik.', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Hazırlık durumu · 4/2')).toBeTruthy();
    await press(h, h.screen.getByTestId('chip-sorular'));
    expect(await h.screen.findByText('Soru 14 · Matematik', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Sürüm kilitli; soru alanları yalnız taslak sürümde düzenlenir.')).toBeTruthy();
    await press(h, h.screen.getByTestId('chip-anahtarsiz'));
    await waitFor(() => expect(h.server.called('GET', path).some((call) => call.path.includes('sekme=sorular') && call.path.includes('filtre=anahtarsiz'))).toBe(true), WAIT);
    await press(h, await h.screen.findByTestId('chip-raporlar', {}, WAIT));
    expect(await h.screen.findByText('M.9.1 · Kümeler', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('61.25')).toBeTruthy();
  }, 30000);

  it('birincil eylem ilgili sekmeye geçer; bütünlük kaydı deneme kapsamlı panelde açılır', async () => {
    const h = await boot([account('admin@example.com', bootstrap(), { routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1?tab=butunluk');
    await press(h, await h.screen.findByTestId('exam-integrity-a1', {}, WAIT));
    expect(await h.screen.findByText('Sekmeden ayrıldı', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', `${path}/attempts/a1`)).toHaveLength(1);
  });

  it('K02 listesinden native çalışma alanı açılır', async () => {
    const h = await boot([account('admin@example.com', bootstrap(), { routes: {
      ...routes,
      'GET /api/panel/odk/management/exams': () => jsonResponse(200, { contractVersion: 1, revision: 'c'.repeat(64), families: [], series: [], templates: [], canCreate: false, query: '', familyCode: null, status: null, view: 'tumu', total: 1, page: 1, pageSize: 50, views: [], rows: [{ id: 'e1', title: 'TYT Deneme 3', familyCode: 'TYT', status: 'ENDED', view: 'puanlama', seriesTitle: null, startsAt: null, endsAt: null, assigned: 30, attempts: 28, submitted: 27, blockingIssues: null }] }),
    } })]);
    await signIn(h, 'admin@example.com');
    await go('/screen/odk-exams');
    await press(h, await h.screen.findByTestId('odk-exam-row-e1', {}, WAIT));
    expect(await h.screen.findByText('Soru 14: Cevap anahtarı eksik.', {}, WAIT)).toBeTruthy();
  });

  it('web çalışma alanı yolları native ekrana eşlenir', () => {
    const navigation = bootstrap().workspace!.navigation;
    expect(mapAdminWebPath('/panel/odk/yonetim/sinavlar/e1?sekme=puanlama', navigation)).toEqual({ kind: 'detail', href: '/odk/manage/e1' });
    expect(workspaceTarget('/panel/odk/yonetim/sinavlar/e1?sekme=butunluk')).toBe('/odk/manage/e1?tab=butunluk');
    expect(sanitizeIncomingPath('onlinedershanem://odk/manage/e1')).toBe('/odk/manage/e1');
  });
});
