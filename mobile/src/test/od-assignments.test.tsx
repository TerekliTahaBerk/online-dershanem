import { fireEvent, waitFor, within } from 'expo-router/testing-library';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT, type Harness } from './harness';
import { makeAssignment, makeAssignmentList } from './od-fixtures';
import type { FakeAccount } from './fake-server';

beforeEach(() => secureStore.__store.clear());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Sunucu durumu: sürüm, mutationKey tekrarı ve idempotency anahtarı sunucudaki gibi davranır. */
function assignmentServer(options: { evidence?: boolean } = {}) {
  const state = { version: 1, status: 'TODO' as 'TODO' | 'IN_PROGRESS' | 'DONE', lastKey: null as string | null, submissions: [] as { key: string; text: string }[] };
  const routes: FakeAccount['routes'] = {
    'GET /api/panel/assignments': () =>
      jsonResponse(
        200,
        makeAssignmentList(
          [
            makeAssignment({
              status: state.status,
              version: state.version,
              evidenceRequired: Boolean(options.evidence),
              criteria: options.evidence ? [{ id: 'c1', label: 'Çözüm adımları' }, { id: 'c2', label: 'Doğruluk' }] : [],
              submissions: state.submissions.map((item, index) => ({ id: `s-${index + 1}`, attemptNumber: index + 1, status: 'SUBMITTED' as const, textEvidence: item.text, feedback: null, scores: [], submittedAt: '2026-10-08T09:00:00.000Z', reviewedAt: null })).reverse(),
            }),
            makeAssignment({ id: 'a-done', title: 'Bitti', status: 'DONE' }),
          ],
          Boolean(options.evidence),
        ),
      ),
    'PATCH /api/panel/assignments/a-1/progress': ({ body }) => {
      const input = body as { status: typeof state.status; expectedVersion: number; mutationKey: string };
      if (input.mutationKey === state.lastKey) return jsonResponse(200, { ok: true, version: state.version, replayed: true });
      if (input.expectedVersion !== state.version) return jsonResponse(409, { error: 'Ödev durumu başka bir sekmede değişti.', code: 'ASSIGNMENT_PROGRESS_CONFLICT', latestVersion: state.version });
      state.version += 1;
      state.status = input.status;
      state.lastKey = input.mutationKey;
      return jsonResponse(200, { ok: true, version: state.version, replayed: false });
    },
    'POST /api/panel/assignments/a-1/submissions': ({ body }) => {
      const input = body as { textEvidence: string; idempotencyKey: string };
      const replay = state.submissions.findIndex((item) => item.key === input.idempotencyKey);
      if (replay >= 0) return jsonResponse(200, { id: `s-${replay + 1}`, attemptNumber: replay + 1, replayed: true });
      if (state.submissions.length) return jsonResponse(409, { error: 'Gönderin öğretmeninde; değerlendirdiğinde burada göreceksin.' });
      state.submissions.push({ key: input.idempotencyKey, text: input.textEvidence });
      return jsonResponse(200, { id: 's-1', attemptNumber: 1, replayed: false });
    },
  };
  return { state, routes };
}

async function openDetail(h: Harness) {
  await go('/od/assignment/a-1');
  return within(await h.screen.findByTestId('assignment-detail', {}, WAIT));
}

