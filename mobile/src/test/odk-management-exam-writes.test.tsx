import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

const path = '/api/panel/odk/management/exams/e1';
const tabs = ['genel', 'icerik', 'sorular', 'oturumlar', 'zamanlama', 'katilimcilar', 'onizleme', 'puanlama'].map((id) => ({ id, label: id }));
const bootstrap = () => makeBootstrap({ role: 'ADMIN', products: { ODK: 'ACTIVE' }, activeProduct: 'ODK', adminNav: { primary: [['odk-exams', 'Denemeler', '/panel/odk/yonetim/sinavlar']], sections: [] } });

function makeView(state: { status: string; revision: string; title: string }) {
  return (tab: string) => ({
    contractVersion: 1, revision: state.revision, tab, tabs,
    caps: { edit: true, schedule: true, assign: true, ops: true, score: true, rescore: true, release: true, integrity: true, reports: true },
    exam: { id: 'e1', title: state.title, familyCode: 'TYT', status: state.status, statusLabel: state.status, tone: 'neutral', versionNumber: 1, versionStatus: state.status === 'DRAFT' ? 'DRAFT' : 'LOCKED', description: '', startsAt: '2026-11-01T07:00:00.000Z', endsAt: '2026-11-01T10:00:00.000Z', lateEntryMinutes: 15, durationMinutes: 165, meet: 'Gerekmiyor', createdAt: '2026-10-01T07:00:00.000Z', contentLockedAt: null, publishedAt: null, resultsReleasedAt: null, windowEnded: !['DRAFT', 'READY'].includes(state.status), draftEditable: state.status === 'DRAFT', meetRequired: false, meetUrl: null },
    counts: { assigned: 1, attempts: 0, submitted: 0, scored: 0, review: 0 },
    primaryAction: null,
    readiness: { done: 1, items: [] },
    issues: { total: 0, items: [] },
    questions: tab === 'sorular' ? { filter: 'tumu', counts: { tumu: 1, kazanimsiz: 0, anahtarsiz: 1 }, rows: [{ id: 'q2', number: 2, section: 'Matematik', correctOption: null, outcomeCount: 1, hasPrimaryOutcome: true, contentType: 'BOOKLET_PDF', bookletPage: 3, difficulty: 'MEDIUM', outcomes: [{ id: 'o1', label: 'M.9.1 · Kümeler' }], primaryOutcomeId: 'o1' }] } : null,
    live: null, integrity: null, report: null, history: null,
    files: tab === 'icerik' ? [] : null,
    sessions: tab === 'oturumlar' ? [{ key: 's1', title: '1. oturum', sections: ['TYT'], durationMinutes: 165, breakAfterMinutes: 30 }, { key: 's2', title: '2. oturum', sections: ['AYT'], durationMinutes: 180, breakAfterMinutes: 0 }] : null,
    schedule: tab === 'zamanlama' ? { fullscreenMode: 'SUGGESTED', fullscreenLabel: 'Önerilir', blockCopyPaste: false, logCopyPaste: true, trackVisibility: true, allowExtraTimeMinutes: 0, autoSubmit: true } : null,
    assignments: tab === 'katilimcilar' ? { active: 1, total: 1, rows: [{ id: 'as1', name: 'Ece Kaya', source: 'GROUP', active: true, assignedAt: '2026-10-02T07:00:00.000Z' }], options: { groups: [{ id: 'g1', label: '12-A', memberCount: 24 }], classLevels: ['12'], packages: [], cohorts: [] } } : null,
    scoring: tab === 'puanlama' ? {
      summary: { participation: 2, submitted: 2, missing: 0, averageNet: state.status === 'ENDED' ? null : 42.5, medianNet: null, integrityReviewCount: 1, scoringErrors: 0, sections: [] },
      rows: [{ attemptId: 'a1', name: 'Ece Kaya', correct: state.status === 'ENDED' ? null : 50, wrong: null, blank: null, net: state.status === 'ENDED' ? null : 42.5, durationMinutes: 150, integrityLabel: 'Normal', integrityTone: 'success', result: state.status === 'RELEASED' ? 'PUBLISHED' : state.status === 'SCORED' ? 'HIDDEN' : 'NONE', resultLabel: state.status === 'RELEASED' ? 'Yayınlandı' : state.status === 'SCORED' ? 'Gizli' : 'Teslim edildi' }],
      release: state.status === 'SCORED' ? { include: { publishable: 2, reviewRequired: 1, scoringErrors: 0, warnings: ['1 sonuç inceleme bekliyor.'], canPublish: true }, exclude: { publishable: 1, reviewRequired: 1, scoringErrors: 0, warnings: ['1 sonuç inceleme bekliyor.'], canPublish: true } } : null,
    } : null,
    previews: tab === 'onizleme' ? [{ kind: 'STUDENT_EXAM', label: 'Öğrenci sınav ekranı', disclaimer: 'Önizleme', lines: ['Bölüm: Türkçe · 40 soru'] }] : null,
  });
}

