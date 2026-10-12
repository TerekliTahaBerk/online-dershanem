import { waitFor } from '@testing-library/react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
it('öğretmen kendi okuma ucundan deneme görür; eylem onayı öğretmen sorgusunu yeniler', async () => {
  let reads = 0;
  const data = { contractVersion: 1, templates: [{ exam: 'YDT', label: 'YDT', defaultDuration: 120, sections: [{ code: 'YDT', name: 'Yabancı Dil', questions: 80 }] }], errorCategories: [{ value: 'TIME', label: 'Süre' }], students: [{ id: 's1', name: 'Ece' }], studentId: 's1',
    exams: [{ id: 'e1', exam: 'YDT', title: 'Dil denemesi', publisher: '', takenAt: '2026-10-12T09:00:00Z', durationMinutes: 120, nextAction: null, net: 68, correct: 70, incorrect: 8, blank: 2, revision: 'a'.repeat(64), sections: [{ id: 'sec1', subjectName: 'Yabancı Dil', correct: 70, incorrect: 8, blank: 2, net: 68, errors: ['TIME'] }] }], trend: { heatmap: [], recurring: null }, approval: { examId: 'e1', action: 'Kısa prova' } };
  const h = await boot([account('teacher@example.com', makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['mock-exams', 'Dış denemeler', '/panel/ogretmen/denemeler']] }), { routes: {
    'GET /api/panel/staff/teacher/mock-exams': () => { reads++; return jsonResponse(200, data); },
    'PATCH /api/panel/mock-exams/e1': () => new Response(null, { status: 204 }),
  } })]);
  await signIn(h, 'teacher@example.com'); await go('/screen/mock-exams');
  await press(h, await h.screen.findByTestId('mock-approve', {}, WAIT));
  expect(await h.screen.findByText('Sonraki küçük eylem öğretmen tarafından onaylandı.', {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(reads).toBeGreaterThan(1), WAIT);
  expect(h.server.called('PATCH', '/api/panel/mock-exams/e1')[0].body).toEqual({ reasons: [{ sectionId: 'sec1', categories: ['TIME'] }], nextAction: 'Kısa prova', expectedRevision: 'a'.repeat(64), idempotencyKey: expect.any(String) });
  expect(h.server.called('GET', '/api/panel/admin/mock-exams')).toHaveLength(0);
});