describe('M2.2 Çalışmalar', () => {
  it('liste: OD kapsamlı uç, sekmelere göre gruplama; Yön plan görevi yok', async () => {
    const server = assignmentServer();
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes: server.routes })]);
    await signIn(h, 'ada@example.com');
    // Odakta olmayan sekmeler dondurulur (react-freeze); Çalışmalar sekmesine geç.
    await h.screen.findByTestId('od-home', {}, WAIT);
    await go('/slot-1');
    const list = within(await h.screen.findByTestId('od-assignments', {}, WAIT));
    expect(await list.findByText('Kesirler çalışma kâğıdı', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/assignments')[0].path).toBe('/api/panel/assignments?scope=OD');
    expect(list.queryByText('Bitti')).toBeNull();
    await press(h, list.getByTestId('tab-submitted'));
    expect(await list.findByText('Bitti', {}, WAIT)).toBeTruthy();
    expect(list.queryByText(/Yön Koçluk plan/)).toBeNull();
  });

  it('durum değişikliği: expectedVersion + gerçek UUID mutationKey; başarı yalnız sunucu onayından sonra; görünüm yenilenir', async () => {
    const server = assignmentServer();
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes: server.routes })]);
    await signIn(h, 'ada@example.com');
    const detail = await openDetail(h);
    const before = h.server.called('GET', '/api/panel/assignments').length;
    await press(h, await detail.findByTestId('progress-DONE', {}, WAIT));
    expect(await detail.findByText('Süper, çalışmayı tamamladın!', {}, WAIT)).toBeTruthy();
    const patch = h.server.called('PATCH', '/api/panel/assignments/a-1/progress')[0];
    expect(patch.body).toMatchObject({ status: 'DONE', expectedVersion: 1 });
    expect((patch.body as { mutationKey: string }).mutationKey).toMatch(UUID);
    await waitFor(() => expect(h.server.called('GET', '/api/panel/assignments').length).toBeGreaterThan(before), WAIT);
    expect(server.state.status).toBe('DONE');
  });

  it('çakışma (409): sessizce üzerine yazılmaz; yetkili durum yeniden yüklenir ve açıklanır', async () => {
    const server = assignmentServer();
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes: server.routes })]);
    await signIn(h, 'ada@example.com');
    const detail = await openDetail(h);
    await detail.findByTestId('progress-DONE', {}, WAIT);
    // Web panelinde başka bir değişiklik: sunucu sürümü ilerledi, ekran hâlâ eski sürümü görüyor.
    server.state.version = 5;
    server.state.status = 'IN_PROGRESS';
    const before = h.server.called('GET', '/api/panel/assignments').length;
    await press(h, detail.getByTestId('progress-DONE'));
    expect(await detail.findByText(/başka bir yerden \(ör\. web panelinden\) değişmiş/, {}, WAIT)).toBeTruthy();
    expect(server.state.status).toBe('IN_PROGRESS');
    await waitFor(() => expect(h.server.called('GET', '/api/panel/assignments').length).toBeGreaterThan(before), WAIT);
  });

  it('ağ kesintisi: yazma otomatik tekrarlanmaz; kullanıcı tekrar denediğinde AYNI mutationKey gider, tek değişiklik olur', async () => {
    const server = assignmentServer();
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes: server.routes })]);
    await signIn(h, 'ada@example.com');
    const detail = await openDetail(h);
    await detail.findByTestId('progress-IN_PROGRESS', {}, WAIT);
    h.server.override('PATCH /api/panel/assignments/a-1/progress', () => Promise.reject(new TypeError('Network request failed')));
    await press(h, detail.getByTestId('progress-IN_PROGRESS'));
    expect(await detail.findByText('Sunucuya ulaşamadık. İnternet bağlantını kontrol edip bir daha dener misin?', {}, WAIT)).toBeTruthy();
    expect(h.server.called('PATCH', '/api/panel/assignments/a-1/progress')).toHaveLength(1);
    h.server.override('PATCH /api/panel/assignments/a-1/progress', null);
    await press(h, detail.getByTestId('progress-IN_PROGRESS'));
    expect(await detail.findByText('İlerlemeni kaydettik.', {}, WAIT)).toBeTruthy();
    const [first, second] = h.server.called('PATCH', '/api/panel/assignments/a-1/progress');
    expect((second.body as { mutationKey: string }).mutationKey).toBe((first.body as { mutationKey: string }).mutationKey);
    expect(server.state.version).toBe(2);
  });

  it('kanıt: sınır doğrulaması; ağ hatasından sonra aynı idempotency anahtarı; tek teslim kaydı', async () => {
    const server = assignmentServer({ evidence: true });
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes: server.routes })]);
    await signIn(h, 'ada@example.com');
    const detail = await openDetail(h);
    const input = await detail.findByTestId('evidence-input', {}, WAIT);
    fireEvent.changeText(input, 'kısa');
    expect(detail.getByTestId('evidence-submit').props.accessibilityState).toMatchObject({ disabled: true });
    const text = 'Kesirleri payda eşitleyerek topladım ve sonucu sadeleştirdim.';
    fireEvent.changeText(input, text);
    h.server.override('POST /api/panel/assignments/a-1/submissions', () => Promise.reject(new TypeError('Network request failed')));
    await press(h, detail.getByTestId('evidence-submit'));
    expect(await detail.findByText('Sunucuya ulaşamadık. İnternet bağlantını kontrol edip bir daha dener misin?', {}, WAIT)).toBeTruthy();
    h.server.override('POST /api/panel/assignments/a-1/submissions', null);
    await press(h, detail.getByTestId('evidence-submit'));
    expect(await detail.findByText('Gönderdik! Öğretmenin bakıp sana dönecek.', {}, WAIT)).toBeTruthy();
    const [first, second] = h.server.called('POST', '/api/panel/assignments/a-1/submissions');
    expect((first.body as { idempotencyKey: string }).idempotencyKey).toMatch(UUID);
    expect((second.body as { idempotencyKey: string }).idempotencyKey).toBe((first.body as { idempotencyKey: string }).idempotencyKey);
    expect(server.state.submissions).toHaveLength(1);
    expect(await detail.findByText('Gönderin öğretmeninde; değerlendirdiğinde burada göreceksin.', {}, WAIT)).toBeTruthy();
  });

  it('sunucu doğrulama hatası olduğu gibi gösterilir; başarılı sayılmaz', async () => {
    const server = assignmentServer();
    const h = await boot([
      account('ada@example.com', makeBootstrap(), {
        routes: { ...server.routes, 'PATCH /api/panel/assignments/a-1/progress': () => jsonResponse(409, { error: 'Bu çalışma öğretmen onayından sonra tamamlanır; önce kanıtını gönder.', code: 'EVIDENCE_REQUIRED' }) },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    const detail = await openDetail(h);
    await press(h, await detail.findByTestId('progress-DONE', {}, WAIT));
    expect(await detail.findByText('Bu çalışma öğretmen onayından sonra tamamlanır; önce kanıtını gönder.', {}, WAIT)).toBeTruthy();
    expect(detail.queryByText('Süper, çalışmayı tamamladın!')).toBeNull();
  });

  it('Yön çalışma alanında OD çalışma detayı (derin bağlantı) açılmaz; OD ucu çağrılmaz', async () => {
    const h = await boot([account('yon@example.com', makeBootstrap({ products: { OK: 'ACTIVE' } }))]);
    await signIn(h, 'yon@example.com');
    await h.screen.findByTestId('yon-today', {}, WAIT);
    await go('/od/assignment/a-1');
    expect(await h.screen.findByText('Bu bölümü burada bulamadık', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/assignments')).toHaveLength(0);
  });
});
