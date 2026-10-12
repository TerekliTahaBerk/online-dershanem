import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

const center = { contractVersion: 1, generatedAt: '2026-10-12T08:00:00.000Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };
const confirm = () => jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());

const pilot = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  meta: 'Pilot başlatılabilir',
  readiness: { canActivate: true, canExpand: false, checks: [{ key: 'slo', label: 'Çekirdek guardrail ihlali yok', status: 'WAIT', statusLabel: 'Veri bekliyor', detail: '2 çekirdek SLO için örneklem bekleniyor.' }] },
  groups: [{ id: 'g1', name: '8-A', detail: 'Ali · 12 öğrenci · 9 veli' }],
  stopReasons: [{ value: 'OPERATIONAL', label: 'Operasyon' }, { value: 'DATA_QUALITY', label: 'Veri kalitesi' }],
  cohorts: [{ id: 'c1', groupName: '8-B', status: 'ACTIVE', statusLabel: 'Aktif', tone: 'success', version: 3, memberCount: 14, coverage: { ADMIN: 1, TEACHER: 1, STUDENT: 8, PARENT: 4 }, createdAt: '2026-10-10T08:00:00.000Z', actions: [{ action: 'PAUSE', label: 'Duraklat', destructive: false, needsReason: true }, { action: 'COMPLETE', label: 'Tamamla', destructive: false, needsReason: false }, { action: 'ROLLBACK', label: 'Geri al', destructive: true, needsReason: true }] }],
  ...overrides,
});

const section = (id: string, subjectName: string, errors: string[] = []) => ({ id, subjectName, correct: 30, incorrect: 8, blank: 2, net: 28, errors });
const mockExams = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  templates: [
    { exam: 'LGS', label: 'LGS', defaultDuration: 155, sections: [{ code: 'TR', name: 'Türkçe', questions: 20 }, { code: 'MAT', name: 'Matematik', questions: 20 }] },
    { exam: 'TYT', label: 'TYT', defaultDuration: 165, sections: [{ code: 'TR', name: 'Türkçe', questions: 40 }] },
  ],
  errorCategories: [{ value: 'KNOWLEDGE', label: 'Bilgi eksiği' }, { value: 'PROCESS', label: 'İşlem / yöntem' }, { value: 'ATTENTION', label: 'Dikkat' }, { value: 'TIME', label: 'Süre yönetimi' }, { value: 'BLANK', label: 'Boş bırakma / başlayamama' }],
  students: [{ id: 's1', name: 'Ece Kaya' }, { id: 's2', name: 'Deniz Ak' }],
  studentId: 's1',
  exams: [{ id: 'e1', exam: 'TYT', title: 'Kurum 3', publisher: 'Yayın', takenAt: '2026-10-10T09:00:00.000Z', durationMinutes: 165, nextAction: null, net: 28, correct: 30, incorrect: 8, blank: 2, revision: 'a'.repeat(64), sections: [section('sec1', 'Türkçe', ['TIME'])] }],
  trend: { heatmap: [{ key: 'TYT:TR', subject: 'Türkçe', counts: [0, 0, 0, 2, 0] }], recurring: { category: 'TIME', label: 'Süre yönetimi', count: 2, action: 'Bir kısa bölümde geçme–geri dönme kararını süre tutarak prova et.' } },
  approval: { examId: 'e1', action: 'Bir kısa bölümde geçme–geri dönme kararını süre tutarak prova et.' },
  ...overrides,
});

async function open(routes: NonNullable<FakeAccount['routes']>) {
  const bootstrap = makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD', adminNav: { primary: [['today', 'Operasyon', '/panel/yonetim']], sections: [['pilot', 'Kontrollü yayın', '/panel/yonetim/pilot'], ['mock-analysis', 'Sonuç analizi', '/panel/yonetim/denemeler']] } });
  const h = await boot([account('admin@example.com', bootstrap, { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, center), ...routes } })]);
  await signIn(h, 'admin@example.com');
  await h.screen.findByTestId('admin-operations-center', {}, WAIT);
  return h;
}

