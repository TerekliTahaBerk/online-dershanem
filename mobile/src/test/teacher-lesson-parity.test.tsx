import { fireEvent, waitFor } from '@testing-library/react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
const lesson = {
  contractVersion: 1, id: 'l1', title: 'Ders', groupName: 'Grup', subject: 'Matematik', status: 'COMPLETED', startsAt: '2026-10-12T09:00:00Z', endsAt: '2026-10-12T10:00:00Z', meetingUrl: null, closeVersion: 1,
  flags: { quickLessonClose: true, learningOutcomes: true }, common: { topic: '', note: '', nextGoal: '', homework: '' }, previous: null, students: [],
  noteTemplates: [{ id: 't1', title: 'Kişisel', note: 'Şablon özeti', nextGoal: 'Hedef', homework: 'Çalışma', revision: 'a'.repeat(64) }],
  outcomes: { linked: [], skipReason: null, catalog: [] },
};
it('ders şablonunu uygular; belirsiz kaydı aynı anahtarla tekrarlar; kazanım arar ve favoriye ekler', async () => {
  let attempts = 0;
  const keys: string[] = [];
  const h = await boot([account('teacher@example.com', makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['lessons', 'Dersler', '/panel/ogretmen/dersler']] }), { routes: {
    'GET /api/panel/staff/teacher/lessons/l1': () => jsonResponse(200, lesson),
    'POST /api/panel/teacher/templates': ({ headers }) => { keys.push(headers['X-Od-Idempotency-Key']); return ++attempts === 1 ? jsonResponse(503, { error: 'Tekrar deneyin.' }) : jsonResponse(200, { id: 't2' }); },
    'GET /api/panel/curriculum/outcomes/search': () => jsonResponse(200, { outcomes: [{ id: 'o1', code: 'MAT1', title: 'Denklemler', subject: 'Matematik', unit: 'Ünite', favorite: false }] }),
    'POST /api/panel/teacher/outcome-favorites': () => jsonResponse(200, { ok: true }),
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/teacher/lesson/l1');
  await press(h, await h.screen.findByTestId('template-apply-t1', {}, WAIT));
  expect(h.screen.getByLabelText('Ders özeti').props.value).toBe('Şablon özeti');
  fireEvent.changeText(h.screen.getByTestId('template-title'), 'Yeni şablon');
  await press(h, h.screen.getByTestId('template-save'));
  await waitFor(() => expect(attempts).toBe(1), WAIT);
  await press(h, h.screen.getByTestId('template-save'));
  expect(await h.screen.findByText('Şablon kaydedildi ✅', {}, WAIT)).toBeTruthy();
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
  expect(h.server.called('POST', '/api/panel/teacher/templates')[1].body).toMatchObject({ title: 'Yeni şablon', note: 'Şablon özeti', nextGoal: 'Hedef', homework: 'Çalışma' });
  fireEvent.changeText(h.screen.getByTestId('outcome-search'), 'denklem');
  await press(h, h.screen.getByTestId('outcome-search-submit'));
  await press(h, await h.screen.findByTestId('outcome-favorite-o1', {}, WAIT));
  expect(await h.screen.findByText('Kazanım favorilere eklendi ⭐', {}, WAIT)).toBeTruthy();
  expect(h.server.called('GET', '/api/panel/curriculum/outcomes/search')[0].path).toContain('lessonId=l1');
  expect(h.server.called('POST', '/api/panel/teacher/outcome-favorites')[0].body).toEqual({ outcomeId: 'o1', favorite: true });
});
