import type { MobileProductCode } from '@contracts/bootstrap';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter } from 'expo-router/testing-library';

import { createFakeServer, type FakeAccount } from './fake-server';

/**
 * Akış testlerinin ortak düzeneği: gerçek rota ağacı (`src/app`) + gerçek
 * oturum sağlayıcısı + sahte sunucu. Native modüller sahtedir; gerçek cihaz
 * / ağ davranışı burada doğrulanmaz.
 */

/** Jest kök dizinine (mobile/) göre gerçek rota ağacı. */
const APP = './src/app';
export const secureStore = SecureStore as unknown as { __store: Map<string, string> };
export const WAIT = { timeout: 8000 };

export function account(email: string, bootstrap: FakeAccount['bootstrap'], extra: Partial<FakeAccount> = {}): FakeAccount {
  return { email, password: 'Parola-1234', bootstrap, ...extra };
}

export type Harness = {
  screen: ReturnType<typeof renderRouter>;
  server: ReturnType<typeof createFakeServer>;
  accounts: FakeAccount[];
};

export async function boot(accounts: FakeAccount[]): Promise<Harness> {
  const server = createFakeServer(accounts);
  globalThis.fetch = server.fetch;
  const screen = renderRouter(APP, { initialUrl: '/' });
  await screen.findByTestId('sign-in-email', {}, WAIT);
  return { screen, server, accounts };
}

/** Gezinme: navigasyon durumu asenkron güncellendiği için async act içinde. */
export async function go(target: string) {
  await act(async () => {
    router.push(target as never);
  });
}

/**
 * Parolayla giriş. Web gibi girişten sonra panel seçici açılır; `pick`
 * verilmezse hesabın sunucudaki etkin ürünü seçilir (seçici atlanmaz,
 * kullanıcının yapacağı dokunuş taklit edilir). `pick: false` seçiciyi açık bırakır.
 */
export async function signIn(h: Harness, email: string, password = 'Parola-1234', options: { pick?: MobileProductCode | false } = {}) {
  fireEvent.changeText(h.screen.getByTestId('sign-in-email'), email);
  fireEvent.changeText(h.screen.getByTestId('sign-in-password'), password);
  await act(async () => {
    fireEvent.press(h.screen.getByTestId('sign-in-submit'));
  });
  if (options.pick === false) return;
  const product = options.pick ?? h.accounts.find((candidate) => candidate.email === email)?.bootstrap.workspace?.activeProduct ?? null;
  await chooseWorkspace(h, product);
}

/** Girişten sonraki panel sorusunu yanıtlar; seçici açılmazsa (hatalı giriş, MFA kapısı) bir şey yapmaz. */
export async function chooseWorkspace(h: Harness, product: MobileProductCode | null) {
  const heading = await h.screen.findByText('Hangi panele girmek istiyorsun?', {}, { timeout: 3000 }).catch(() => null);
  if (!heading) return;
  const target = product ? h.screen.queryByTestId(`select-${product}`) : h.screen.queryByText('Panele devam et');
  if (target) await press(h, target);
}

export async function press(h: Harness, element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    fireEvent.press(element);
  });
}

export const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