function setup(status = 'DRAFT') {
  const state = { status, revision: 'a'.repeat(64), title: 'TYT Deneme 4' };
  const view = makeView(state);
  const posts: { body: Record<string, unknown>; headers: Record<string, string> }[] = [];
  let failNext: number | null = null;
  let releases = 0;
  const routes = {
    [`GET ${path}`]: ({ query }: { query: URLSearchParams }) => jsonResponse(200, view(query.get('sekme') ?? 'genel')),
    [`POST ${path}`]: ({ body, headers }: { body: unknown; headers: Record<string, string> }) => {
      const command = body as Record<string, unknown>;
      posts.push({ body: command, headers });
      if (failNext) { const status = failNext; failNext = null; return jsonResponse(status, { error: status === 409 ? 'Deneme başka bir işlemde değişti.' : 'Tekrar deneyin.', code: status === 409 ? 'ODK_CONFLICT' : undefined }); }
      if (headers['X-Od-Expected-Revision'] !== state.revision) return jsonResponse(409, { error: 'Deneme değişti.', code: 'ODK_CONFLICT' });
      if (command.operation === 'import.preview') return jsonResponse(200, { ok: true, operation: 'import.preview', replayed: false, result: { importId: 'imp1', summary: { message: '120 satır doğrulandı' }, issues: [{ level: 'warning', message: 'Soru 3 için zorluk yok' }] } });
      if (command.operation === 'release' && ++releases === 1) return jsonResponse(428, { code: 'STEP_UP_REQUIRED', error: 'Doğrulayın.' });
      if (command.operation === 'ready') state.status = 'READY';
      if (command.operation === 'score') state.status = 'SCORED';
      if (command.operation === 'release') state.status = 'RELEASED';
      if (command.operation === 'update') state.title = (command.input as { title: string }).title;
      state.revision = String.fromCharCode(state.revision.charCodeAt(0) + 1).repeat(64);
      return jsonResponse(200, { ok: true, operation: command.operation, replayed: false, result: command.operation === 'assign' ? { total: 24 } : command.operation === 'release' ? { published: 1, excluded: 1, coach: { created: 2 } } : {} });
    },
    [`GET ${path}/outcomes`]: ({ query }: { query: URLSearchParams }) => jsonResponse(200, { options: query.get('q') === 'fonk' ? [{ id: 'o2', label: 'M.9.2 · Fonksiyonlar' }] : [] }),
    'POST /api/auth/mfa/code/verify': () => jsonResponse(200, { verified: true, stepUpExpiresAt: '2026-10-13T20:00:00Z' }),
  };
  return { state, posts, routes, fail: (status: number) => { failNext = status; } };
}

