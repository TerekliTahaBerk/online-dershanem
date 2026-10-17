import { fireEvent, waitFor } from '@testing-library/react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
it('tekrar oluşturma ağ hatasından sonra aynı anahtar ve öğrenci sürümüyle tekrarlanır', async () => {
  let attempts = 0; const keys: string[] = [];
  const h = await boot([account('teacher@example.com', makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['review', 'Tekrar gerekenler', '/panel/ogretmen/tekrar']] }), { routes: {
    'GET /api/panel/staff/teacher/review': () => jsonResponse(200, { contractVersion: 1, students: [{ id: 's1', name: 'Ece', activeCount: 2, dueCount: 1, persistentCount: 0, lastReviewedAt: null, revision: 'a'.repeat(64) }] }),
    'POST /api/panel/review-queue': ({ headers }) => { keys.push(headers['X-Od-Idempotency-Key']); expect(headers['X-Od-Expected-Revision']).toBe('a'.repeat(64)); return ++attempts === 1 ? jsonResponse(503, { error: 'Tekrar deneyin.' }) : jsonResponse(200, { id: 'r1' }); },
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/review');
  fireEvent.changeText(await h.screen.findByTestId('review-title', {}, WAIT), 'Köklü sayılar');
  fireEvent.changeText(h.screen.getByTestId('review-source'), 'Föy 2, soru 3');
  await press(h, h.screen.getByTestId('review-create'));
  await waitFor(() => expect(attempts).toBe(1), WAIT);
  await press(h, h.screen.getByTestId('review-create'));
  expect(await h.screen.findByText('Kaynak yarının küçük tekrarlarına eklendi 🔁', {}, WAIT)).toBeTruthy();
  expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
  expect(h.server.called('POST', '/api/panel/review-queue')[1].body).toEqual({ studentId: 's1', title: 'Köklü sayılar', sourceReference: 'Föy 2, soru 3' });
});
