import { fireEvent, waitFor } from '@testing-library/react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
import type { FakeAccount } from './fake-server';
import { orderCenter } from './admin-orders-fixture';
const filters = { from: '2026-09-01', to: '2026-09-30', examType: 'ALL', product: 'ALL', classLevel: '', groupId: '', teacherId: '', notice: null };
const metrics = [{ key: 'lead_count', label: 'Talep sayısı', display: '12', definition: 'Aralıktaki talepler', domain: 'commercial', unit: 'count', denominator: 'Tüm talepler', querySource: 'LeadSubmission', dateSemantics: 'created_in_range', timezone: 'Europe/Istanbul' }];
const analytics = { contractVersion: 1, ruleVersion: 'v1', timezone: 'Europe/Istanbul', filters, metrics, sections: [], gains: [{ exam: 'LGS', status: 'INSUFFICIENT_SAMPLE' }] };
const logs = [{ id: 'a', action: 'user.update', summary: 'Kişi güncellendi', entityType: 'User', actor: 'Yönetici', createdAt: '2026-10-12T09:00:00Z' }];
beforeEach(() => secureStore.__store.clear());
async function open(routes: NonNullable<FakeAccount['routes']> = {}) {
 const bootstrap = makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE' }, activeProduct: 'OD', adminNav: { primary: [['today', 'Operasyon', '/panel/yonetim']], sections: [['analytics', 'Analitik', '/panel/yonetim/analitik'], ['audit', 'İşlem geçmişi', '/panel/yonetim/kayitlar'], ['features', 'Özellikler', '/panel/yonetim/ozellikler'], ['quality', 'Kalite', '/panel/yonetim/kalite']] } });
 const h = await boot([account('admin@example.com', bootstrap, { routes: { 'GET /api/panel/admin/operations-center': () => jsonResponse(200, orderCenter), 'GET /api/panel/admin/analytics': () => jsonResponse(200, analytics), 'GET /api/panel/admin/audit': () => jsonResponse(200, { contractVersion: 1, logs }), ...routes } })]); await signIn(h, 'admin@example.com'); return h;
}
it('analitik filtrelerini sunucuya gönderir ve metrik detayına taşır', async () => {
 const h = await open(); await go('/screen/analytics'); await h.screen.findByTestId('analytics-apply', {}, WAIT);
 fireEvent.changeText(h.screen.getByTestId('analytics-from'), '2026-09-01'); await press(h, h.screen.getByTestId('chip-OD')); await press(h, h.screen.getByTestId('analytics-apply'));
 await waitFor(() => expect(h.server.called('GET', '/api/panel/admin/analytics').some((c) => c.path.includes('product=OD') && c.path.includes('from=2026-09-01'))).toBe(true), WAIT);
 await press(h, await h.screen.findByTestId('metric-lead_count', {}, WAIT));
 expect(await h.screen.findByText('Aralıktaki talepler', {}, WAIT)).toBeTruthy(); expect(h.screen.getByText('Payda: Tüm talepler')).toBeTruthy();
 expect(h.server.called('GET', '/api/panel/admin/analytics').at(-1)?.path).toContain('product=OD');
});
it('işlem geçmişi tür filtresi sunucuda uygulanır ve boş görünümü gösterir', async () => {
 const h = await open({ 'GET /api/panel/admin/audit': ({ query }) => jsonResponse(200, { contractVersion: 1, logs: query.get('tur') === 'Group' ? [] : logs }) });
 await go('/screen/audit'); expect(await h.screen.findByText('Kişi güncellendi', {}, WAIT)).toBeTruthy(); await press(h, h.screen.getByTestId('chip-Group'));
 expect(await h.screen.findByText('Bu türde henüz işlem yok', {}, WAIT)).toBeTruthy();
});
it('kalite kapalıysa sunucu hatası; sözleşme bozuksa başarı ekranı gösterilmez', async () => {
 const h = await open({ 'GET /api/panel/admin/quality': () => jsonResponse(404, { error: 'Bu bölüm şu anda açık değil.' }), 'GET /api/panel/admin/features': () => jsonResponse(200, { contractVersion: 99, features: [], logs: [] }) });
 await go('/screen/quality'); expect(await h.screen.findByText(/Bu bölüm şu anda açık değil/, {}, WAIT)).toBeTruthy();
 await go('/screen/features'); expect(await h.screen.findByText('Sunucudan beklenmedik bir yanıt aldık. Lütfen tekrar dener misiniz?', {}, WAIT)).toBeTruthy(); expect(h.screen.queryByText('0/0 açık')).toBeNull();
});
it('metrik detayına öğrenci doğrudan giremez; API isteği yapılmaz', async () => {
 const h = await boot([account('ada@example.com', makeBootstrap())]); await signIn(h, 'ada@example.com'); await go('/admin/metric/lead_count');
 expect(await h.screen.findByText('Bu bölüm hesabında yok', {}, WAIT)).toBeTruthy(); expect(h.server.called('GET', '/api/panel/admin/analytics')).toHaveLength(0);
});
it('özellik durumunu, drift ve geri alma bilgisini salt okunur gösterir', async () => {
 const h = await open({ 'GET /api/panel/admin/features': () => jsonResponse(200, { contractVersion: 1, logs, features: [{ key: 'quality', label: 'Kalite bayrağı', status: 'pilot', enabled: true, source: 'environment', environmentKey: 'PANEL_FEATURE_COHORT_QUALITY', defaultEnabled: false, legacyPublicConfigured: true, legacyPublicDrift: true, owner: 'Eğitim', roles: ['ADMIN'], dataDependency: 'Deneme', e2eCoverage: 'Dört rol', rollback: 'Bayrağı kapat' }] }) });
 await go('/screen/features'); expect(await h.screen.findByText('Kalite bayrağı', {}, WAIT)).toBeTruthy(); expect(h.screen.getByText('Geri alma: Bayrağı kapat')).toBeTruthy(); expect(h.screen.getByText(/1\/1 açık/)).toBeTruthy();
});
it('kalite dağılımı ve ortak eksik sinyalleri gösterilir; küçük kohort gizli kalır', async () => {
 const h = await open({ 'GET /api/panel/admin/quality': () => jsonResponse(200, { contractVersion: 1, ruleVersion: 'v1', minStudents: 10, minGapDays: 14, sections: [], commonErrors: [{ label: 'Dikkat', students: 10 }], gains: [{ exam: 'LGS', status: 'READY', pairedStudents: 12, observedStudents: 15, medianChange: 5, lowerQuartile: 2, upperQuartile: 8, positiveChangePercent: 75, medianGapDays: 20, coveragePercent: 80, dataThrough: null }, { exam: 'TYT', status: 'INSUFFICIENT_SAMPLE', pairedStudents: 1 }] }) });
 await go('/screen/quality'); expect(await h.screen.findByText(/Medyan değişim: \+5/, {}, WAIT)).toBeTruthy(); expect(h.screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 75 }); expect(h.screen.getByText('Dikkat')).toBeTruthy(); expect(h.screen.getByText(/örneklem sayısı, değişim ve veri tarihi gizlendi/)).toBeTruthy(); expect(h.screen.queryByText(/1 eşleşme/)).toBeNull();
});
