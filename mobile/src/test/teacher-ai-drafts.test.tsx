import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, RefreshControl, Share } from 'react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
beforeEach(() => secureStore.__store.clear());
const path = '/api/panel/staff/teacher/ai-drafts';
const content = { title: 'Kesirler çalışması', body: 'İki örnek çöz ve yolunu açıkla.', checkPrompt: 'Ana adım nedir?', successCriteria: ['Yolunu açıklar', 'Sonucu kontrol eder'], citations: ['LESSON_TITLE'] };
const draft = { id: 'd1', taskType: 'ASSIGNMENT', status: 'DRAFT', provider: 'FALLBACK', promptVersion: 'v1', modelName: null, fallbackReason: 'PROVIDER_DISABLED', version: 1, createdAt: '2026-10-13T10:00:00Z', lessonTitle: 'Kesirler', revision: 'b'.repeat(64), sourceRefs: [{ id: 'LESSON_TITLE', label: 'Ders başlığı' }], originalContent: content, reviewedContent: null as object | null };
const base = { contractVersion: 1, lessons: [{ id: 'l1', title: 'Kesirler', groupName: '8-A', startsAt: '2026-10-13T10:00:00Z', revision: 'a'.repeat(64) }], drafts: [] as typeof draft[] };
const bootstrap = () => makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['ai-drafts', 'AI yardımcı', '/panel/ogretmen/ai-yardimci']] });
it('create retries original source revision and key after background refresh; no provider secret leaves client', async () => {
  let current = { ...base }; let attempts = 0; const keys: string[] = [];
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, current), [`POST ${path}`]: ({ headers, body }) => {
      expect(body).toEqual({ operation: 'create', lessonId: 'l1', taskType: 'ASSIGNMENT' }); expect(headers['X-Od-Expected-Revision']).toBe(base.lessons[0].revision); keys.push(headers['X-Od-Idempotency-Key']);
      if (++attempts === 1) return jsonResponse(503, { error: 'Tekrar deneyin.' }); current = { ...current, drafts: [draft] }; return jsonResponse(200, { ok: true, id: 'd1', replayed: true });
    },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/ai-drafts'); await press(h, await h.screen.findByTestId('ai-create', {}, WAIT));
  expect(await h.screen.findByText('Tekrar deneyin.', {}, WAIT)).toBeTruthy(); current = { ...current, lessons: [{ ...base.lessons[0], revision: 'c'.repeat(64) }] };
  await act(async () => { h.screen.UNSAFE_getAllByType(RefreshControl)[0].props.onRefresh(); }); await waitFor(() => expect(h.server.called('GET', path).length).toBeGreaterThan(1), WAIT);
  await press(h, h.screen.getByTestId('ai-create')); expect(await h.screen.findByText('Ders başlığı · taslakta kullanıldı', {}, WAIT)).toBeTruthy(); expect(keys[0]).toBe(keys[1]); expect(h.screen.getByText('Kaynaklı kural taslağı · Dış model kullanılmadı')).toBeTruthy();
}, 30000);
it('edited approval requires human confirmation, preserves citation and allows sharing only after approval', async () => {
  let current = { ...base, drafts: [draft] }; let reviewed = false;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, current), [`POST ${path}`]: ({ body }) => {
      const input = body as { input: { content: object; action: string } }; expect(input.input.action).toBe('APPROVE'); expect(input.input.content).toMatchObject({ title: 'Öğretmenin düzenlediği taslak' }); expect(input.input.content).not.toHaveProperty('citations'); reviewed = true;
      current = { ...base, drafts: [{ ...draft, status: 'APPROVED', version: 2, reviewedContent: { ...content, ...input.input.content } }] }; return jsonResponse(200, { ok: true, id: 'd1', replayed: false });
    },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/ai-drafts'); await press(h, await h.screen.findByTestId('ai-open-d1', {}, WAIT));
  await press(h, h.screen.getByText('Onaylı taslak metnini paylaş')); expect(share).not.toHaveBeenCalled();
  fireEvent.changeText(h.screen.getByTestId('ai-title'), 'Öğretmenin düzenlediği taslak'); await press(h, h.screen.getByTestId('ai-approve')); expect(alert).toHaveBeenCalled(); expect(reviewed).toBe(false);
  alert.mockImplementation((_title, _message, buttons) => buttons?.find((b) => b.text === 'Onayla')?.onPress?.()); await press(h, h.screen.getByTestId('ai-approve'));
  expect(await h.screen.findByText('İnsan onayı kaydedildi. İçerik otomatik yayınlanmadı.', {}, WAIT)).toBeTruthy(); await waitFor(() => expect(h.screen.queryByTestId('ai-approve')).toBeNull(), WAIT); await press(h, h.screen.getByText('Onaylı taslak metnini paylaş')); expect(share).toHaveBeenCalled();
}, 30000);
it.each(['FLAG', 'REJECT'])('terminal %s command is native and cannot be approved afterward', async (action) => {
  let current = { ...base, drafts: [draft] };
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: {
    [`GET ${path}`]: () => jsonResponse(200, current), [`POST ${path}`]: ({ body }) => {
      const input = body as { input: { action: string; flagReason?: string } }; expect(input.input.action).toBe(action); if (action === 'FLAG') expect(input.input.flagReason).toBe('FACTUAL_ERROR'); current = { ...base, drafts: [{ ...draft, status: action === 'FLAG' ? 'FLAGGED' : 'REJECTED', version: 2 }] }; return jsonResponse(200, { ok: true, id: 'd1', replayed: false });
    },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/ai-drafts'); await press(h, await h.screen.findByTestId('ai-open-d1', {}, WAIT)); await press(h, h.screen.getByTestId(action === 'FLAG' ? 'ai-flag' : 'ai-reject'));
  await waitFor(() => expect(h.screen.queryByTestId('ai-approve')).toBeNull(), WAIT);
});
it('conflict closes stale editor and refreshes the queue', async () => {
  const h = await boot([account('teacher@example.com', bootstrap(), { routes: { [`GET ${path}`]: () => jsonResponse(200, { ...base, drafts: [draft] }), [`POST ${path}`]: () => jsonResponse(409, { error: 'Değişti.' }) } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/ai-drafts'); await press(h, await h.screen.findByTestId('ai-open-d1', {}, WAIT)); await press(h, h.screen.getByTestId('ai-reject'));
  expect(await h.screen.findByText(/Kaynak veya taslak değişti/, {}, WAIT)).toBeTruthy(); expect(h.screen.queryByTestId('ai-approve')).toBeNull(); await waitFor(() => expect(h.server.called('GET', path).length).toBeGreaterThan(1), WAIT);
});
