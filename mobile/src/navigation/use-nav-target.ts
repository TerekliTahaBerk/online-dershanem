import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

import { useSession } from '@/lib/auth/session-provider';

import { expoHrefFor, mapNotificationHref, targetForNavId, type NativeTarget } from './route-map';

/**
 * Ekran içi bağlantılar sunucu menüsünden çözülür: hedef bu kullanıcının bu
 * çalışma alanında YETKİLİ menüsünde yoksa bağlantı hiç gösterilmez (ölü
 * bağlantı / yanlış ürün ekranı yok).
 */
export function useNavTarget() {
  const router = useRouter();
  const { bootstrap } = useSession();
  const navigation = bootstrap?.workspace?.navigation ?? null;

  const resolve = useCallback((navId: string): NativeTarget => (navigation ? targetForNavId(navigation, navId) : { kind: 'none' }), [navigation]);

  const open = useCallback(
    (target: NativeTarget): boolean => {
      const href = expoHrefFor(target);
      if (!href) return false;
      router.push(href as Href);
      return true;
    },
    [router],
  );

  return {
    canOpen: (navId: string) => resolve(navId).kind !== 'none',
    openNavId: (navId: string) => open(resolve(navId)),
    openNotificationHref: (href: string | null) => open(mapNotificationHref(href, navigation)),
  };
}
