import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';

beforeEach(() => secureStore.__store.clear());
afterEach(() => jest.restoreAllMocks());

const card = (id: string, title: string, rows: Record<string, unknown>[] = [], extra: Record<string, unknown> = {}) => ({ id, title, note: null, metrics: [], rows: rows.map((row) => ({ id: null, subtitle: null, meta: null, badge: null, target: null, ...row })), empty: rows.length ? null : 'Kayıt yok.', ...extra });
const opt = (...values: string[]) => values.map((value) => ({ value, label: value }));
const options = { stages: [{ value: 'NEW', label: 'Yeni' }, { value: 'QUALIFIED', label: 'Nitelikli' }, { value: 'LOST', label: 'Kaybedildi' }], lostReasons: [{ value: 'PRICE', label: 'Fiyat' }], priorities: [{ value: 'NORMAL', label: 'Normal' }, { value: 'HIGH', label: 'Yüksek' }], aiModes: opt('OFF', 'SUGGESTION'), statuses: opt('OPEN', 'WAITING_HUMAN'), productInterests: [{ value: 'ONLINE_DERSHANEM', label: 'onlinedershanem.' }, { value: 'UNKNOWN', label: 'Ürün bilinmiyor' }], units: [{ value: 'u1', label: 'OD İşletme' }] };
const section = (slug: string, overrides: Record<string, unknown> = {}) => ({ contractVersion: 1, slug, label: slug, units: 'OD İşletme', range: null, product: null, filters: [], notice: null, cards: [], nextCursor: null, conversation: null, lead: null, can: { conversationRead: true, conversationReply: true, leadWrite: true }, options, ...overrides });

const inbox = section('mesaj-kutusu', {
  label: 'Mesaj Kutusu',
  filters: [{ key: 'unread', label: 'Okunma', value: 'ALL', options: [{ value: 'ALL', label: 'Tümü' }, { value: '1', label: 'Yalnız okunmamış' }] }],
  cards: [card('conversations', 'Konuşmalar', [{ id: 'c1', title: 'Ayşe K.', subtitle: 'Fiyat nedir?', badge: { label: '2', tone: 'warning' }, target: { kind: 'conversation', id: 'c1' } }], { note: 'Filtreye uyan toplam 1 konuşma · 1 tanesi gösteriliyor' })],
  nextCursor: 'c1',
});
const thread = section('mesaj-kutusu', {
  conversation: { id: 'c1', name: 'Ayşe K.', summary: 'HOT · ONLINE_DERSHANEM · Özet bekleniyor', tags: ['sıcak'], status: 'OPEN', aiMode: 'SUGGESTION', temperature: 'HOT', assignedUserId: null, olderCursor: 'm0', messages: [{ id: 'm1', body: 'Fiyat nedir?', outbound: false, meta: 'CUSTOMER · RECEIVED · 12.10.2026 10:00' }], aiSuggestion: 'Merhaba, paketlerimiz…', leadId: 'l1', cards: [card('lead-tasks', 'Görevler', [{ title: 'Geri ara', badge: { label: 'Açık', tone: 'info' } }])], revision: '2026-10-12T09:00:00.000Z', staff: [{ value: '', label: 'Atanmamış' }, { value: 'cstaff00000000000000000001', label: 'Mert · SALES' }] },
});
const lead = section('adaylar', {
  lead: { id: 'l1', name: 'Ayşe K.', stage: 'QUALIFIED', stageLabel: 'Nitelikli', subtitle: 'Instagram organik · onlinedershanem. · Normal', lifecycle: { label: 'Satış dönüşümü bekleniyor', nextAction: 'Adayı satış aşamasına ilerlet' }, followUp: { label: 'Takip gecikti: 11.10.2026 10:00', tone: 'critical' }, cards: [card('lead-info', 'Bilgiler', [{ title: 'Telefon', meta: '+905551112233' }])], revision: '2026-10-12T08:00:00.000Z', assignedUserId: null, priority: 'NORMAL', owners: [{ value: '', label: 'Atanmamış' }, { value: 'cowner00000000000000000001', label: 'Mert' }], tasks: [{ id: 'ctask000000000000000000001', title: 'Geri ara', dueAt: null, done: false }], duplicates: [{ value: 'cdup0000000000000000000001', label: 'Ayşe Kaya · Yeni' }], suggestionLeadId: 'cdup0000000000000000000001' },
});

