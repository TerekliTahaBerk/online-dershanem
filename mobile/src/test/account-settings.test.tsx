import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { mapAdminWebPath, mapNotificationHref, sanitizeIncomingPath } from '@/navigation/route-map';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
import { makeOdHome } from './od-fixtures';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

const opt = (...values: string[]) => values.map((value) => ({ value, label: `L-${value}` }));
const REV = 'a'.repeat(64);
const settings = (role: 'STUDENT' | 'PARENT', overrides: Record<string, unknown> = {}) => ({
  contractVersion: 1,
  revision: REV,
  role,
  sections: role === 'STUDENT'
    ? [{ key: 'profil', label: 'Profil' }, { key: 'egitim', label: 'Eğitim bilgileri' }, { key: 'iletisim', label: 'İletişim tercihleri' }, { key: 'fatura', label: 'Fatura bilgileri' }, { key: 'onaylar', label: 'Onaylar' }, { key: 'guvenlik', label: 'Güvenlik' }]
    : [{ key: 'profil', label: 'Profil' }, { key: 'cocuklarim', label: 'Çocuklarım' }, { key: 'iletisim', label: 'İletişim tercihleri' }, { key: 'guvenlik', label: 'Güvenlik' }],
  completion: { percent: 60, complete: false, contactFormSubmitted: true, contactFormApplicable: false, requirements: [{ key: 'fullName', label: 'Ad soyad', done: true, section: 'profil' }, { key: 'kvkk', label: 'KVKK onayı', done: false, section: 'onaylar' }] },
  memberships: [{ product: 'OD', label: 'onlinedershanem.', expiresAt: null }],
  profile: { fullName: 'Ece Kaya', email: 'ece@example.com', phone: '+905321112233', birthDate: null, relationship: null, city: 'İzmir', district: null },
  education: role === 'STUDENT' ? { classLevel: '12', examType: 'TYT', fieldTrack: null, schoolName: null, schoolType: null, targetRank: null, weeklyStudyHours: null, weakSubjects: [], guardianName: null, guardianPhone: null, guardianEmail: null } : null,
  contact: { preferredChannel: 'PHONE', preferredContactTime: 'ANY', note: null },
  billing: role === 'STUDENT' ? { billingAddress: null } : null,
  consents: role === 'STUDENT' ? { kvkkAcceptedAt: null, kvkkVersion: null, marketingConsent: false } : null,
  children: role === 'PARENT' ? { linked: [{ name: 'Can Kaya', classLevel: '8', examType: 'LGS' }], pending: [{ id: 'pc1', fullName: 'Deniz Kaya', classLevel: '5', examType: 'LGS', paid: false }, { id: 'pc2', fullName: 'Ada Kaya', classLevel: '6', examType: 'LGS', paid: true }] } : null,
  options: { classLevels: opt('5', '6', '8', '12'), examTypes: opt('LGS', 'TYT', 'AYT'), fieldTracks: opt('SAY', 'EA'), schoolTypes: opt('ANADOLU'), subjects: opt('MAT', 'FIZ'), relationships: opt('ANNE', 'BABA'), contactChannels: opt('PHONE', 'WHATSAPP'), contactTimes: opt('ANY', 'EVENING'), fieldTrackExams: ['AYT'] },
  preferences: { accessibility: { version: 2, reducedMotion: false, highContrast: false, textScale: 'DEFAULT', comfortableSpacing: false, captionsPreferred: false, transcriptPreferred: false }, network: null },
  ...overrides,
});

