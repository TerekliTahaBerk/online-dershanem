import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, waitFor } from 'expo-router/testing-library';

import { createFakeServer, type FakeAccount } from './fake-server';
import { makeBootstrap } from './fixtures';

/**
 * Gerçek rota ağacı (`src/app`) + gerçek oturum sağlayıcısı + sahte sunucu.
 * Native modüller sahtedir; gerçek cihaz / ağ davranışı burada doğrulanmaz.
 */
/** Jest kök dizinine (mobile/) göre gerçek rota ağacı. */
const APP = './src/app';
const secureStore = SecureStore as unknown as { __store: Map<string, string> };
const WAIT = { timeout: 8000 };

function account(email: string, bootstrap: FakeAccount['bootstrap'], extra: Partial<FakeAccount> = {}): FakeAccount {
  return { email, password: 'Parola-1234', bootstrap, ...extra };
}

// renderRouter sonucu (RNTL sorguları + yol yardımcıları).
let screen: ReturnType<typeof renderRouter>;
let currentServer: ReturnType<typeof createFakeServer>;

async function boot(accounts: FakeAccount[]) {
  const server = createFakeServer(accounts);
  currentServer = server;
  globalThis.fetch = server.fetch;
  screen = renderRouter(APP, { initialUrl: '/' });
  await screen.findByTestId('sign-in-email', {}, WAIT);
  return server;
}

/** Gezinme: navigasyon durumu asenkron güncellendiği için async act içinde. */
async function go(target: '/account' | '/notifications' | '/menu') {
  await act(async () => {
    router.push(target);
  });
}

/** Çıkış: Hesap ekranı üzerinden (Menü'deki düğmeyle aynı `signOut`). */
async function signOutViaAccount() {
  await go('/account');
  await act(async () => {
    fireEvent.press(await screen.findByTestId('account-sign-out', {}, WAIT));
  });
}

async function signIn(email: string, password = 'Parola-1234') {
  fireEvent.changeText(screen.getByTestId('sign-in-email'), email);
  fireEvent.changeText(screen.getByTestId('sign-in-password'), password);
  await act(async () => {
    fireEvent.press(screen.getByTestId('sign-in-submit'));
  });
}

beforeEach(() => {
  secureStore.__store.clear();
});

