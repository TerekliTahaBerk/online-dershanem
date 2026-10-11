import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());

const center = { contractVersion: 1, generatedAt: '2026-10-11T08:00:00.000Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };

const directory = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  view: 'tumu',
  views: [
    { id: 'tumu', label: 'Tümü' },
    { id: 'ogrenciler', label: 'Öğrenciler' },
  ],
  roleFilterAllowed: true,
  filters: { roles: [{ value: '', label: 'Tümü' }, { value: 'STUDENT', label: 'Öğrenci' }], products: [{ value: '', label: 'Tümü' }, { value: 'OD', label: 'onlinedershanem.' }], statuses: [{ value: '', label: 'Tümü' }, { value: 'askida', label: 'Askıda' }] },
  query: { q: '', rol: '', urun: '', durum: '' },
  page: 1,
  pages: 2,
  total: 31,
  people: [{ id: 'u-ece', name: 'Ece Kaya', email: 'ece@example.com', role: 'STUDENT', roleLabel: 'Öğrenci', status: 'ACTIVE', statusLabel: 'Aktif', statusTone: 'success', invitePending: false, lastLoginAt: null, detail: '8 · LGS · Veli: Ayşe Kaya', badges: [] }],
  pendingMfaResets: [{ id: 'r1', targetId: 'u-admin2', targetName: 'Mert Admin', requestedByName: 'Selin', reason: 'Telefon kayboldu', createdAt: '2026-10-11T07:00:00.000Z', expiresAt: '2026-10-12T07:00:00.000Z', canApprove: true }],
  ...overrides,
});

const person = (overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  id: 'u-ece',
  name: 'Ece Kaya',
  email: 'ece@example.com',
  phone: null,
  role: 'STUDENT',
  roleLabel: 'Öğrenci',
  status: 'ACTIVE',
  statusLabel: 'Aktif',
  statusTone: 'success',
  invitePending: false,
  isSelf: false,
  createdAt: '2026-09-01T08:00:00.000Z',
  lastLoginAt: null,
  blockedOrder: null,
  profile: { fullName: 'Ece Kaya', phone: '', classLevel: '8', schoolName: '', targetGoal: '', subjects: [], bio: '' },
  memberships: [],
  productAccess: { editable: true, active: ['OD'], options: [{ value: 'OD', label: 'onlinedershanem.' }, { value: 'OK', label: 'Yön Koçluk' }, { value: 'ODK', label: 'Deneme Ligi' }] },
  orders: [],
  staff: null,
  relations: { groups: [], parents: [{ id: 'u-ayse', name: 'Ayşe Kaya', relationship: 'Anne' }], children: [], coach: null, attendance: 'Kayıt yok', notes: [], teacher: null, branchStudents: [], recentLessons: [] },
  security: { mfaLabel: 'Bu rol için gerekmiyor', pendingResets: [], canRequestReset: false },
  history: [{ id: 'h1', action: 'panel.user_updated', summary: 'ece@example.com profili güncellendi', createdAt: '2026-10-10T08:00:00.000Z', actorName: 'Ada' }],
  ...overrides,
});

async function openPeople(routes: NonNullable<FakeAccount['routes']>) {
  const bootstrap = makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' });
  const h = await boot([account('admin@example.com', bootstrap, { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, center), ...routes } })]);
  await signIn(h, 'admin@example.com');
  await press(h, await h.screen.findByTestId('nav-menu', {}, WAIT));
  await press(h, await h.screen.findByTestId('menu-people', {}, WAIT));
  expect(await h.screen.findByTestId('admin-people', {}, WAIT)).toBeTruthy();
  return h;
}

