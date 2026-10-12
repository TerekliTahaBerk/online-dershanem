import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

const center = { contractVersion: 1, generatedAt: '2026-10-11T08:00:00.000Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };

const directory = {
  contractVersion: 1,
  view: 'ogrenciler',
  views: [
    { id: 'tumu', label: 'Tümü' },
    { id: 'ogrenciler', label: 'Öğrenciler' },
  ],
  roleFilterAllowed: false,
  filters: { roles: [], products: [{ value: '', label: 'Tümü' }], statuses: [{ value: '', label: 'Tümü' }] },
  query: { q: '', rol: '', urun: '', durum: '' },
  page: 1,
  pages: 1,
  total: 1,
  people: [{ id: 'u-ece', name: 'Ece Kaya', email: 'ece@example.com', role: 'STUDENT', roleLabel: 'Öğrenci', status: 'ACTIVE', statusLabel: 'Aktif', statusTone: 'success', invitePending: false, lastLoginAt: null, detail: '8 · LGS', badges: [], studentProfileId: 'sp1' }],
  pendingMfaResets: [],
  studentsAwaitingAccess: 2,
};

const card = (id: string, title: string, rows: { title: string }[] = []) => ({ id, title, metrics: [], rows: rows.map((row) => ({ subtitle: null, meta: null, badge: null, ...row })), empty: rows.length ? null : 'Kayıt yok.' });

const student360 = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  studentProfileId: 'sp1',
  studentUserId: 'u-ece',
  summary: { name: 'Ece Kaya', email: 'ece@example.com', detail: '8 · LGS', products: 'onlinedershanem. · Yön Koçluk', groups: '8-A · Matematik (Ali)', coach: null, packageStatus: { label: 'Erişim açılışı bekliyor', tone: 'warning' }, risk: { label: 'Orta', tone: 'warning', reasons: ['2 devamsızlık'] }, lastActivityAt: null },
  group: 'genel',
  groups: [
    { id: 'genel', label: 'Genel' },
    { id: 'ogrenme', label: 'Öğrenme' },
  ],
  view: null,
  views: [],
  cards: [card('overview', 'Genel bakış', [{ title: 'Kesirler' }])],
  coach: { revision: 'a'.repeat(64), currentCoachId: null, cadenceDays: null, options: [{ id: 'cp1', label: 'Mert (10/10)' }] },
  blockedOrders: [{ id: 'o1', packageName: 'LGS Paketi' }],
  ...overrides,
});

async function signInAdmin(routes: NonNullable<FakeAccount['routes']>) {
  const bootstrap = makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' });
  const h = await boot([account('admin@example.com', bootstrap, { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, center), ...routes } })]);
  await signIn(h, 'admin@example.com');
  await h.screen.findByTestId('admin-operations-center', {}, WAIT);
  return h;
}