describe('M1 uygulama akışları', () => {
  it('giriş başarısız: sunucu mesajı gösterilir, token saklanmaz', async () => {
    await boot([account('ada@example.com', makeBootstrap())]);
    await signIn('ada@example.com', 'yanlis');
    expect(await screen.findByText('E-posta veya parola hatalı.', {}, WAIT)).toBeTruthy();
    expect(secureStore.__store.size).toBe(0);
  });

  it('OD öğrencisi: giriş → OD Bugün; token SecureStore\'da, istekler Bearer taşır', async () => {
    const server = await boot([account('ada@example.com', makeBootstrap({ products: { OD: 'ACTIVE' } }))]);
    await signIn('ada@example.com');
    await waitFor(() => expect(server.called('GET', '/api/panel/student/home').length).toBeGreaterThan(0), WAIT);
    expect(secureStore.__store.size).toBe(1);
    expect(server.called('GET', '/api/panel/me')[0].authorization).toMatch(/^Bearer token-/);
  });

  it('Yön-only öğrenci OD ekranına düşmez: Yön Bugün açılır, OD ana sayfa ucu çağrılmaz', async () => {
    const server = await boot([account('yon@example.com', makeBootstrap({ products: { OK: 'ACTIVE' } }))]);
    await signIn('yon@example.com');
    expect(await screen.findByTestId('yon-today', {}, WAIT)).toBeTruthy();
    expect(server.called('GET', '/api/panel/student/home')).toHaveLength(0);
    expect(server.called('GET', '/api/panel/assignments')).toHaveLength(0);
  });

  it('Deneme Ligi-only öğrenci OD ekranına düşmez', async () => {
    const server = await boot([account('dl@example.com', makeBootstrap({ products: { ODK: 'ACTIVE' } }))]);
    await signIn('dl@example.com');
    expect(await screen.findByTestId('odk-home', {}, WAIT)).toBeTruthy();
    expect(server.called('GET', '/api/panel/student/home')).toHaveLength(0);
  });

  it('geçici parola: kapı ekranı; ürün uçları çağrılmaz; değişiklik sonrası sunucu READY deyince açılır', async () => {
    const ready = makeBootstrap({ products: { OK: 'ACTIVE' } });
    const server = await boot([account('temp@example.com', makeBootstrap({ gate: 'PASSWORD_CHANGE_REQUIRED' }), { afterPasswordChange: ready })]);
    await signIn('temp@example.com');
    expect(await screen.findByText('Parolanı belirle', {}, WAIT)).toBeTruthy();
    expect(server.calls.filter((call) => call.path.startsWith('/api/panel/') && call.path !== '/api/panel/me')).toHaveLength(0);
    fireEvent.changeText(screen.getByLabelText('Mevcut parola'), 'Parola-1234');
    fireEvent.changeText(screen.getByLabelText('Yeni parola'), 'Yepyeni-Parola-99');
    fireEvent.changeText(screen.getByLabelText('Yeni parola (tekrar)'), 'Yepyeni-Parola-99');
    await act(async () => {
      fireEvent.press(screen.getByTestId('change-password-submit'));
    });
    expect(await screen.findByTestId('yon-today', {}, WAIT)).toBeTruthy();
  });

  it('MFA: yanlış kod kapıyı açmaz; doğru kod sonrası sunucu READY deyince personel ekranı açılır', async () => {
    const server = await boot([
      account('editor@example.com', makeBootstrap({ role: 'TEACHER', gate: 'MFA_REQUIRED' }), { afterMfa: makeBootstrap({ role: 'TEACHER', products: { ODK: 'ACTIVE' } }) }),
    ]);
    await signIn('editor@example.com');
    expect(await screen.findByText('İkinci faktör doğrulaması', {}, WAIT)).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('mfa-code'), '000000');
    await act(async () => {
      fireEvent.press(screen.getByTestId('mfa-submit'));
    });
    expect(await screen.findByText('Kod geçersiz, kullanılmış veya süresi dolmuş.', {}, WAIT)).toBeTruthy();
    expect(screen.queryByTestId('staff-home-TEACHER')).toBeNull();
    fireEvent.changeText(screen.getByTestId('mfa-code'), '123456');
    await act(async () => {
      fireEvent.press(screen.getByTestId('mfa-submit'));
    });
    expect(await screen.findByTestId('staff-home-TEACHER', {}, WAIT)).toBeTruthy();
    expect(server.called('POST', '/api/auth/mfa/code/verify')).toHaveLength(2);
  });

  it('yalnız geçiş anahtarı olan personel: kırık durum yok, web devam yolu sunulur', async () => {
    await boot([account('pk@example.com', makeBootstrap({ role: 'TEACHER', gate: 'MFA_REQUIRED', mfa: { enrolled: true, totp: false, recoveryCodes: false, passkey: true } }))]);
    await signIn('pk@example.com');
    expect(await screen.findByText('Geçiş anahtarı mobilde henüz desteklenmiyor', {}, WAIT)).toBeTruthy();
    expect(screen.getByText('Web panelinde devam et')).toBeTruthy();
  });

  it('üç ürünlü öğrenci çalışma alanı seçer; seçim sunucuya yazılır, menü sunucudan gelir', async () => {
    const server = await boot([
      account('uc@example.com', makeBootstrap({ products: { OD: 'ACTIVE', OK: 'ACTIVE', ODK: 'ACTIVE' }, activeProduct: null }), {
        afterSelect: { OK: makeBootstrap({ products: { OD: 'ACTIVE', OK: 'ACTIVE', ODK: 'ACTIVE' }, activeProduct: 'OK' }) },
      }),
    ]);
    await signIn('uc@example.com');
    expect(await screen.findByTestId('select-OK', {}, WAIT)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('select-OK'));
    });
    expect(await screen.findByTestId('yon-today', {}, WAIT)).toBeTruthy();
    expect(server.called('POST', '/api/panel/active-product')[0].body).toEqual({ product: 'OK' });
  });

  it('tek aktif ürünü seçilmemiş öğrenci için seçim sunucu üzerinden otomatik yapılır', async () => {
    const server = await boot([
      account('tek@example.com', makeBootstrap({ products: { OD: 'ACTIVE' }, activeProduct: null }), { afterSelect: { OD: makeBootstrap({ products: { OD: 'ACTIVE' } }) } }),
    ]);
    await signIn('tek@example.com');
    await waitFor(() => expect(server.called('POST', '/api/panel/active-product')).toHaveLength(1), WAIT);
  });

  it('aktif ürünü olmayan öğrenci açıklamalı boş durum görür', async () => {
    await boot([account('yok@example.com', makeBootstrap({ products: {}, activeProduct: null }))]);
    await signIn('yok@example.com');
    expect(await screen.findByText('Aktif çalışma alanın yok', {}, WAIT)).toBeTruthy();
  });

  it('veli, öğretmen ve yönetim kendi bilinçli yer tutucularını görür (öğrenci sekmesi değil)', async () => {
    const server = await boot([
      account('veli@example.com', makeBootstrap({ role: 'PARENT', products: { OD: 'ACTIVE' } })),
      account('ogretmen@example.com', makeBootstrap({ role: 'TEACHER', products: { OD: 'ACTIVE' }, activeProduct: null })),
      account('yonetim@example.com', makeBootstrap({ role: 'ADMIN', products: { OD: 'ACTIVE', OK: 'ACTIVE', ODK: 'ACTIVE' }, activeProduct: null })),
    ]);
    await signIn('veli@example.com');
    expect(await screen.findByTestId('placeholder-today', {}, WAIT)).toBeTruthy();
    expect(server.called('GET', '/api/panel/student/home')).toHaveLength(0);
    await signOutViaAccount();
    await signIn('ogretmen@example.com');
    expect(await screen.findByTestId('staff-home-TEACHER', {}, WAIT)).toBeTruthy();
    await signOutViaAccount();
    await signIn('yonetim@example.com');
    expect(await screen.findByTestId('staff-home-ADMIN', {}, WAIT)).toBeTruthy();
    expect(server.called('GET', '/api/panel/student/home')).toHaveLength(0);
  });

  it('Menü sunucu menüsünü çalışma alanına göre listeler (Yön menüsünde OD öğesi yok)', async () => {
    await boot([account('yon@example.com', makeBootstrap({ products: { OK: 'ACTIVE' } }))]);
    await signIn('yon@example.com');
    await screen.findByTestId('yon-today', {}, WAIT);
    await go('/menu');
    expect(await screen.findByTestId('menu-notifications', {}, WAIT)).toBeTruthy();
    expect(screen.queryByTestId('menu-materials')).toBeNull();
  });

  it('çıkış: sunucu oturumu iptal edilir, SecureStore temizlenir, giriş ekranına dönülür', async () => {
    const server = await boot([account('ada@example.com', makeBootstrap({ products: { OK: 'ACTIVE' } }))]);
    await signIn('ada@example.com');
    await screen.findByTestId('yon-today', {}, WAIT);
    await signOutViaAccount();
    expect(await screen.findByTestId('sign-in-email', {}, WAIT)).toBeTruthy();
    expect(server.called('POST', '/api/auth/logout')[0].authorization).toMatch(/^Bearer /);
    expect(server.revoked.size).toBe(1);
    expect(secureStore.__store.size).toBe(0);
  });

  it('hesap değişimi: önceki kullanıcının bildirimleri yeni kullanıcıya görünmez (önbellek izolasyonu)', async () => {
    await boot([
      account('a@example.com', makeBootstrap({ userId: 'user-a', products: { OK: 'ACTIVE' } }), { notifications: [{ id: 'na', title: 'A kullanıcısının bildirimi', href: null }] }),
      account('b@example.com', makeBootstrap({ userId: 'user-b', products: { OK: 'ACTIVE' } }), { notifications: [{ id: 'nb', title: 'B kullanıcısının bildirimi', href: null }] }),
    ]);
    await signIn('a@example.com');
    await screen.findByTestId('yon-today', {}, WAIT);
    await go('/notifications');
    expect(await screen.findByText('A kullanıcısının bildirimi', {}, WAIT)).toBeTruthy();
    await signOutViaAccount();
    await signIn('b@example.com');
    await screen.findByTestId('yon-today', {}, WAIT);
    await go('/notifications');
    expect(await screen.findByText('B kullanıcısının bildirimi', {}, WAIT)).toBeTruthy();
    expect(screen.queryByText('A kullanıcısının bildirimi')).toBeNull();
  });

  it('oturum sunucuda iptal edilirse (401) yerel kimlik silinir ve "oturum sona erdi" gösterilir', async () => {
    const server = await boot([account('ada@example.com', makeBootstrap({ products: { OD: 'ACTIVE' } }))]);
    server.override('GET /api/panel/student/home', () => new Response(JSON.stringify({ error: 'Oturumunuz sona ermiş.', code: 'UNAUTHENTICATED' }), { status: 401 }));
    await signIn('ada@example.com');
    expect(await screen.findByText('Oturumun sona erdi. Lütfen tekrar giriş yap.', {}, WAIT)).toBeTruthy();
    expect(secureStore.__store.size).toBe(0);
  });

  it('çevrimdışı / sunucu hatası / bozuk bootstrap: ürün ekranı açılmaz, yeniden denenebilir hata ekranı', async () => {
    const server = await boot([account('ada@example.com', makeBootstrap({ products: { OK: 'ACTIVE' } }))]);
    server.override('GET /api/panel/me', () => Promise.reject(new TypeError('Network request failed')));
    await signIn('ada@example.com');
    expect(await screen.findByText('Hesap bilgileri yüklenemedi', {}, { timeout: 15000 })).toBeTruthy();
    expect(screen.queryByTestId('yon-today')).toBeNull();
    server.override('GET /api/panel/me', () => new Response('{"contractVersion":1,"user":{}}', { status: 200 }));
    await act(async () => {
      fireEvent.press(screen.getByText('Tekrar dene'));
    });
    expect(await screen.findByText('Sunucudan beklenmeyen bir yanıt alındı.', {}, WAIT)).toBeTruthy();
    server.override('GET /api/panel/me', null);
    await act(async () => {
      fireEvent.press(screen.getByText('Tekrar dene'));
    });
    expect(await screen.findByTestId('yon-today', {}, WAIT)).toBeTruthy();
  }, 30000);

  it('desteklenmeyen sürüm (426) güncelleme ekranı gösterir', async () => {
    const server = await boot([account('ada@example.com', makeBootstrap())]);
    server.override('GET /api/panel/me', () => new Response(JSON.stringify({ error: 'Güncelleyin.', code: 'CLIENT_UPGRADE_REQUIRED', minSupportedVersion: '2.0.0' }), { status: 426 }));
    await signIn('ada@example.com');
    expect(await screen.findByText('Güncelleme gerekli', {}, WAIT)).toBeTruthy();
    expect(screen.getByText(/Gereken en düşük sürüm: 2.0.0/)).toBeTruthy();
  });

  it('bildirim: yetkili hedef açılır; başka çalışma alanına ait hedef açılmaz ve açıklanır', async () => {
    await boot([
      account('ada@example.com', makeBootstrap({ products: { OD: 'ACTIVE' } }), {
        notifications: [
          { id: 'n1', title: 'Yeni kaynak', href: '/panel/ogrenci/materyaller?id=1' },
          { id: 'n2', title: 'Deneme sonucu', href: '/panel/odk/ogrenci/denemeler/x/sonuc' },
        ],
      }),
    ]);
    const server = (await signIn('ada@example.com'), currentServer);
    await waitFor(() => expect(server.called('GET', '/api/panel/student/home').length).toBeGreaterThan(0), WAIT);
    await go('/notifications');
    await act(async () => {
      fireEvent.press(await screen.findByText('Deneme sonucu', {}, WAIT));
    });
    expect(await screen.findByText('Bu bildirimin içeriği bu çalışma alanında veya mobilde henüz açılamıyor.', {}, WAIT)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText('Yeni kaynak'));
    });
    await waitFor(() => expect(screen.getPathname()).toBe('/screen/materials'), WAIT);
  });
});
