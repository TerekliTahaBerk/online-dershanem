import { Linking } from 'react-native';
import { waitFor, within } from 'expo-router/testing-library';

import { isSafeExternalUrl } from '@/lib/links';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
import { makeLessonDetail, makeLessonList, makeOdHome } from './od-fixtures';

beforeEach(() => secureStore.__store.clear());

const routes = {
  'GET /api/panel/student/lessons': () => jsonResponse(200, makeLessonList()),
  'GET /api/panel/student/lessons/l-1': () =>
    jsonResponse(200, makeLessonDetail({ personalNote: 'Ada için not', assignments: [{ id: 'a-1', title: 'Kesir çalışması', dueAt: '2026-10-10T17:00:00.000Z', done: false }] })),
  'GET /api/panel/student/lessons/l-foreign': () => jsonResponse(404, { error: 'Ders bulunamadı.' }),
};

describe('M2.3 Dersler ve ders detayı', () => {
  it('liste → detay: sunucu okuma modeli; katılım penceresi kapalıyken bağlantı yok, açılış saati sunucudan', async () => {
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes })]);
    await signIn(h, 'ada@example.com');
    await h.screen.findByTestId('od-home', {}, WAIT);
    await go('/slot-2');
    const list = within(await h.screen.findByTestId('od-lessons', {}, WAIT));
    expect(h.server.called('GET', '/api/panel/student/lessons')[0].path).toBe('/api/panel/student/lessons?durum=yaklasan');
    await press(h, await list.findByTestId('lesson-l-1', {}, WAIT));
    await waitFor(() => expect(h.screen.getPathname()).toBe('/od/lesson/l-1'), WAIT);
    const detail = within(await h.screen.findByTestId('lesson-detail', {}, WAIT));
    expect(await detail.findByText('Kesirlerde toplama', {}, WAIT)).toBeTruthy();
    expect(detail.getByText('“Ada için not”')).toBeTruthy();
    expect(detail.getByText('Kesir çalışması')).toBeTruthy();
    expect(detail.queryByTestId('lesson-join')).toBeNull();
    expect(detail.getByText(/Derse katılım bağlantısı .* açılacak\./)).toBeTruthy();
  });

  it('katılım penceresi açık: yalnız sunucunun verdiği http(s) bağlantısı açılır', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const h = await boot([
      account('ada@example.com', makeBootstrap(), {
        routes: { ...routes, 'GET /api/panel/student/lessons/l-1': () => jsonResponse(200, makeLessonDetail({ join: { state: 'OPEN', url: 'https://meet.example.com/abc', opensAt: null } })) },
      }),
    ]);
    await signIn(h, 'ada@example.com');
    await h.screen.findByTestId('od-home', {}, WAIT);
    await go('/od/lesson/l-1');
    const detail = within(await h.screen.findByTestId('lesson-detail', {}, WAIT));
    await press(h, await detail.findByTestId('lesson-join', {}, WAIT));
    expect(open).toHaveBeenCalledWith('https://meet.example.com/abc');
    open.mockRestore();
  });

  it('başka grubun / olmayan ders: sunucu 404 → açıklamalı hata, içerik yok', async () => {
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes })]);
    await signIn(h, 'ada@example.com');
    await h.screen.findByTestId('od-home', {}, WAIT);
    await go('/od/lesson/l-foreign');
    const detail = within(await h.screen.findByTestId('lesson-detail', {}, WAIT));
    expect(await detail.findByText('Ders bulunamadı.', {}, WAIT)).toBeTruthy();
    expect(detail.queryByText('Kesirlerde toplama')).toBeNull();
  });

  it('OD Bugün "Şimdi" eylemi yetkili ders detayına gider', async () => {
    const home = makeOdHome({
      now: { id: 'lesson-l-1', kind: 'OPEN_LESSON', reasonCode: 'LIVE_LESSON', title: 'Kesirler · Canlı ders', description: null, reason: 'Ders şu anda devam ediyor.', ctaLabel: 'Derse Katıl', joinable: true, target: { type: 'lesson', lessonId: 'l-1' }, webPath: '/panel/ogrenci/takvim/l-1' },
    });
    const h = await boot([account('ada@example.com', makeBootstrap(), { routes: { ...routes, 'GET /api/panel/student/home': () => jsonResponse(200, home) } })]);
    await signIn(h, 'ada@example.com');
    await press(h, await h.screen.findByTestId('od-now-cta', {}, WAIT));
    await waitFor(() => expect(h.screen.getPathname()).toBe('/od/lesson/l-1'), WAIT);
  });

  it('bildirim: ders detayı web yolu yalnız "Dersler" menüdeyken native detaya eşlenir', async () => {
    const h = await boot([
      account('ada@example.com', makeBootstrap(), { routes, notifications: [{ id: 'n1', title: 'Ders özeti eklendi', href: '/panel/ogrenci/takvim/l-1' }] }),
    ]);
    await signIn(h, 'ada@example.com');
    await h.screen.findByTestId('od-home', {}, WAIT);
    await go('/notifications');
    await press(h, await h.screen.findByText('Ders özeti eklendi', {}, WAIT));
    await waitFor(() => expect(h.screen.getPathname()).toBe('/od/lesson/l-1'), WAIT);
  });

  it('isSafeExternalUrl yalnız HTTPS kabul eder', () => {
    expect(isSafeExternalUrl('https://meet.example.com/x')).toBe(true);
    expect(isSafeExternalUrl('http://meet.example.com/x')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('intent://x#Intent;end')).toBe(false);
    expect(isSafeExternalUrl('bozuk')).toBe(false);
    expect(isSafeExternalUrl(null)).toBe(false);
  });
});
