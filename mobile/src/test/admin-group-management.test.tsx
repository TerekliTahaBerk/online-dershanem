import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

const revision = 'a'.repeat(64);
const targetRevision = 'b'.repeat(64);
const ok = { ok: true, id: 'g1', revision: 'c'.repeat(64), replayed: false };
const center = { contractVersion: 1, generatedAt: '2026-10-11T08:00:00Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] };
const group = (tab = 'genel') => ({ contractVersion: 1, id: 'g1', name: '8-A', subject: 'Matematik', level: '8', teacherName: 'Ada', teacherId: 't1', active: true, filled: 1, capacity: 4, weeklyLessonCount: 2, status: 'İyi', reasons: [], revision, tab, teachers: [{ id: 't1', name: 'Ada' }, { id: 't2', name: 'Mert' }], targetGroups: [{ id: 'g2', name: 'Hedef', subject: 'Fen', filled: 1, capacity: 4 }], sections: tab === 'ogrenciler' ? [{ id: 'members', title: 'Öğrenciler', rows: [{ id: 's1', title: 'Ece', detail: 'Katılım %75', at: null, studentId: 's1', groupId: null }] }] : [] });
const transferPreview = { mode: 'PREVIEW', action: 'TRANSFER', expectedRevision: revision, expectedTargetRevision: targetRevision, preview: { targetGroupName: 'Hedef', canExecute: true, capacity: { active: 1, capacity: 4, available: 3 }, items: [{ studentId: 's1', studentName: 'Ece', blockers: [], warnings: [], affectedSourceLessons: [], affectedTargetLessons: [] }] } };

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

async function openGroup(tab: string, routes: NonNullable<FakeAccount['routes']> = {}) {
  const h = await boot([account('admin@example.com', makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD' }), { routes: {
    'GET /api/panel/admin/operations-center': () => jsonResponse(200, center),
    'GET /api/panel/admin/groups/g1': ({ query }) => jsonResponse(200, group(query.get('sekme') ?? 'genel')),
    ...routes,
  } })]);
  await signIn(h, 'admin@example.com');
  await go('/admin/group/g1');
  await press(h, await h.screen.findByTestId(`chip-${tab}`, {}, WAIT));
  return h;
}

it('grup oluşturma: öğretmen seçimi, 428 doğrulaması ve aynı anahtarla tekrar', async () => {
  let attempts = 0;
  const h = await openGroup('genel', {
    'GET /api/panel/admin/education': () => jsonResponse(200, { contractVersion: 1, groups: [], sections: [], teachers: [{ id: 't1', name: 'Ada' }] }),
    'POST /api/panel/groups': () => ++attempts === 1 ? jsonResponse(428, { code: 'STEP_UP_REQUIRED', error: 'Doğrulayın.' }) : jsonResponse(200, ok),
    'POST /api/auth/mfa/code/verify': () => jsonResponse(200, { verified: true, stepUpExpiresAt: '2026-10-11T20:00:00Z' }),
  });
  await go('/admin/group-create');
  fireEvent.changeText(await h.screen.findByTestId('group-name', {}, WAIT), '9-B');
  fireEvent.changeText(h.screen.getByTestId('group-subject'), 'Fen');
  fireEvent.changeText(h.screen.getByTestId('group-teacher-search'), 'Ada');
  await press(h, h.screen.getByTestId('group-teacher-t1'));
  await press(h, h.screen.getByTestId('group-create-save'));
  fireEvent.changeText(await h.screen.findByTestId('step-up-code', {}, WAIT), '123456');
  await press(h, h.screen.getByTestId('step-up-submit'));
  await waitFor(() => expect(h.server.called('POST', '/api/panel/groups')).toHaveLength(2), WAIT);
  const [first, second] = h.server.called('POST', '/api/panel/groups');
  expect(first.body).toEqual(second.body);
  expect(first.body).toMatchObject({ name: '9-B', subject: 'Fen', teacherId: 't1', studentIds: [], idempotencyKey: expect.any(String) });
  expect(await h.screen.findByTestId('admin-group-detail', {}, WAIT)).toBeTruthy();
});