async function open(business: string[], routes: NonNullable<FakeAccount['routes']> = {}, role: 'ADMIN' | 'TEACHER' = 'TEACHER') {
  const bootstrap = makeBootstrap({ role, products: { OD: 'ACTIVE' }, activeProduct: 'OD', business });
  const h = await boot([account('staff@example.com', bootstrap, { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, { contractVersion: 1, generatedAt: '2026-10-12T08:00:00.000Z', partialData: false, group: 'tumu', groups: [], openActionCount: 0, blockingCount: 0, actions: [], summary: [], risk: { critical: 0, watch: 0, normal: 0, total: 0 }, health: [], activities: [] }), ...routes } })]);
  await signIn(h, 'staff@example.com');
  return h;
}

describe('P2.7a İşletme (okuma)', () => {
  it('iş birimi rolü olan öğretmen menüden İşletme alanına girer; bölümler gruplanır', async () => {
    const h = await open(['genel-bakis', 'mesaj-kutusu', 'adaylar'], { 'GET /api/panel/business/sections/mesaj-kutusu': () => jsonResponse(200, inbox) });
    await press(h, await h.screen.findByTestId('nav-menu', {}, WAIT));
    await press(h, await h.screen.findByTestId('menu-business', {}, WAIT));
    expect(await h.screen.findByText('CRM', {}, WAIT)).toBeTruthy();
    await press(h, h.screen.getByTestId('business-section-mesaj-kutusu'));
    expect(await h.screen.findByText('Filtreye uyan toplam 1 konuşma · 1 tanesi gösteriliyor', {}, WAIT)).toBeTruthy();
    await press(h, h.screen.getByTestId('chip-1'));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/business/sections/mesaj-kutusu').some((call) => call.path.includes('unread=1'))).toBe(true), WAIT);
    fireEvent.changeText(h.screen.getByTestId('business-search'), 'ayşe');
    await waitFor(() => expect(h.server.called('GET', '/api/panel/business/sections/mesaj-kutusu').some((call) => call.path.includes('q=ay%C5%9Fe') && call.path.includes('unread=1'))).toBe(true), WAIT);
    await press(h, await h.screen.findByTestId('business-next', {}, WAIT));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/business/sections/mesaj-kutusu').some((call) => call.path.includes('cursor=c1'))).toBe(true), WAIT);
  });

  it('konuşma detayı web parametresiyle yüklenir; daha eski mesajlar sayfalanır; aday detayına geçilir', async () => {
    const h = await open(['mesaj-kutusu', 'adaylar'], {
      'GET /api/panel/business/sections/mesaj-kutusu': () => jsonResponse(200, thread),
      'GET /api/panel/business/sections/adaylar': () => jsonResponse(200, lead),
    });
    await go('/business/conversation/c1');
    expect(await h.screen.findByText('Fiyat nedir?', {}, WAIT)).toBeTruthy();
    expect(h.screen.getByText('Merhaba, paketlerimiz…')).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/business/sections/mesaj-kutusu')[0].path).toContain('conversation=c1');
    await press(h, h.screen.getByTestId('business-older'));
    await waitFor(() => expect(h.server.called('GET', '/api/panel/business/sections/mesaj-kutusu').some((call) => call.path.includes('messageCursor=m0'))).toBe(true), WAIT);
    await press(h, await h.screen.findByTestId('business-open-lead', {}, WAIT));
    expect(await h.screen.findByText('Takip gecikti: 11.10.2026 10:00', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/business/sections/adaylar').at(-1)?.path).toContain('lead=l1');
  });

  it('İşletme ataması yoksa menüde görünmez; derin bağlantı istek atmadan kapalıdır', async () => {
    const h = await open([], {}, 'ADMIN');
    await press(h, await h.screen.findByTestId('nav-menu', {}, WAIT));
    expect(await h.screen.findByTestId('menu-account', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByTestId('menu-business')).toBeNull();
    await go('/business/adaylar');
    expect(await h.screen.findByText('Bu bölüm hesabında yok', {}, WAIT)).toBeTruthy();
    expect(h.server.called('GET', '/api/panel/business/sections/adaylar')).toHaveLength(0);
  });

  it('görünmeyen bölüme derin bağlantı kapalıdır; sunucu 404 hata olarak gösterilir', async () => {
    const h = await open(['adaylar', 'giderler'], { 'GET /api/panel/business/sections/giderler': () => jsonResponse(404, { error: 'Bölüm bulunamadı.', code: 'NOT_FOUND' }) });
    await go('/business/vergiler');
    expect(await h.screen.findByText('Bu bölüm hesabında yok', {}, WAIT)).toBeTruthy();
    await go('/business/giderler');
    expect(await h.screen.findByText(/Bölüm bulunamadı/, {}, WAIT)).toBeTruthy();
  });

  it('CRM yazmaları: konuşma denetimi revizyonla, yanıt gönderimi, okundu; aday aşaması (kayıp nedeni zorunlu), görev tamamlama, birleştirme onayla', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => buttons?.at(-1)?.onPress?.());
    const h = await open(['mesaj-kutusu', 'adaylar'], {
      'GET /api/panel/business/sections/mesaj-kutusu': () => jsonResponse(200, thread),
      'GET /api/panel/business/sections/adaylar': () => jsonResponse(200, lead),
      'POST /api/panel/business/crm': ({ body }) => ((body as { command: { type: string } }).command.type === 'lead.priority' ? jsonResponse(409, { error: 'Kayıt başka bir yerde güncellendi.', code: 'CRM_CONFLICT' }) : jsonResponse(200, { result: { entityId: 'x' }, replayed: false })),
      'POST /api/integrations/instagram/send': () => jsonResponse(201, { id: 'm2' }),
    });
    await go('/business/conversation/c1');
    await press(h, await h.screen.findByTestId('crm-use-suggestion', {}, WAIT));
    await press(h, h.screen.getByTestId('crm-reply-send'));
    await waitFor(() => expect(h.server.called('POST', '/api/integrations/instagram/send')[0]?.body).toEqual({ conversationId: 'c1', text: 'Merhaba, paketlerimiz…', idempotencyKey: expect.stringMatching(/^human:c1:[0-9a-f-]{36}$/) }), WAIT);
    expect(await h.screen.findByText('Yanıt gönderim kuyruğuna alındı.', {}, WAIT)).toBeTruthy();

    await press(h, h.screen.getByTestId('chip-WAITING_HUMAN'));
    await press(h, h.screen.getByTestId('chip-OFF'));
    await press(h, h.screen.getByTestId('crm-control'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/business/crm')[0]?.body).toEqual({ command: { type: 'conversation.control', conversationId: 'c1', status: 'WAITING_HUMAN', aiMode: 'OFF' }, idempotencyKey: expect.any(String), expectedRevision: '2026-10-12T09:00:00.000Z' }), WAIT);
    await press(h, h.screen.getByTestId('crm-read'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/business/crm')[1]?.body).toEqual({ command: { type: 'conversation.read', conversationId: 'c1' }, idempotencyKey: expect.any(String) }), WAIT);

    await go('/business/lead/l1');
    await press(h, await h.screen.findByTestId('chip-LOST', {}, WAIT));
    expect(h.screen.getByTestId('crm-stage-save').props.accessibilityState?.disabled).toBe(true);
    await press(h, h.screen.getByTestId('chip-PRICE'));
    await press(h, h.screen.getByTestId('crm-stage-save'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/business/crm').at(-1)?.body).toEqual({ command: { type: 'lead.stage', leadId: 'l1', stage: 'LOST', lostReasonCode: 'PRICE' }, idempotencyKey: expect.any(String), expectedRevision: '2026-10-12T08:00:00.000Z' }), WAIT);

    await press(h, h.screen.getByTestId('crm-task-done-ctask000000000000000000001'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/business/crm').at(-1)?.body).toEqual({ command: { type: 'lead.task_complete', taskId: 'ctask000000000000000000001' }, idempotencyKey: expect.any(String) }), WAIT);
    await press(h, h.screen.getByTestId('crm-merge-cdup0000000000000000000001'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/business/crm').at(-1)?.body).toEqual({ command: { type: 'lead.merge', sourceId: 'l1', targetId: 'cdup0000000000000000000001' }, idempotencyKey: expect.any(String), expectedRevision: '2026-10-12T08:00:00.000Z' }), WAIT);

    await press(h, h.screen.getByTestId('chip-HIGH'));
    await press(h, h.screen.getByTestId('crm-priority-save'));
    expect(await h.screen.findByText(/Kayıt başka bir yerde güncellendi\. Görünüm yenilendi/, {}, WAIT)).toBeTruthy();
  });

  it('aday ekleme: web formunun alanları; takip zamanı İstanbul saatiyle gider', async () => {
    const h = await open(['adaylar'], {
      'GET /api/panel/business/sections/adaylar': ({ query }) => jsonResponse(200, query.get('lead') ? lead : section('adaylar', { label: 'Adaylar' })),
      'POST /api/panel/business/crm': () => jsonResponse(200, { result: { entityId: 'l2' }, replayed: false }),
    });
    await go('/business/adaylar');
    await press(h, await h.screen.findByTestId('crm-new-open', {}, WAIT));
    fireEvent.changeText(h.screen.getByTestId('crm-new-name'), 'Deniz');
    fireEvent.changeText(h.screen.getByTestId('crm-new-phone'), '05551112233');
    await press(h, h.screen.getByTestId('chip-ONLINE_DERSHANEM'));
    await press(h, h.screen.getByTestId('crm-new-save'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/business/crm')[0]?.body).toEqual({ command: { type: 'lead.create', businessUnitId: 'u1', firstName: 'Deniz', productInterest: 'ONLINE_DERSHANEM', phone: '05551112233' }, idempotencyKey: expect.any(String) }), WAIT);
    expect(await h.screen.findByText('Aday eklendi.', {}, WAIT)).toBeTruthy();

    await go('/business/lead/l1');
    fireEvent.changeText(await h.screen.findByTestId('crm-follow-at', {}, WAIT), '2026-10-13 10:30');
    await press(h, h.screen.getByTestId('crm-follow-save'));
    await waitFor(() => expect(h.server.called('POST', '/api/panel/business/crm').at(-1)?.body).toEqual({ command: { type: 'lead.follow_up', leadId: 'l1', nextFollowUpAt: '2026-10-13T07:30:00.000Z' }, idempotencyKey: expect.any(String), expectedRevision: '2026-10-12T08:00:00.000Z' }), WAIT);
  });

  it('yazma izni yoksa CRM işlemleri gösterilmez', async () => {
    const readonly = { ...lead, can: { conversationRead: true, conversationReply: false, leadWrite: false } };
    const h = await open(['adaylar'], { 'GET /api/panel/business/sections/adaylar': () => jsonResponse(200, readonly) });
    await go('/business/lead/l1');
    expect(await h.screen.findByText('Takip gecikti: 11.10.2026 10:00', {}, WAIT)).toBeTruthy();
    expect(h.screen.queryByTestId('crm-stage-save')).toBeNull();
  });
});