describe('P2.8 kontrollü yayın', () => {
  it('menüden açılır; geçiş onay ister, 428 sonrası aynı işlem anahtarı ve sürümle tekrarlanır', async () => {
    const keys: string[] = [];
    let attempts = 0;
    const h = await open({
      'GET /api/panel/admin/pilot': () => jsonResponse(200, pilot()),
      'PATCH /api/panel/pilot-cohorts/c1': ({ body }) => {
        keys.push((body as { idempotencyKey: string }).idempotencyKey);
        return ++attempts === 1 ? jsonResponse(428, { code: 'STEP_UP_REQUIRED', error: 'Doğrulayın.' }) : jsonResponse(200, { cohort: { id: 'c1', status: 'PAUSED', version: 4 }, readiness: {} });
      },
      'POST /api/auth/mfa/code/verify': () => jsonResponse(200, { verified: true, stepUpExpiresAt: '2026-10-12T20:00:00Z' }),
    });
    await press(h, h.screen.getByTestId('nav-menu'));
    await press(h, await h.screen.findByTestId('menu-pilot', {}, WAIT));
    expect(await h.screen.findByText('Veri bekliyor', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText(/14 üye · Yönetici 1/)).toBeTruthy();
    await press(h, h.screen.getByTestId('chip-DATA_QUALITY'));
    const alert = confirm();
    await press(h, h.screen.getByTestId('pilot-PAUSE-c1'));
    expect(alert).toHaveBeenCalledWith('8-B: Duraklat', 'Durdurma nedeni: Veri kalitesi', expect.any(Array));
    fireEvent.changeText(await h.screen.findByTestId('step-up-code', {}, WAIT), '123456');
    await press(h, h.screen.getByTestId('step-up-submit'));
    await waitFor(() => expect(attempts).toBe(2), WAIT);
    expect(keys[0]).toBe(keys[1]);
    expect(h.server.called('PATCH', '/api/panel/pilot-cohorts/c1')[1].body).toEqual({ action: 'PAUSE', expectedVersion: 3, stopReason: 'DATA_QUALITY', idempotencyKey: keys[0] });
    expect(await h.screen.findByText('Pilot erişimi güvenle durduruldu; kayıtlar korunuyor.', {}, WAIT)).toBeTruthy();
  });

  it('kohort gruptan oluşturulur (requestKey); 409 görünümü yeniler ve mesajı gösterir', async () => {
    let reads = 0;
    const h = await open({
      'GET /api/panel/admin/pilot': () => {
        reads++;
        return jsonResponse(200, pilot());
      },
      'POST /api/panel/pilot-cohorts': () => jsonResponse(409, { error: 'Bu grup için açık bir pilot kaydı zaten var.', code: 'OPEN_COHORT_EXISTS' }),
    });
    await go('/screen/pilot');
    fireEvent.changeText(await h.screen.findByTestId('pilot-group-search', {}, WAIT), '8-a');
    await press(h, await h.screen.findByTestId('pilot-group-g1', {}, WAIT));
    await press(h, h.screen.getByTestId('pilot-create'));
    expect(await h.screen.findByText(/Bu grup için açık bir pilot kaydı zaten var\. Görünüm yenilendi/, {}, WAIT)).toBeTruthy();
    const body = h.server.called('POST', '/api/panel/pilot-cohorts')[0].body as { groupId: string; requestKey: string };
    expect(body.groupId).toBe('g1');
    expect(body.requestKey).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(reads).toBeGreaterThan(1), WAIT);
  });
});

