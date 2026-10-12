import { fireEvent, waitFor } from '@testing-library/react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
const data = {
  contractVersion: 1, templates: [{ exam: 'YDT', label: 'YDT', defaultDuration: 120, sections: [{ code: 'YDT', name: 'Yabancı Dil', questions: 80 }] }],
  errorCategories: [{ value: 'TIME', label: 'Süre' }, { value: 'PROCESS', label: 'İşlem' }], students: [{ id: 's1', name: 'Ece' }], studentId: 's1',
  exams: [{ id: 'e1', exam: 'YDT', title: 'Dil denemesi', publisher: '', takenAt: '2026-10-12T09:00:00Z', durationMinutes: 120, nextAction: null, net: 68, correct: 70, incorrect: 8, blank: 2, revision: 'a'.repeat(64), sections: [{ id: 'sec1', subjectName: 'Yabancı Dil', correct: 70, incorrect: 8, blank: 2, net: 68, errors: ['TIME'] }] }],
  trend: { heatmap: [], recurring: null }, approval: null,
};
it('OK öğrencisi native deneme oluşturur, neden revizyonunu sürüm ve anahtarla kaydeder', async () => {
  const h = await boot([account('student@example.com', makeBootstrap({ role: 'STUDENT', products: { OK: 'ACTIVE' }, activeProduct: 'OK' }), { routes: {
    'GET /api/panel/mock-exams/workspace': () => jsonResponse(200, data),
    'POST /api/panel/mock-exams': () => jsonResponse(200, { exam: {}, replayed: false }),
    'PATCH /api/panel/mock-exams/e1': () => new Response(null, { status: 204 }),
  } })]);
  await signIn(h, 'student@example.com');
  await go('/od/mock-exam-editor');
  fireEvent.changeText(await h.screen.findByTestId('mock-title', {}, WAIT), 'Yeni deneme');
  await press(h, h.screen.getByTestId('mock-submit'));
  await waitFor(() => expect(h.server.called('POST', '/api/panel/mock-exams')).toHaveLength(1), WAIT);
  expect(h.server.called('POST', '/api/panel/mock-exams')[0].body).toMatchObject({ studentId: 's1', exam: 'YDT', title: 'Yeni deneme', idempotencyKey: expect.any(String) });
  await press(h, h.screen.getByTestId('mock-reasons-e1'));
  await press(h, await h.screen.findByTestId('mock-reasons-save', {}, WAIT));
  await waitFor(() => expect(h.server.called('PATCH', '/api/panel/mock-exams/e1')).toHaveLength(1), WAIT);
  expect(h.server.called('PATCH', '/api/panel/mock-exams/e1')[0].body).toEqual({ expectedRevision: 'a'.repeat(64), reasons: [{ sectionId: 'sec1', categories: ['TIME'] }], idempotencyKey: expect.any(String) });
  expect(h.screen.queryByTestId('mock-approve')).toBeNull();
});