it('grup düzenleme: eski sürüm 409 olursa veri yenilenir ve sessiz tekrar yapılmaz', async () => {
  let stale = false;
  const h = await openGroup('operasyon', {
    'GET /api/panel/admin/groups/g1': ({ query }) => jsonResponse(200, { ...group(query.get('sekme') ?? 'genel'), ...(stale ? { revision: targetRevision, name: 'Güncel grup' } : {}) }),
    'PATCH /api/panel/groups/g1': () => { stale = true; return jsonResponse(409, { code: 'GROUP_CONFLICT', error: 'Grup değişti.' }); },
  });
  fireEvent.changeText(await h.screen.findByTestId('group-edit-name', {}, WAIT), 'Eski form');
  await press(h, h.screen.getByTestId('group-edit-save'));
  expect(await h.screen.findByText(/Grup değişti.*Görünüm yenilendi/, {}, WAIT)).toBeTruthy();
  await waitFor(() => expect(h.screen.getByTestId('group-edit-name').props.value).toBe('Güncel grup'), WAIT);
  expect(h.server.called('PATCH', '/api/panel/groups/g1')).toHaveLength(1);
  expect(h.server.called('PATCH', '/api/panel/groups/g1')[0].body).toMatchObject({ action: 'UPDATE_META', name: 'Eski form', expectedRevision: revision, idempotencyKey: expect.any(String) });
});

it('öğrenci arama ve ekleme grup sürümüyle gider', async () => {
  const h = await openGroup('ogrenciler', {
    'GET /api/panel/groups/g1/students': () => jsonResponse(200, { seats: { capacity: 4, active: 1, available: 3, isActive: true }, students: [{ id: 's2', name: 'Can', email: 'can@example.com', activeGroups: [] }] }),
    'PATCH /api/panel/groups/g1': () => jsonResponse(200, ok),
  });
  fireEvent.changeText(await h.screen.findByTestId('group-candidate-search', {}, WAIT), 'Can');
  await press(h, await h.screen.findByTestId('group-candidate-s2', {}, WAIT));
  await press(h, h.screen.getByTestId('group-add-save'));
  expect(await h.screen.findByText('Öğrenci gruba eklendi.', {}, WAIT)).toBeTruthy();
  expect(h.server.called('PATCH', '/api/panel/groups/g1')[0].body).toMatchObject({ action: 'ADD_STUDENT', studentId: 's2', expectedRevision: revision });
});

it('transfer önizlemesi kaynak/hedef sürümleriyle onaylanır; yazma önizleme gelmeden başlamaz', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
  const h = await openGroup('ogrenciler', {
    'POST /api/panel/groups/g1/members': ({ body }) => jsonResponse(200, (body as { mode: string }).mode === 'PREVIEW' ? transferPreview : ok),
  });
  await press(h, await h.screen.findByTestId('group-select-s1', {}, WAIT));
  fireEvent.changeText(h.screen.getByTestId('group-target-search'), 'Hedef');
  await press(h, h.screen.getByTestId('group-target-g2'));
  expect(h.screen.queryByTestId('group-members-execute')).toBeNull();
  await press(h, h.screen.getByTestId('group-members-preview'));
  await press(h, await h.screen.findByTestId('group-members-execute', {}, WAIT));
  expect(await h.screen.findByText('Üye işlemi tamamlandı.', {}, WAIT)).toBeTruthy();
  const [preview, execute] = h.server.called('POST', '/api/panel/groups/g1/members');
  expect(preview.body).toEqual({ action: 'TRANSFER', mode: 'PREVIEW', studentIds: ['s1'], targetGroupId: 'g2' });
  expect(execute.body).toMatchObject({ action: 'TRANSFER', mode: 'EXECUTE', studentIds: ['s1'], targetGroupId: 'g2', expectedRevision: revision, expectedTargetRevision: targetRevision, idempotencyKey: expect.any(String) });
});

it('engelli çıkarma önizlemesi execute açmaz; seçim değişikliği eski önizlemeyi kaldırır', async () => {
  const h = await openGroup('ogrenciler', {
    'POST /api/panel/groups/g1/members': () => jsonResponse(200, { mode: 'PREVIEW', action: 'REMOVE', expectedRevision: revision, canExecute: false, matched: 1, items: [{ studentId: 's1', studentName: 'Ece', blockers: [{ code: 'SOURCE_INACTIVE', message: 'Grup kapalı.' }] }] }),
  });
  await press(h, await h.screen.findByTestId('group-select-s1', {}, WAIT));
  await press(h, h.screen.getByTestId('chip-REMOVE'));
  await press(h, h.screen.getByTestId('group-members-preview'));
  const confirm = await h.screen.findByTestId('group-members-execute', {}, WAIT);
  expect(confirm.props.accessibilityState.disabled).toBe(true);
  expect(h.screen.getByText('Grup kapalı.')).toBeTruthy();
  await press(h, h.screen.getByTestId('group-select-s1'));
  expect(h.screen.queryByTestId('group-members-execute')).toBeNull();
  expect(h.server.called('POST', '/api/panel/groups/g1/members')).toHaveLength(1);
});

