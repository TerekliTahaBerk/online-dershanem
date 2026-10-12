import { waitFor } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
import { makeOdHome } from './od-fixtures';

const downloads: { url: string; headers: Record<string, string> }[] = [];
const deletes: string[] = [];
jest.mock('expo-file-system', () => {
  class Directory { uri = 'file:///cache'; create() {} get exists() { return true; } delete() {} }
  class File {
    uri = 'file:///cache/takvim.ics';
    get exists() { return true; }
    delete() { deletes.push(this.uri); }
    static async downloadFileAsync(url: string, file: File, options: { headers: Record<string, string> }) { downloads.push({ url, headers: options.headers }); return file; }
  }
  return { Directory, File, Paths: { cache: 'file:///cache' } };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
beforeEach(() => { secureStore.__store.clear(); downloads.length = 0; deletes.length = 0; jest.clearAllMocks(); });

it('öğrenci profilini API sözleşmesiyle açar; ürün/veli bilgisi görünür', async () => {
  const h = await boot([account('student@example.com', makeBootstrap({ role: 'STUDENT', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: {
    'GET /api/panel/student/home': () => jsonResponse(200, makeOdHome()),
    'GET /api/panel/student/profile': () => jsonResponse(200, { fullName: 'Ece Kaya', email: 'student@example.com', targetGoal: 'Mühendislik', classLevel: '12', parents: ['Ayşe Kaya'], activeProducts: [{ label: 'onlinedershanem.', expiresAt: null }] }),
  } })]);
  await signIn(h, 'student@example.com');
  await go('/account/profile');
  expect(await h.screen.findByText('Mühendislik', {}, WAIT)).toBeTruthy();
  expect(h.screen.getByText('Ayşe Kaya')).toBeTruthy();
  expect(h.server.called('GET', '/api/panel/student/profile')).toHaveLength(1);
});

it('öğrenci takvimini Bearer başlığıyla indirir, native paylaşır ve geçici dosyayı siler', async () => {
  const h = await boot([account('student@example.com', makeBootstrap({ role: 'STUDENT', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: {
    'GET /api/panel/student/home': () => jsonResponse(200, makeOdHome()),
    'GET /api/panel/student/lessons': () => jsonResponse(200, { profile: { id: 'sp1' }, groupNames: '', lessons: [] }),
  } })]);
  await signIn(h, 'student@example.com');
  await go('/screen/lessons');
  await press(h, await h.screen.findByTestId('calendar-export', {}, WAIT));
  await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled(), WAIT);
  expect(downloads[0].url).toMatch(/\/api\/panel\/calendar\/export$/);
  expect(downloads[0].headers.Authorization ?? downloads[0].headers.authorization).toMatch(/^Bearer /);
  expect(downloads[0].url).not.toContain('Bearer');
  expect(deletes).toContain('file:///cache/takvim.ics');
});

it('veli takvim indirmesinde açıkça seçili çocuğun kimliğini taşır', async () => {
  const h = await boot([account('parent@example.com', makeBootstrap({ role: 'PARENT', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: {
    'GET /api/panel/parent/children': () => jsonResponse(200, { contractVersion: 1, children: [{ studentId: 'child-2', name: 'Ece', products: ['OD'] }] }),
    'GET /api/panel/parent/lessons': () => jsonResponse(200, { contractVersion: 1, studentId: 'child-2', available: true, lessons: [{ id: 'l1', startsAt: '2026-10-12T10:00:00Z', title: 'Matematik', topic: null, teacherName: null, attendance: { key: 'PLANNED', label: 'Planlandı', tone: 'neutral' } }], lastSummary: null }),
  } })]);
  await signIn(h, 'parent@example.com');
  await go('/screen/lessons');
  await press(h, await h.screen.findByTestId('calendar-export', {}, WAIT));
  await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled(), WAIT);
  expect(downloads[0].url).toMatch(/\/api\/panel\/calendar\/export\?studentId=child-2$/);
});