describe('K03b deneme hazırlık yazmaları', () => {
  it('zamanlama formu revizyonla kaydeder; hazır işaretleme onay ister ve görünümü yeniler', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    const s = setup();
    const h = await boot([account('admin@example.com', bootstrap(), { routes: s.routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1?tab=zamanlama');
    fireEvent.changeText(await h.screen.findByTestId('exam-title', {}, WAIT), 'TYT Deneme 4 (güncel)');
    await press(h, h.screen.getByTestId('exam-save'));
    expect(await h.screen.findByText('Planlama ve güvenlik bilgileri kaydedildi.', {}, WAIT)).toBeTruthy();
    expect(s.posts[0].body).toMatchObject({ operation: 'update', input: { title: 'TYT Deneme 4 (güncel)', lateEntryMinutes: 15, meetRequired: false, security: { fullscreenMode: 'SUGGESTED', logCopyPaste: true } } });
    expect(s.posts[0].headers['X-Od-Expected-Revision']).toBe('a'.repeat(64));
    expect(s.posts[0].headers['X-Od-Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(await h.screen.findByText('TYT Deneme 4 (güncel)', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Planlama ve güvenlik bilgileri kaydedildi.')).toBeTruthy();
    await press(h, await h.screen.findByTestId('exam-ready', {}, WAIT));
    await waitFor(() => expect(s.posts.at(-1)?.body).toEqual({ operation: 'ready' }), WAIT);
    expect(s.posts.at(-1)?.headers['X-Od-Expected-Revision']).toBe('b'.repeat(64));
    expect(await h.screen.findByTestId('exam-schedule', {}, WAIT)).toBeTruthy();
  }, 30000);

  it('belirsiz hatada aynı anahtarla yeniden dener; 409 görünümü yeniler', async () => {
    const s = setup();
    const h = await boot([account('admin@example.com', bootstrap(), { routes: s.routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1?tab=oturumlar');
    fireEvent.changeText(await h.screen.findByTestId('session-duration-s1', {}, WAIT), '150');
    s.fail(503);
    await press(h, h.screen.getByTestId('sessions-save'));
    await waitFor(() => expect(s.posts).toHaveLength(1), WAIT);
    await press(h, h.screen.getByTestId('sessions-save'));
    expect(await h.screen.findByText('Oturum planı güncellendi.', {}, WAIT)).toBeTruthy();
    expect(s.posts[1].headers['X-Od-Idempotency-Key']).toBe(s.posts[0].headers['X-Od-Idempotency-Key']);
    expect(s.posts[1].body).toEqual({ operation: 'sessions', sessions: [{ key: 's1', durationMinutes: 150, breakAfterMinutes: 30 }, { key: 's2', durationMinutes: 180, breakAfterMinutes: 0 }] });
    const gets = h.server.called('GET', path).length;
    s.fail(409);
    await press(h, await h.screen.findByTestId('sessions-save', {}, WAIT));
    expect(await h.screen.findByText(/Güncel çalışma alanı yüklendi|değişti/, {}, WAIT)).toBeTruthy();
    await waitFor(() => expect(h.server.called('GET', path).length).toBeGreaterThan(gets), WAIT);
  }, 30000);

  it('katılımcılar sekmesi gruba atar; JSON içe aktarma doğrula → uygula akışı', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    const s = setup();
    const h = await boot([account('admin@example.com', bootstrap(), { routes: s.routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1?tab=katilimcilar');
    expect(await h.screen.findByText('Ece Kaya', {}, WAIT)).toBeTruthy();
    await press(h, h.screen.getByTestId('chip-g1'));
    await press(h, h.screen.getByTestId('assign-submit'));
    expect(await h.screen.findByText('Atama kaydedildi.', {}, WAIT)).toBeTruthy();
    expect(s.posts[0].body).toEqual({ operation: 'assign', input: { source: 'GROUP', groupId: 'g1' } });

    await go('/odk/manage/e1?tab=icerik');
    fireEvent.changeText(await h.screen.findByTestId('import-json', {}, WAIT), '{bozuk');
    await press(h, h.screen.getByTestId('import-validate'));
    expect(await h.screen.findByText('JSON okunamadı. Metni kontrol edin.', {}, WAIT)).toBeTruthy();
    fireEvent.changeText(h.screen.getByTestId('import-json'), '{"answers":[{"questionNumber":1,"correctOption":"A"}]}');
    await press(h, h.screen.getByTestId('import-validate'));
    expect(await h.screen.findByText('120 satır doğrulandı', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Soru 3 için zorluk yok')).toBeTruthy();
    await press(h, h.screen.getByTestId('import-commit'));
    expect(await h.screen.findByText('Cevap anahtarı uygulandı.', {}, WAIT)).toBeTruthy();
    expect(s.posts.at(-1)?.body).toEqual({ operation: 'import.commit', kind: 'answer-key', importId: 'imp1' });
  }, 30000);

  it('önizleme sekmesi native gösterilir; hiçbir sekme web devam yoluna düşmez', async () => {
    const s = setup();
    const h = await boot([account('admin@example.com', bootstrap(), { routes: s.routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1?tab=onizleme');
    expect(await h.screen.findByText('• Bölüm: Türkçe · 40 soru', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByText(/şimdilik web panelinde/)).toBeNull();
    for (const tab of ['sorular', 'puanlama']) {
      await go(`/odk/manage/e1?tab=${tab}`);
      expect(await h.screen.findByTestId(`chip-${tab}`, {}, WAIT)).toBeTruthy();
      expect(h.screen.queryByText(/şimdilik web panelinde/)).toBeNull();
    }
  }, 30000);
});

describe('K03 soru düzenleme', () => {
  it('taslak soruda anahtar, sayfa ve kazanım düzenlenir; ana kazanım kaldırılınca devreder', async () => {
    const s = setup();
    const h = await boot([account('admin@example.com', bootstrap(), { routes: s.routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1?tab=sorular');
    await press(h, await h.screen.findByTestId('exam-question-q2', {}, WAIT));
    await press(h, await h.screen.findByTestId('chip-C', {}, WAIT));
    await press(h, h.screen.getByTestId('chip-HARD'));
    fireEvent.changeText(h.screen.getByTestId('question-page'), '0');
    expect(h.screen.getByText('1–1000 arası bir sayfa girin.')).toBeTruthy();
    fireEvent.changeText(h.screen.getByTestId('question-page'), '12');
    fireEvent.changeText(h.screen.getByTestId('question-outcome-search'), 'fonk');
    await press(h, h.screen.getByTestId('question-outcome-search-submit'));
    await press(h, await h.screen.findByTestId('question-outcome-o2', {}, WAIT));
    await press(h, h.screen.getByTestId('question-remove-o1'));
    await press(h, h.screen.getByTestId('question-save'));
    expect(await h.screen.findByText('Soru 2 kaydedildi.', {}, WAIT)).toBeTruthy();
    expect(s.posts[0].body).toEqual({ operation: 'question.update', question: { id: 'q2', correctOption: 'C', difficulty: 'HARD', bookletPage: 12, outcomeIds: ['o2'], primaryOutcomeId: 'o2' } });
    expect(s.posts[0].headers['X-Od-Expected-Revision']).toBe('a'.repeat(64));
  }, 30000);
});

describe('K03c puanlama ve yayın', () => {
  it('teslimleri puanlar (onaylı); yayın önizleme → onay → 428 sonrası native doğrulama ve aynı anahtarla yayın', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    const s = setup('ENDED');
    const h = await boot([account('admin@example.com', bootstrap(), { routes: s.routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1?tab=puanlama');
    expect(await h.screen.findByText('Puanlama ≠ yayın. Öğrenci yalnız yayın sonrası görür.', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByText(/şimdilik web panelinde/)).toBeNull();
    await press(h, h.screen.getByTestId('exam-score'));
    expect(await h.screen.findByText('Teslimler puanlandı (yayınlanmadı).', {}, WAIT)).toBeTruthy();
    expect(s.posts[0].body).toEqual({ operation: 'score' });

    // SCORED: yayın önizlemesi (inceleme bekleyenler varsayılan hariç).
    await press(h, await h.screen.findByTestId('release-preview', {}, WAIT));
    expect(h.screen.getByText('1 öğrencinin sonucu yayınlanacak.')).toBeTruthy();
    await press(h, h.screen.getByTestId('release-commit'));
    fireEvent.changeText(await h.screen.findByTestId('step-up-code', {}, WAIT), '123456');
    await press(h, h.screen.getByTestId('step-up-submit'));
    expect(await h.screen.findByText('Sonuçlar yayınlandı.', {}, WAIT)).toBeTruthy();
    const releases = s.posts.filter((post) => post.body.operation === 'release');
    expect(releases).toHaveLength(2);
    expect(releases[1].headers['X-Od-Idempotency-Key']).toBe(releases[0].headers['X-Od-Idempotency-Key']);
    expect(releases[1].body).toEqual({ operation: 'release', input: { excludeReviewRequired: true, createCoachSuggestions: true } });
    expect(await h.screen.findByText('Yayınlandı', {}, WAIT)).toBeTruthy();
  }, 30000);

  it('yayınlanmış denemede yeniden puanlama yayın değişikliği onayı taşır', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    const s = setup('RELEASED');
    const h = await boot([account('admin@example.com', bootstrap(), { routes: s.routes })]);
    await signIn(h, 'admin@example.com');
    await go('/odk/manage/e1?tab=puanlama');
    expect(h.screen.queryByTestId('release-preview')).toBeNull();
    await press(h, await h.screen.findByTestId('exam-rescore', {}, WAIT));
    expect(await h.screen.findByText('Yeniden puanlama tamamlandı.', {}, WAIT)).toBeTruthy();
    expect(s.posts[0].body).toEqual({ operation: 'rescore', input: { confirmPublishedChange: true, reason: 'Mobil yeniden puanlama' } });
  }, 30000);
});
