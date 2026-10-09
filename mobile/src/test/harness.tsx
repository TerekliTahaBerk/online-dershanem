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
};

export async function boot(accounts: FakeAccount[]): Promise<Harness> {
  const server = createFakeServer(accounts);
  globalThis.fetch = server.fetch;
  const screen = renderRouter(APP, { initialUrl: '/' });
  await screen.findByTestId('sign-in-email', {}, WAIT);
  return { screen, server };
}

/** Gezinme: navigasyon durumu asenkron güncellendiği için async act içinde. */
export async function go(target: string) {
  await act(async () => {
    router.push(target as never);
  });
}

export async function signIn(h: Harness, email: string, password = 'Parola-1234') {
  fireEvent.changeText(h.screen.getByTestId('sign-in-email'), email);
  fireEvent.changeText(h.screen.getByTestId('sign-in-password'), password);
  await act(async () => {
    fireEvent.press(h.screen.getByTestId('sign-in-submit'));
  });
}

export async function press(h: Harness, element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    fireEvent.press(element);
  });
}

export const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