it('bildirim metni değişince yeniden önizleme gerekir', async () => {
  const h = await openGroup('ogrenciler', {
    'POST /api/panel/groups/g1/members': () => jsonResponse(200, { mode: 'PREVIEW', action: 'NOTIFY', expectedRevision: revision, canExecute: true, matchedStudents: 1, recipientCount: 2, title: 'Duyuru', body: 'Ders saati değişti.', sample: [{ studentId: 's1', name: 'Ece' }] }),
  });
  await press(h, await h.screen.findByTestId('group-select-s1', {}, WAIT));
  await press(h, h.screen.getByTestId('chip-NOTIFY'));
  fireEvent.changeText(h.screen.getByTestId('group-notify-title'), 'Duyuru');
  fireEvent.changeText(h.screen.getByTestId('group-notify-body'), 'Ders saati değişti.');
  await press(h, h.screen.getByTestId('group-members-preview'));
  expect(await h.screen.findByTestId('group-members-execute', {}, WAIT)).toBeTruthy();
  fireEvent.changeText(h.screen.getByTestId('group-notify-body'), 'Başka bir duyuru.');
  expect(h.screen.queryByTestId('group-members-execute')).toBeNull();
  expect(h.server.called('POST', '/api/panel/groups/g1/members')).toHaveLength(1);
});

it.each(['REMOVE', 'NOTIFY'] as const)('%s işlemi onaydan sonra yalnız kaynak sürümüyle yazılır', async (action) => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
  const h = await openGroup('ogrenciler', {
    'POST /api/panel/groups/g1/members': ({ body }) => jsonResponse(200, (body as { mode: string }).mode === 'EXECUTE' ? ok : action === 'REMOVE'
      ? { mode: 'PREVIEW', action, expectedRevision: revision, canExecute: true, matched: 1, items: [{ studentId: 's1', studentName: 'Ece', blockers: [] }] }
      : { mode: 'PREVIEW', action, expectedRevision: revision, canExecute: true, matchedStudents: 1, recipientCount: 1, title: 'Duyuru', body: 'Yeni duyuru.', sample: [] }),
  });
  await press(h, await h.screen.findByTestId('group-select-s1', {}, WAIT));
  await press(h, h.screen.getByTestId(`chip-${action}`));
  if (action === 'NOTIFY') {
    fireEvent.changeText(h.screen.getByTestId('group-notify-title'), 'Duyuru');
    fireEvent.changeText(h.screen.getByTestId('group-notify-body'), 'Yeni duyuru.');
  }
  await press(h, h.screen.getByTestId('group-members-preview'));
  await press(h, await h.screen.findByTestId('group-members-execute', {}, WAIT));
  expect(await h.screen.findByText('Üye işlemi tamamlandı.', {}, WAIT)).toBeTruthy();
  const written = h.server.called('POST', '/api/panel/groups/g1/members')[1].body;
  expect(written).toMatchObject({ action, mode: 'EXECUTE', studentIds: ['s1'], expectedRevision: revision, idempotencyKey: expect.any(String) });
  expect(written).not.toHaveProperty('expectedTargetRevision');
});

it('öğretmen ve grup durumu değişiklikleri onayla ve güncel sürümle gider', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
  const h = await openGroup('operasyon', { 'PATCH /api/panel/groups/g1': () => jsonResponse(200, ok) });
  await press(h, await h.screen.findByTestId('group-change-teacher-chosen', {}, WAIT));
  fireEvent.changeText(h.screen.getByTestId('group-change-teacher-search'), 'Mert');
  await press(h, h.screen.getByTestId('group-change-teacher-t2'));
  await press(h, h.screen.getByTestId('group-teacher-save'));
  expect(await h.screen.findByText('Grubun öğretmeni güncellendi.', {}, WAIT)).toBeTruthy();
  await press(h, h.screen.getByTestId('group-status-save'));
  expect(await h.screen.findByText('Grup kapatıldı.', {}, WAIT)).toBeTruthy();
  expect(h.server.called('PATCH', '/api/panel/groups/g1').map((call) => call.body)).toEqual([
    expect.objectContaining({ action: 'CHANGE_TEACHER', teacherId: 't2', expectedRevision: revision }),
    expect.objectContaining({ action: 'SET_ACTIVE', isActive: false, expectedRevision: revision }),
  ]);
});
