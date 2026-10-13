import { act, waitFor } from '@testing-library/react-native';
import { RefreshControl } from 'react-native';
import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
beforeEach(() => secureStore.__store.clear());
const homePath = '/api/panel/odk/management/home', packagesPath = '/api/panel/odk/management/packages';
const home = { contractVersion: 1, weekCount: 3, awaitingReleaseCount: 1, pilotBlocked: 2, attention: [], upcoming: [], live: [], activity: [], modules: [{ id: 'odk-packages', title: 'Deneme Ligi paketleri', href: '/panel/odk/yonetim/paketler' }] };
const policy = { sales: { state: 'PAUSED' }, access: { starts: 'PURCHASED_AT', durationDays: 30 }, rights: { studentReports: true, parentReports: true, teacherReports: false, liveService: true }, exceptions: { soldOut: 'BLOCK_NEW_ORDERS', outage: 'EXTEND_ACCESS', cancellation: 'REFUND', refund: 'BEFORE_FIRST_ATTEMPT', exceptionalAccess: 'ADMIN_GRANT_WITH_REASON_AND_EXPIRY' } };
const packages = { contractVersion: 1, rows: [{ id: 'p1', title: 'Dönem paketi', slug: 'donem', priceCents: 12345, isActive: true, contractVersion: 3, policy, orderCount: 2, entitlementCount: 4, exams: [{ id: 'e1', title: 'LGS denemesi', seriesTitle: null, startsAt: null, endsAt: null, lateEntryMinutes: 15, attemptLimit: 1, resultsReleasedAt: null, answerKeyReleasedAt: null, meetRequired: true }] }] };
const nav: [string, string, string][] = [['today', 'Deneme Ligi', '/panel/odk/yonetim'], ['odk-packages', 'Paketler', '/panel/odk/yonetim/paketler']];
function bootstrap(role: 'ADMIN' | 'TEACHER') { return makeBootstrap({ role, products: { ODK: 'ACTIVE' }, activeProduct: 'ODK', ...(role === 'ADMIN' ? { adminNav: { primary: [nav[0]], sections: [nav[1]] } } : { extraNav: nav }) }); }
it.each(['ADMIN', 'TEACHER'] as const)('%s opens management home and native read-only package contract', async (role) => {
  const h = await boot([account('staff@example.com', bootstrap(role), { routes: { [`GET ${homePath}`]: () => jsonResponse(200, { ...home, pilotBlocked: role === 'ADMIN' ? 2 : null, awaitingReleaseCount: role === 'ADMIN' ? 1 : null }), [`GET ${packagesPath}`]: () => jsonResponse(200, packages) } })]);
  await signIn(h, 'staff@example.com'); await go('/screen/today'); expect(await h.screen.findByTestId('odk-management-home', {}, WAIT)).toBeTruthy(); expect(await h.screen.findByText(role === 'ADMIN' ? '3 deneme takvimde · 1 deneme yayın bekliyor' : '3 deneme takvimde', {}, WAIT)).toBeTruthy();
  expect(Boolean(h.screen.queryByTestId('odk-pilot-readiness'))).toBe(role === 'ADMIN');
  await press(h, h.screen.getByTestId('odk-module-odk-packages')); await press(h, await h.screen.findByTestId('odk-package-p1', {}, WAIT));
  expect(await h.screen.findByText('Erişim süresi: 30 gün', {}, WAIT)).toBeTruthy(); expect(h.screen.getByText('LGS denemesi')).toBeTruthy(); expect(h.screen.getByText('İade: İlk denemeden önce iade')).toBeTruthy(); expect(h.screen.getByText('Canlı hizmet: dahil')).toBeTruthy();
  expect(h.server.called('POST', packagesPath)).toHaveLength(0); expect(h.server.called('POST', homePath)).toHaveLength(0);
});
it('revoked package access removes stale data after refresh', async () => {
  let allowed = true;
  const h = await boot([account('staff@example.com', bootstrap('TEACHER'), { routes: { [`GET ${packagesPath}`]: () => allowed ? jsonResponse(200, packages) : jsonResponse(403, { error: 'Yetkiniz yok.' }) } })]);
  await signIn(h, 'staff@example.com'); await go('/screen/odk-packages'); expect(await h.screen.findByTestId('odk-package-p1', {}, WAIT)).toBeTruthy(); allowed = false;
  await act(async () => { h.screen.UNSAFE_getAllByType(RefreshControl)[0].props.onRefresh(); }); await waitFor(() => expect(h.screen.queryByTestId('odk-package-p1')).toBeNull(), WAIT);
  expect(h.server.called('POST', packagesPath)).toHaveLength(0);
});