async function student(routes: Record<string, (request: { body: unknown }) => Response>) {
  const h = await boot([account('student@example.com', makeBootstrap({ role: 'STUDENT', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: { 'GET /api/panel/student/home': () => jsonResponse(200, makeOdHome()), ...routes } })]);
  await signIn(h, 'student@example.com');
  return h;
}

async function parent(routes: Record<string, (request: { body: unknown }) => Response>) {
  const h = await boot([account('parent@example.com', makeBootstrap({ role: 'PARENT', products: { OD: 'ACTIVE' }, activeProduct: 'OD', extraNav: [['account', 'Hesap', '/panel/veli/hesap']] }), { routes: {
    'GET /api/panel/parent/children': () => jsonResponse(200, { contractVersion: 1, children: [{ studentId: 'child-1', name: 'Can Kaya', products: ['OD'] }] }),
    ...routes,
  } })]);
  await signIn(h, 'parent@example.com');
  return h;
}

describe('P5.2 Hesap ayarları', () => {
  it('hesap merkezinden ayarlara girilir; eksik gereksinim bölüme götürür; profil revizyon ve işlem anahtarıyla kaydedilir', async () => {
    const h = await student({
      'GET /api/panel/me/settings': () => jsonResponse(200, settings('STUDENT')),
      'POST /api/panel/me/settings': () => jsonResponse(200, { ok: true, message: 'Profil bilgilerin kaydedildi.', replayed: false }),
    });
    await go('/account');
    await press(h, await h.screen.findByTestId('account-settings-entry', {}, WAIT));
    expect(await h.screen.findByText('Profil tamamlama · %60', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('onlinedershanem.')).toBeTruthy();
    expect(h.screen.getByTestId('settings-accessibility')).toBeTruthy();
    expect(h.screen.queryByTestId('settings-data-usage')).toBeNull();
    await press(h, h.screen.getByTestId('requirement-kvkk'));
    expect(await h.screen.findByTestId('consent-kvkk', {}, WAIT)).toBeTruthy();

    await go('/account/settings/profil');
    fireEvent.changeText(await h.screen.findByTestId('settings-fullName', {}, WAIT), 'Ece Yılmaz');
    fireEvent.changeText(h.screen.getByTestId('settings-birthDate'), '2008-05-21');
    await press(h, h.screen.getByTestId('settings-save-profile'));
    expect(await h.screen.findByText('Profil bilgilerin kaydedildi.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/me/settings')[0].body).toEqual({
      command: { type: 'profile', fullName: 'Ece Yılmaz', phone: '+905321112233', city: 'İzmir', district: null, birthDate: '2008-05-21' },
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      expectedRevision: REV,
    });
    await waitFor(() => expect(h.server.called('GET', '/api/panel/me/settings').length).toBeGreaterThan(1), WAIT);
  }, 30000);

  it('eğitim bölümü: AYT seçilince alan açılır, ders seçimi gönderilir; 409 görünümü yeniler ve uyarı gösterir', async () => {
    const h = await student({
      'GET /api/panel/me/settings': () => jsonResponse(200, settings('STUDENT')),
      'POST /api/panel/me/settings': () => jsonResponse(409, { error: 'Ayarların başka bir oturumda değişti.', code: 'STALE_REVISION' }),
    });
    await go('/account/settings/egitim');
    await press(h, await h.screen.findByTestId('chip-AYT', {}, WAIT));
    await press(h, await h.screen.findByTestId('chip-SAY', {}, WAIT));
    await press(h, h.screen.getByTestId('subject-MAT'));
    await press(h, h.screen.getByTestId('settings-save-education'));
    expect(await h.screen.findByText(/başka bir oturumda değişti\. Güncel bilgiler yüklendi/, {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/me/settings')[0].body).toMatchObject({ command: { type: 'education', classLevel: '12', examType: 'AYT', fieldTrack: 'SAY', weakSubjects: ['MAT'] }, expectedRevision: REV });
    await waitFor(() => expect(h.server.called('GET', '/api/panel/me/settings').length).toBeGreaterThan(1), WAIT);
  });

  it('rolün görmediği bölüm istek atmadan kapalıdır', async () => {
    const h = await student({ 'GET /api/panel/me/settings': () => jsonResponse(200, settings('STUDENT')) });
    await go('/account/settings/cocuklarim');
    expect(await h.screen.findByText('Bu bölüm hesabın için açık değil', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/me/settings')).toHaveLength(0);
  });

  it('veli çocuk ekler (revizyonsuz, işlem anahtarlı) ve ödemesi alınmamış bekleyen kaydı onayla kaldırır', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    const h = await parent({
      'GET /api/panel/me/settings': () => jsonResponse(200, settings('PARENT')),
      'POST /api/panel/me/settings': ({ body }) => jsonResponse(200, { ok: true, message: (body as { command: { type: string } }).command.type === 'addChild' ? 'Mert eklendi.' : 'Kayıt kaldırıldı.', replayed: false }),
    });
    await go('/account/settings/cocuklarim');
    expect(await h.screen.findByText('Can Kaya', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByTestId('child-cancel-pc2')).toBeNull();
    fireEvent.changeText(h.screen.getByTestId('child-fullName'), 'Mert Kaya');
    await press(h, h.screen.getByTestId('chip-6'));
    await press(h, h.screen.getByTestId('chip-LGS'));
    await press(h, h.screen.getByTestId('child-add'));
    expect(await h.screen.findByText('Mert eklendi.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/me/settings')[0].body).toEqual({ command: { type: 'addChild', fullName: 'Mert Kaya', classLevel: '6', examType: 'LGS', fieldTrack: null, schoolName: null }, idempotencyKey: expect.any(String) });
    await press(h, h.screen.getByTestId('child-cancel-pc1'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/me/settings')[1]?.body).toEqual({ command: { type: 'cancelChild', childId: 'pc1' }, idempotencyKey: expect.any(String) }), WAIT);
  });

  it('erişilebilirlik tercihleri okunan sürümle PATCH edilir; düşük veri bayrak kapalıyken kapalıdır', async () => {
    const h = await student({
      'GET /api/panel/me/settings': () => jsonResponse(200, settings('STUDENT')),
      'PATCH /api/panel/accessibility/preferences': () => jsonResponse(200, { saved: true, version: 3 }),
    });
    await go('/account/accessibility');
    await h.screen.findByTestId('a11y-reducedMotion', {}, WAIT);
    fireEvent(h.screen.getByTestId('a11y-reducedMotion'), 'valueChange', true);
    fireEvent(h.screen.getByTestId('a11y-textScale'), 'valueChange', true);
    await press(h, h.screen.getByTestId('a11y-save'));
    expect(await h.screen.findByText('Tercihlerin kaydedildi.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('PATCH', '/api/panel/accessibility/preferences')[0].body).toEqual({ expectedVersion: 2, reducedMotion: true, highContrast: false, textScale: 'LARGE', comfortableSpacing: false, captionsPreferred: false, transcriptPreferred: false });
    await go('/account/data-usage');
    expect(await h.screen.findByText('Düşük veri modu henüz açık değil', {}, WAIT)).toBeTruthy();
  });

  it('düşük veri tercihi kaydedilir; sürüm çakışması uyarı verir', async () => {
    const h = await student({
      'GET /api/panel/me/settings': () => jsonResponse(200, settings('STUDENT', { preferences: { accessibility: null, network: { version: 0, lowDataMode: false, offlineWritesEnabled: false } } })),
      'PATCH /api/panel/network/preferences': () => jsonResponse(409, { error: 'Tercihler başka bir sekmede değişti.', code: 'VERSION_CONFLICT' }),
    });
    await go('/account/data-usage');
    fireEvent(await h.screen.findByTestId('network-lowDataMode', {}, WAIT), 'valueChange', true);
    await press(h, h.screen.getByTestId('network-save'));
    expect(await h.screen.findByText(/Güncel tercihler yüklendi/, {}, WAIT)).toBeTruthy();
    expect(h.server.called('PATCH', '/api/panel/network/preferences')[0].body).toEqual({ expectedVersion: 0, lowDataMode: true, offlineWritesEnabled: false });
  });
});

describe('V10 Veli paket görüşmesi', () => {
  it('veli hesap ekranından seçili çocuk için onaylı talep gönderir', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    const h = await parent({
      'GET /api/panel/parent/account': () => jsonResponse(200, { contractVersion: 1, parent: { fullName: 'Ayşe Kaya', email: 'parent@example.com', hasPhone: true }, children: [{ studentId: 'child-1', name: 'Can Kaya', products: [{ code: 'OD', label: 'onlinedershanem.' }], academicAccess: true }] }),
      'POST /api/panel/parent/account/package-meeting': () => jsonResponse(200, { ok: true, message: 'Görüşme talebiniz alındı. Ekibimiz sizinle iletişime geçecek.', replayed: false }),
    });
    await go('/screen/account');
    await press(h, await h.screen.findByTestId('package-meeting-child-1', {}, WAIT));
    expect(await h.screen.findByText('Görüşme talebiniz alındı. Ekibimiz sizinle iletişime geçecek.', {}, WAIT)).toBeTruthy();
    expect(h.server.called('POST', '/api/panel/parent/account/package-meeting')[0].body).toEqual({ studentId: 'child-1', idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(h.screen.getByTestId('parent-settings')).toBeTruthy();
  });
});

describe('Ayar yolları', () => {
  it('web ayar yolları native hesap ekranlarına eşlenir; derin bağlantı izinlidir', () => {
    expect(mapNotificationHref('/panel/ayarlar/iletisim', null)).toEqual({ kind: 'detail', href: '/account/settings/iletisim' });
    expect(mapNotificationHref('/panel/ayarlar', null)).toEqual({ kind: 'detail', href: '/account/settings' });
    expect(mapNotificationHref('/panel/erisilebilirlik', null)).toEqual({ kind: 'detail', href: '/account/accessibility' });
    expect(mapAdminWebPath('/panel/veri-kullanimi', null)).toEqual({ kind: 'detail', href: '/account/data-usage' });
    expect(mapNotificationHref('/panel/ayarlar/bilinmeyen', null)).toEqual({ kind: 'none' });
    expect(sanitizeIncomingPath('onlinedershanem://account/settings/onaylar')).toBe('/account/settings/onaylar');
    expect(sanitizeIncomingPath('onlinedershanem://account/settings/x')).toBe('/');
  });
});