describe('Faz 2.2 kişiler', () => {
  it('dizin: süzgeç ve sayfa sunucuya web parametreleriyle gider; MFA sıfırlama kuyruğu onaylanabilir', async () => {
    const h = await openPeople({
      'GET /api/panel/admin/people': () => jsonResponse(200, directory()),
      'POST /api/panel/mfa-resets/r1/approve': () => jsonResponse(200, { status: 'COMPLETED' }),
    });
    expect(await h.screen.findByText('Ece Kaya', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('31 kişi')).toBeTruthy();
    await press(h, h.screen.getByTestId('chip-askida'));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/people').some((call) => call.path.includes('durum=askida'))).toBe(true), WAIT);
    await press(h, await h.screen.findByTestId('admin-people-next', {}, WAIT));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/people').some((call) => call.path.includes('sayfa=2') && call.path.includes('durum=askida'))).toBe(true), WAIT);
    await press(h, await h.screen.findByTestId('admin-mfa-approve-r1', {}, WAIT));
    expect(await h.screen.findByText(/MFA sıfırlaması onaylandı/, {}, WAIT)).toBeTruthy();
  });

  it('yeni kişi: rol alanları web formuyla aynı; yanıttaki tek kullanımlık davet paylaşılır', async () => {
    const h = await openPeople({
      'GET /api/panel/admin/people': () => jsonResponse(200, directory()),
      'POST /api/panel/users': () => jsonResponse(200, { user: { id: 'u-new', email: 'can@example.com', role: 'PARENT' }, invite: { url: 'https://onlinedershanem.com/davet/abc', message: 'Merhaba Can, davet: https://onlinedershanem.com/davet/abc', expiresAt: '2026-10-14T08:00:00.000Z' } }),
    });
    await press(h, await h.screen.findByTestId('admin-person-create-open', {}, WAIT));
    await press(h, await h.screen.findByTestId('chip-PARENT', {}, WAIT));
    fireEvent.changeText(h.screen.getByTestId('admin-create-email'), 'can@example.com');
    fireEvent.changeText(h.screen.getByTestId('admin-create-name'), 'Can Demir');
    await press(h, h.screen.getByTestId('admin-create-product-OK'));
    await press(h, h.screen.getByTestId('admin-create-submit'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/users')).toHaveLength(1), WAIT);
    expect(h.server.called('POST', '/api/panel/users')[0].body).toEqual({ email: 'can@example.com', fullName: 'Can Demir', phone: '', role: 'PARENT', products: ['OD', 'OK'] });
    expect(await h.screen.findByText('https://onlinedershanem.com/davet/abc', {}, WAIT)).toBeTruthy();
  });

  it('kişi detayı: sekmeler, profil kaydı (öğrenci alanları), ürün erişimi ve onaylı askıya alma', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.find((button) => button.style === 'destructive')?.onPress?.());
    const h = await openPeople({
      'GET /api/panel/admin/people': () => jsonResponse(200, directory()),
      'GET /api/panel/admin/people/u-ece': () => jsonResponse(200, person()),
      'PATCH /api/panel/users/u-ece': () => jsonResponse(200, { ok: true }),
      'PUT /api/panel/users/u-ece/products': () => jsonResponse(200, { products: ['OD', 'ODK'] }),
      'POST /api/panel/users/u-ece/status': () => jsonResponse(200, { status: 'SUSPENDED' }),
    });
    await press(h, await h.screen.findByTestId('admin-person-u-ece', {}, WAIT));
    expect(await h.screen.findByTestId('admin-person-detail', {}, WAIT)).toBeTruthy();
    await press(h, await h.screen.findByTestId('person-profile-save', {}, WAIT));
    await waitFor(() => expect(h.server.called('PATCH', '/api/panel/users/u-ece')[0]?.body).toEqual({ email: 'ece@example.com', fullName: 'Ece Kaya', phone: '', classLevel: '8', schoolName: '', targetGoal: '' }), WAIT);

    await press(h, h.screen.getByTestId('chip-urunler'));
    await press(h, await h.screen.findByTestId('person-product-ODK', {}, WAIT));
    await press(h, h.screen.getByTestId('person-products-save'));
    await waitFor(() => expect(h.server.called('PUT', '/api/panel/users/u-ece/products')[0]?.body).toEqual({ products: ['OD', 'ODK'] }), WAIT);

    await press(h, h.screen.getByTestId('chip-guvenlik'));
    await press(h, await h.screen.findByTestId('person-status-SUSPENDED', {}, WAIT));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/users/u-ece/status')[0]?.body).toEqual({ status: 'SUSPENDED' }), WAIT);
    expect(h.screen.queryByTestId('person-status-ACTIVE')).toBeNull();
  });

  it('öğretmen sorumluluğu: gerekçe zorunlu; sunucu ret mesajı olduğu gibi gösterilir', async () => {
    const teacher = person({
      id: 'u-t',
      name: 'Ali Hoca',
      role: 'TEACHER',
      roleLabel: 'Öğretmen',
      productAccess: { editable: false, active: ['OD', 'OK', 'ODK'], options: [] },
      staff: { history: [], options: [{ product: 'OD', role: 'TEACHER', label: 'onlinedershanem. · Ders öğretmeni' }, { product: 'OK', role: 'COACH', label: 'Yön Koçluk · Yön koçu' }], coachCapacity: null, mfaPending: false },
    });
    const h = await openPeople({
      'GET /api/panel/admin/people': () => jsonResponse(200, directory()),
      'GET /api/panel/admin/people/u-t': () => jsonResponse(200, teacher),
      'POST /api/panel/users/u-t/staff-roles': () => jsonResponse(409, { error: 'Bu sorumluluk zaten aktif.' }),
    });
    await go('/admin/person/u-t');
    await press(h, await h.screen.findByTestId('chip-sorumluluklar', {}, WAIT));
    await press(h, await h.screen.findByTestId('person-staff-option-OK-COACH', {}, WAIT));
    expect(h.screen.getByTestId('person-staff-grant').props.accessibilityState?.disabled).toBe(true);
    fireEvent.changeText(h.screen.getByTestId('person-staff-reason'), 'Yön koçluğu başlıyor');
    await press(h, h.screen.getByTestId('person-staff-grant'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/users/u-t/staff-roles')[0]?.body).toEqual({ product: 'OK', role: 'COACH', reason: 'Yön koçluğu başlıyor' }), WAIT);
    expect(await h.screen.findByText(/Bu sorumluluk zaten aktif\. Görünüm yenilendi/, {}, WAIT)).toBeTruthy();
  });

  it('kişi detayı ekleri: kayıt bilgisi, akademik düzenleme (sürümle), arşiv etkisi ön izlemesi ve kalıcı silme', async () => {
    const h = await openPeople({
      'GET /api/panel/admin/people': () => jsonResponse(200, directory()),
      'GET /api/panel/admin/people/u-ece': () =>
        jsonResponse(200, person({ accessibility: { version: 3, assessmentExtraPercent: 0, breaksAllowed: false, options: [0, 25, 50, 100] }, signup: { rows: [{ label: 'Nereden duydu', value: 'Instagram' }], note: 'Hafta sonu aransın', pendingChildren: [], formFields: [] } })),
      'GET /api/panel/admin/people/u-arc': () => jsonResponse(200, person({ id: 'u-arc', name: 'Arşiv Kişi', status: 'ARCHIVED', statusLabel: 'Arşivde', statusTone: 'neutral' })),
      'PATCH /api/panel/users/u-ece/accessibility': () => jsonResponse(200, { ok: true }),
      'GET /api/panel/users/u-ece/archive-impact': () => jsonResponse(200, { canHardDelete: false, recommendArchive: true, buckets: [{ key: 'attempts', label: 'Deneme girişi', count: 4, severity: 'warning' }], message: 'Geçmiş korunur.' }),
      'POST /api/panel/users/u-ece/status': () => jsonResponse(200, { status: 'ARCHIVED' }),
      'GET /api/panel/users/u-arc': () => jsonResponse(200, { canDelete: true, blockers: [], suggestedAction: 'DELETE' }),
      'DELETE /api/panel/users/u-arc': () => jsonResponse(200, { ok: true }),
    });
    await press(h, await h.screen.findByTestId('admin-person-u-ece', {}, WAIT));
    expect(await h.screen.findByText('Instagram', { exact: false }, WAIT)).toBeTruthy();
    await press(h, await h.screen.findByTestId('chip-25', {}, WAIT));
    await press(h, h.screen.getByTestId('person-accessibility-save'));
    await waitFor(() => expect(h.server.called('PATCH', '/api/panel/users/u-ece/accessibility')[0]?.body).toEqual({ expectedVersion: 3, assessmentExtraPercent: 25, breaksAllowed: false }), WAIT);

    await press(h, h.screen.getByTestId('chip-guvenlik'));
    await press(h, await h.screen.findByTestId('person-archive-preview', {}, WAIT));
    expect(await h.screen.findByText(/Deneme girişi/, {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/users/u-ece/status')).toHaveLength(0);
    await press(h, h.screen.getByTestId('person-archive-confirm'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/users/u-ece/status')[0]?.body).toEqual({ status: 'ARCHIVED' }), WAIT);

    await go('/admin/person/u-arc');
    await press(h, await h.screen.findByTestId('chip-guvenlik', {}, WAIT));
    await press(h, await h.screen.findByTestId('person-delete-preview', {}, WAIT));
    await press(h, await h.screen.findByTestId('person-delete-confirm', {}, WAIT));
    await waitFor(() => expect(h.server.called('DELETE', '/api/panel/users/u-arc')).toHaveLength(1), WAIT);
  });
});