describe('Faz 2.2 kalan kişi ekranları', () => {
  it('öğrenci satırı Öğrenci 360\'a açılır; sekme sunucuya ?sekme= ile gider; kapasite dolunca gerekçe istenir; erişim yeniden denenir', async () => {
    let capacityChecked = false;
    const h = await signInAdmin({
      'GET /api/panel/admin/people': () => jsonResponse(200, directory),
      'GET /api/panel/admin/students/sp1': ({ query }) => jsonResponse(200, query.get('sekme') === 'ogrenme' ? student360({ group: 'ogrenme', view: 'dersler', views: [{ id: 'dersler', label: 'Dersler' }, { id: 'odevler', label: 'Ödevler' }], cards: [card('lessons', 'Dersler')] }) : student360()),
      'POST /api/panel/admin/coach-assignments': ({ body }) => {
        if (!(body as { overrideReason?: string }).overrideReason) {
          capacityChecked = true;
          return jsonResponse(422, { error: 'Koç kapasitesi dolu; atama için en az 3 karakterlik gerekçe gerekli.', code: 'CAPACITY' });
        }
        return jsonResponse(200, { ok: true });
      },
      'POST /api/panel/admin/orders/o1/provisioning-retry': () => jsonResponse(200, { ok: true, outcome: 'manual_review:Veli eksik', succeeded: false, message: 'Elle inceleme gerekiyor: Veli eksik' }),
    });
    await press(h, await h.screen.findByTestId('nav-menu', {}, WAIT));
    await press(h, await h.screen.findByTestId('menu-people', {}, WAIT));
    expect(await h.screen.findByText('2 öğrenci erişim bekliyor', {}, WAIT)).toBeTruthy();
    await press(h, await h.screen.findByTestId('admin-person-u-ece', {}, WAIT));
    expect(await h.screen.findByTestId('admin-student-360', {}, WAIT)).toBeTruthy();
    expect(await h.screen.findByText('Kesirler', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Risk: Orta')).toBeTruthy();

    await press(h, h.screen.getByTestId('student-coach-submit'));
    await waitFor(() => expect(capacityChecked).toBe(true), WAIT);
    expect(await h.screen.findByText(/Koç kapasitesi dolu/, {}, WAIT)).toBeTruthy();
    expect(h.screen.getByTestId('student-coach-submit').props.accessibilityState?.disabled).toBe(true);
    fireEvent.changeText(h.screen.getByTestId('student-coach-reason'), 'Dönem sonu yoğunluğu');
    await press(h, h.screen.getByTestId('student-coach-submit'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/admin/coach-assignments')[1]?.body).toEqual(expect.objectContaining({ studentId: 'sp1', coachId: 'cp1', overrideReason: 'Dönem sonu yoğunluğu', expectedRevision: 'a'.repeat(64), idempotencyKey: expect.any(String) })), WAIT);
    expect(await h.screen.findByText('Koç atandı.', {}, WAIT)).toBeTruthy();

    await press(h, h.screen.getByTestId('student-retry-o1'));
    expect(await h.screen.findByText('LGS Paketi: Elle inceleme gerekiyor: Veli eksik', {}, WAIT)).toBeTruthy();

    await press(h, h.screen.getByTestId('chip-ogrenme'));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/students/sp1').some((call) => call.path.includes('sekme=ogrenme'))).toBe(true), WAIT);
    await press(h, await h.screen.findByTestId('chip-odevler', {}, WAIT));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/students/sp1').some((call) => call.path.includes('sekme=ogrenme') && call.path.includes('gorunum=odevler'))).toBe(true), WAIT);
  });

  it('öğrenci 360 bağlantı yönetimi: veli bu öğrenciye sabit bağlanır, branş öğretmeni bağlanır ve onaylı kaldırılır', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.find((button) => button.style === 'destructive')?.onPress?.());
    const manage = { parents: [], teachers: [{ id: 'tl1', name: 'Ayşe Hoca', subject: 'Fen' }], parentOptions: [{ id: 'u-ayse', name: 'Ayşe Kaya' }], teacherOptions: [{ id: 't-ali', name: 'Ali Hoca' }] };
    const h = await signInAdmin({
      'GET /api/panel/admin/students/sp1': () => jsonResponse(200, student360({ manage })),
      'POST /api/panel/relationships': () => jsonResponse(200, { id: 'ps9' }),
      'POST /api/panel/student-teachers': () => jsonResponse(200, { id: 'tl2' }),
      'DELETE /api/panel/student-teachers': () => jsonResponse(200, { ok: true }),
    });
    await go('/admin/student/sp1');
    await press(h, await h.screen.findByTestId('student-parent-link-open', {}, WAIT));
    expect(h.screen.queryByTestId('admin-link-student-search')).toBeNull();
    fireEvent.changeText(await h.screen.findByTestId('admin-link-parent-search', {}, WAIT), 'ayşe');
    await press(h, await h.screen.findByTestId('admin-link-parent-u-ayse', {}, WAIT));
    await press(h, h.screen.getByTestId('admin-link-submit'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/relationships')[0]?.body).toEqual({ parentId: 'u-ayse', studentId: 'sp1', primaryContact: true, canViewAcademic: true, canViewPayments: true }), WAIT);

    fireEvent.changeText(await h.screen.findByTestId('student-teacher-search', {}, WAIT), 'ali');
    await press(h, await h.screen.findByTestId('student-teacher-t-ali', {}, WAIT));
    fireEvent.changeText(h.screen.getByTestId('student-teacher-subject'), 'Matematik');
    await press(h, h.screen.getByTestId('student-teacher-link'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/student-teachers')[0]?.body).toEqual({ studentId: 'sp1', teacherId: 't-ali', subject: 'Matematik' }), WAIT);
    await press(h, await h.screen.findByTestId('student-teacher-remove-tl1', {}, WAIT));
    await waitFor(() => expect(h.server.called('DELETE', '/api/panel/student-teachers')[0]?.body).toEqual({ id: 'tl1' }), WAIT);
  });

  it('veliler: bağlantı aranarak kurulur (izinlerle), onaylı kaldırılır', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.find((button) => button.style === 'destructive')?.onPress?.());
    const h = await signInAdmin({
      'GET /api/panel/admin/parents': () =>
        jsonResponse(200, {
          contractVersion: 1,
          query: { q: '', durum: '' },
          statuses: [{ value: '', label: 'Tümü' }, { value: 'baglantisiz', label: 'Öğrenci bağlantısı yok' }],
          page: 1,
          pages: 1,
          total: 1,
          withoutRelationshipCount: 1,
          parents: [{ id: 'u-ayse', name: 'Ayşe Kaya', email: 'ayse@example.com', statusLabel: 'Öğrenci bağlantısı yok', attention: true, studentCount: 0, students: '' }],
          relationships: [{ id: 'ps1', parentId: 'u-can', parentName: 'Can Demir', studentName: 'Deniz Demir', relationship: 'Baba' }],
          history: [{ id: 'h1', title: 'Can Demir · Deniz Demir', actionLabel: 'Bağlantı eklendi', detail: '10 Eki 2026 · Ada' }],
          parentOptions: [{ id: 'u-ayse', name: 'Ayşe Kaya' }, { id: 'u-can', name: 'Can Demir' }],
          studentOptions: [{ id: 'sp1', name: 'Ece Kaya' }],
        }),
      'POST /api/panel/relationships': () => jsonResponse(200, { id: 'ps2' }),
      'DELETE /api/panel/relationships/ps1': () => jsonResponse(200, { ok: true }),
    });
    await go('/admin/parents');
    expect(await h.screen.findByText('1 veli henüz bir öğrenciye bağlı değil', {}, WAIT)).toBeTruthy();
    await press(h, h.screen.getByTestId('admin-relationship-create-open'));
    fireEvent.changeText(await h.screen.findByTestId('admin-link-parent-search', {}, WAIT), 'ayş');
    await press(h, await h.screen.findByTestId('admin-link-parent-u-ayse', {}, WAIT));
    fireEvent.changeText(h.screen.getByTestId('admin-link-student-search'), 'ece');
    await press(h, await h.screen.findByTestId('admin-link-student-sp1', {}, WAIT));
    fireEvent.changeText(h.screen.getByTestId('admin-link-relationship'), 'Anne');
    await press(h, h.screen.getByTestId('admin-link-canViewPayments'));
    await press(h, h.screen.getByTestId('admin-link-submit'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/relationships')[0]?.body).toEqual({ parentId: 'u-ayse', studentId: 'sp1', relationship: 'Anne', primaryContact: true, canViewAcademic: true, canViewPayments: false }), WAIT);
    expect(await h.screen.findByText('Bağlantı kuruldu.', {}, WAIT)).toBeTruthy();

    await press(h, h.screen.getByTestId('admin-relationship-remove-ps1'));
    await waitFor(() => expect(h.server.called('DELETE', '/api/panel/relationships/ps1')).toHaveLength(1), WAIT);
  });

  it('öğretmen doluluğu: kapasite aşımı uyarısı ve satır kişi detayına açılır', async () => {
    const h = await signInAdmin({
      'GET /api/panel/admin/educators': () =>
        jsonResponse(200, { contractVersion: 1, overCapacity: 1, teachers: [{ id: 'u-ali', name: 'Ali Hoca', active: true, statusLabel: 'Aktif', subjects: 'Matematik', levels: '8', fill: '21 / 20 kontenjan · %105 · aşıldı', over: true }] }),
    });
    await go('/admin/educators');
    expect(await h.screen.findByText('1 öğretmenin grubu kapasite üstünde', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Doluluk: 21 / 20 kontenjan · %105 · aşıldı')).toBeTruthy();
    expect(h.screen.getByText('Kapasite üstü')).toBeTruthy();
  });

  it('yeni kayıtlar: iletişim durumu kaydedilir; çocuk hesabı açılır ve davet paylaşılır', async () => {
    const signups = (tab: 'kayitlar' | 'cocuklar') => ({
      contractVersion: 1,
      tab,
      counts: { newCount: 1, pendingCount: 1 },
      filters: [{ value: 'tumu', label: 'Tümü' }, { value: 'yeni', label: 'Aranmadı' }],
      filter: 'tumu',
      contactStatuses: [{ value: 'NEW', label: 'Aranmadı' }, { value: 'CONTACTED', label: 'Arandı' }],
      page: 1,
      pages: 1,
      total: 1,
      signups: tab === 'kayitlar' ? [{ id: 'u-new', name: 'Selin Ak', roleLabel: 'Veli', email: 'selin@example.com', phone: '+905551112233', whatsAppUrl: 'https://wa.me/905551112233', createdAt: '2026-10-10T08:00:00.000Z', interested: 'onlinedershanem.', purchase: { label: 'Satın almadı', tone: 'neutral' }, formDone: true, contactStatus: 'NEW', contactStatusLabel: 'Aranmadı', contactNote: null, contactedAt: null, details: [{ label: 'Sınıf', value: '8' }] }] : [],
      children: tab === 'cocuklar' ? [{ id: 'ch1', name: 'Deniz Ak', detail: '8 · LGS', paid: true, packages: 'LGS Paketi', parentId: 'u-new', parentName: 'Selin Ak', parentContact: 'selin@example.com', parentPhone: null, childContact: null, defaultEmail: null }] : [],
    });
    const h = await signInAdmin({
      'GET /api/panel/admin/signups': ({ query }) => jsonResponse(200, signups(query.get('sekme') === 'cocuklar' ? 'cocuklar' : 'kayitlar')),
      'PATCH /api/panel/signups/u-new/contact': () => jsonResponse(200, { ok: true }),
      'POST /api/panel/signups/children/ch1/account': () =>
        jsonResponse(200, { student: { id: 'u-deniz', email: 'deniz@example.com', fullName: 'Deniz Ak', linkedExisting: false }, invite: { url: 'https://onlinedershanem.com/davet/xyz', message: 'Davet', expiresAt: '2026-10-14T08:00:00.000Z' }, provisioning: [{ orderId: 'o9', product: 'OD', outcome: 'succeeded' }] }),
    });
    await press(h, h.screen.getByTestId('nav-signups'));
    expect(await h.screen.findByTestId('admin-signups', {}, WAIT)).toBeTruthy();
    await press(h, await h.screen.findByTestId('admin-signup-u-new', {}, WAIT));
    await press(h, await h.screen.findByTestId('admin-signup-contact-u-new', {}, WAIT));
    await press(h, await h.screen.findByTestId('chip-CONTACTED', {}, WAIT));
    fireEvent.changeText(h.screen.getByTestId('admin-signup-note'), 'Akşam tekrar aranacak');
    await press(h, h.screen.getByTestId('admin-signup-contact-submit'));
    await waitFor(() => expect(h.server.called('PATCH', '/api/panel/signups/u-new/contact')[0]?.body).toEqual({ contactStatus: 'CONTACTED', contactNote: 'Akşam tekrar aranacak' }), WAIT);
    expect(await h.screen.findByText('İletişim durumu kaydedildi.', {}, WAIT)).toBeTruthy();

    await press(h, h.screen.getByTestId('chip-cocuklar'));
    await press(h, await h.screen.findByTestId('admin-child-account-ch1', {}, WAIT));
    fireEvent.changeText(await h.screen.findByTestId('admin-child-email', {}, WAIT), 'deniz@example.com');
    await press(h, h.screen.getByTestId('admin-child-submit'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/signups/children/ch1/account')[0]?.body).toEqual({ email: 'deniz@example.com', fullName: 'Deniz Ak' }), WAIT);
    expect(await h.screen.findByText('https://onlinedershanem.com/davet/xyz', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText(/1\/1 siparişin erişimi açıldı/, { includeHiddenElements: true })).toBeTruthy();
  });
});
