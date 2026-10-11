import { fireEvent, waitFor } from '@testing-library/react-native';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
const center = { contractVersion: 1, generatedAt: '2026-10-11T08:00:00.000Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };
const education = { contractVersion: 1, groups: [
  { id: 'g1', name: '8-A', subject: 'Matematik', level: '8', teacherName: 'Ada', active: true, filled: 10, capacity: 10, nextLessonAt: '2026-10-12T09:00:00Z' },
  { id: 'g2', name: 'Eski grup', subject: 'Fen', level: null, teacherName: 'Mert', active: false, filled: 0, capacity: 8, nextLessonAt: null },
], sections: [{ id: 'dersler', title: 'İlk 24 ders', rows: [{ id: 'l1', title: 'Oranlar', detail: '8-A · Ada', at: '2026-10-12T09:00:00Z', groupId: 'g1', studentId: null }] }, { id: 'odevler', title: 'Son 40 ödev', rows: [] }, { id: 'materyaller', title: 'Son 60 materyal', rows: [] }] };

async function openEducation(groupStatus = 200, response: unknown = education) {
  const bootstrap = makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' });
  const h = await boot([account('admin@example.com', bootstrap, { routes: {
    'GET /api/panel/admin/operations-center': () => jsonResponse(200, center),
    'GET /api/panel/admin/education': () => jsonResponse(200, response),
    'GET /api/panel/admin/groups/g1': ({ query }) => jsonResponse(groupStatus, groupStatus !== 200 ? { error: 'Grup bulunamadı.' } : { contractVersion: 1, id: 'g1', name: '8-A', subject: 'Matematik', level: '8', teacherName: 'Ada', active: true, filled: 10, capacity: 10, weeklyLessonCount: 2, status: 'İzle', reasons: ['Program çakışması'], tab: query.get('sekme') ?? 'genel', sections: [{ id: 'members', title: 'Öğrenciler', rows: query.get('sekme') === 'ogrenciler' ? [{ id: 's1', title: 'Ece Kaya', detail: 'Katılım %75', at: null, studentId: 's1', groupId: null }] : [] }] }),
  } })]);
  await signIn(h, 'admin@example.com');
  await press(h, await h.screen.findByTestId('nav-menu', {}, WAIT));
  await press(h, await h.screen.findByTestId('menu-groups', {}, WAIT));
  return h;
}

it('eğitim menüsü native listeyi açar; arşiv, arama ve okuma bölümleri çalışır', async () => {
  const h = await openEducation();
  expect(await h.screen.findByTestId('education-group-g1', {}, WAIT)).toBeTruthy();
  expect(h.screen.queryByTestId('education-group-g2')).toBeNull();
  await press(h, h.screen.getByTestId('chip-arsiv'));
  expect(h.screen.getByTestId('education-group-g2')).toBeTruthy();
  await press(h, h.screen.getByTestId('chip-tumu'));
  fireEvent.changeText(h.screen.getByTestId('education-search'), 'ADA');
  expect(h.screen.getByTestId('education-group-g1')).toBeTruthy();
  expect(h.screen.queryByTestId('education-group-g2')).toBeNull();
  await press(h, h.screen.getByTestId('chip-dersler'));
  expect(h.screen.getByText('Oranlar')).toBeTruthy();
  await press(h, h.screen.getByTestId('chip-odevler'));
  expect(h.screen.getByText('Bu bölümde kayıt yok')).toBeTruthy();
});

it('Grup 360 sekmeleri ayrı sorgulanır; öğrenci satırı öğrenci profiline gider', async () => {
  const h = await openEducation();
  await press(h, await h.screen.findByTestId('education-group-g1', {}, WAIT));
  expect(await h.screen.findByTestId('admin-group-detail', {}, WAIT)).toBeTruthy();
  for (const tab of ['program', 'gecmis', 'operasyon']) {
    await press(h, await h.screen.findByTestId(`chip-${tab}`, {}, WAIT));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/groups/g1').some((call) => call.path.endsWith(`sekme=${tab}`))).toBe(true), WAIT);
  }
  await press(h, await h.screen.findByTestId('chip-ogrenciler', {}, WAIT));
  expect(await h.screen.findByText('Ece Kaya', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('group-members-s1'));
  await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/students/s1')).toHaveLength(1), WAIT);
  expect(h.server.called('GET', '/api/panel/admin/groups/g1').map((call) => call.path)).toEqual(expect.arrayContaining(['/api/panel/admin/groups/g1?sekme=genel', '/api/panel/admin/groups/g1?sekme=ogrenciler']));
});

it('kaynak bulunamadığında grup verisi gösterilmez', async () => {
  const h = await openEducation(404);
  await press(h, await h.screen.findByTestId('education-group-g1', {}, WAIT));
  expect(await h.screen.findByText('Grup bulunamadı.', {}, WAIT)).toBeTruthy();
  expect(h.screen.queryByText('Doluluk')).toBeNull();
});

it('hatalı eğitim sözleşmesi başarı görünümü oluşturmaz', async () => {
  const h = await openEducation(200, { ...education, contractVersion: 2 });
  expect(await h.screen.findByText('Sunucudan beklenmeyen bir yanıt alındı.', {}, WAIT)).toBeTruthy();
  expect(h.screen.queryByTestId('education-group-g1')).toBeNull();
});

it('öğrenci doğrudan yönetim grup rotasını açsa da API isteği atılmaz', async () => {
  const h = await boot([account('student@example.com', makeBootstrap())]);
  await signIn(h, 'student@example.com');
  await go('/admin/group/g1');
  expect(await h.screen.findByText('Bu bölüm hesabında yok', {}, WAIT)).toBeTruthy();
  expect(h.server.called('GET', '/api/panel/admin/groups/g1')).toHaveLength(0);
});