describe('P2.8 dış denemeler', () => {
  it('öğrenci seçimi sunucuya gider; toplu yapıştırma, neden sınırı ve kayıt web kurallarıyla', async () => {
    const h = await open({
      'GET /api/panel/admin/mock-exams': ({ query }) => jsonResponse(200, mockExams({ studentId: query.get('ogrenci') ?? 's1' })),
      'POST /api/panel/mock-exams': () => jsonResponse(200, { exam: {}, replayed: false }),
    });
    await press(h, h.screen.getByTestId('nav-menu'));
    await press(h, await h.screen.findByTestId('menu-mock-analysis', {}, WAIT));
    expect(await h.screen.findByText('Süre yönetimi 2', {}, WAIT)).toBeTruthy();

    await press(h, h.screen.getByTestId('mock-student-chosen'));
    fireEvent.changeText(await h.screen.findByTestId('mock-student-search', {}, WAIT), 'deniz');
    await press(h, await h.screen.findByTestId('mock-student-s2', {}, WAIT));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/mock-exams').some((call) => call.path.includes('ogrenci=s2'))).toBe(true), WAIT);

    fireEvent.changeText(await h.screen.findByTestId('mock-paste', {}, WAIT), '15 3 2');
    await press(h, h.screen.getByTestId('mock-paste-apply'));
    expect(await h.screen.findByText('2 satır bekleniyor.', {}, WAIT)).toBeTruthy();
    fireEvent.changeText(h.screen.getByTestId('mock-paste'), '15 3 2\n12;4;4;40');
    await press(h, h.screen.getByTestId('mock-paste-apply'));
    expect(h.screen.getByTestId('mock-MAT-correct').props.value).toBe('12');

    fireEvent.changeText(h.screen.getByTestId('mock-date'), '2026-10-11');
    fireEvent.changeText(h.screen.getByTestId('mock-title'), 'Okul denemesi');
    await press(h, h.screen.getAllByTestId('chip-TIME')[0]);
    await press(h, h.screen.getByTestId('mock-submit'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/mock-exams')).toHaveLength(1), WAIT);
    expect(h.server.called('POST', '/api/panel/mock-exams')[0].body).toEqual(
      expect.objectContaining({
        studentId: 's2',
        exam: 'LGS',
        title: 'Okul denemesi',
        takenAt: '2026-10-11T09:00:00.000Z',
        durationMinutes: 155,
        source: 'PASTE',
        idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
        sections: [
          { subjectCode: 'TR', correctCount: 15, incorrectCount: 3, blankCount: 2, durationMinutes: null, errorCategories: ['TIME'] },
          { subjectCode: 'MAT', correctCount: 12, incorrectCount: 4, blankCount: 4, durationMinutes: 40, errorCategories: [] },
        ],
      }),
    );
    expect(await h.screen.findByText('Deneme kaydedildi. Analiz yeni kayıtla güncellendi.', {}, WAIT)).toBeTruthy();
  });

  it('sonraki adım onayı ve neden revizyonu ekrandaki revizyonla gider; 409 mesajı gösterilir', async () => {
    let patches = 0;
    const h = await open({
      'GET /api/panel/admin/mock-exams': () => jsonResponse(200, mockExams()),
      'PATCH /api/panel/mock-exams/e1': () => (++patches === 1 ? new Response(null, { status: 204 }) : jsonResponse(409, { error: 'Deneme başka bir yerde güncellendi.', code: 'MOCK_EXAM_CONFLICT' })),
    });
    await go('/screen/mock-analysis');
    await press(h, await h.screen.findByTestId('mock-approve', {}, WAIT));
    await waitFor(() => expect(h.server.called('PATCH', '/api/panel/mock-exams/e1')).toHaveLength(1), WAIT);
    expect(h.server.called('PATCH', '/api/panel/mock-exams/e1')[0].body).toEqual({ reasons: [{ sectionId: 'sec1', categories: ['TIME'] }], nextAction: mockExams().approval.action, expectedRevision: 'a'.repeat(64), idempotencyKey: expect.any(String) });
    expect(await h.screen.findByText('Sonraki küçük eylem öğretmen tarafından onaylandı.', {}, WAIT)).toBeTruthy();

    await press(h, h.screen.getByTestId('mock-reasons-e1'));
    await press(h, (await h.screen.findAllByTestId('chip-PROCESS', {}, WAIT)).at(-1)!);
    await press(h, h.screen.getByTestId('mock-reasons-save'));
    await waitFor(() => expect(h.server.called('PATCH', '/api/panel/mock-exams/e1')).toHaveLength(2), WAIT);
    expect(h.server.called('PATCH', '/api/panel/mock-exams/e1')[1].body).toEqual({ reasons: [{ sectionId: 'sec1', categories: ['TIME', 'PROCESS'] }], expectedRevision: 'a'.repeat(64), idempotencyKey: expect.any(String) });
    expect(await h.screen.findByText(/Deneme başka bir yerde güncellendi\. Görünüm yenilendi/, { includeHiddenElements: true }, WAIT)).toBeTruthy();
  });
});
