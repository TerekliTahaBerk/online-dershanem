import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import * as endpoints from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { fetchSingleNotification } from '@/lib/api/push';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { setBadge } from '@/lib/push/native-push';
import { syncPushRegistration } from '@/lib/push/registration';
import { queryKeys, sessionKeyFor } from '@/lib/query/keys';
import { parentNavIdForWebPath } from '@contracts/parent';

import { useParentContext } from '@/features/parent/parent-context';
import { expoHrefFor, mapNotificationHref, parentStudentIdFromHref, workspaceForWebPath } from '@/navigation/route-map';

/**
 * Push çalışma zamanı (M5) — yalnız hazır çalışma alanında (`(app)` düzeni)
 * bağlanır; parola / MFA / çalışma alanı kapıları tamamlanmadan dokunma
 * işlenmez (soğuk başlangıç yanıtı kapı geçilince işlenir).
 *
 * Dokunma akışı (yükteki URL'e GÜVENİLMEZ, yalnız `notificationId`):
 *  1. Bildirim kimlikli uçtan okunur (sahiplik sunucuda; başkasınınki 404).
 *  2. Okundu işaretlenir (sunucu önce), sayaçlar ve rozet yenilenir.
 *  3. Hedef MERKEZİ eşleyiciyle, yetkili menüye göre çözülür.
 *  4. Hedef başka çalışma alanındaysa ve o ürün ACTIVE ise mevcut geçiş
 *     (`selectWorkspace`) yapılır; YENİ menü gelince hedef tekrar çözülür.
 *     Tek deneme: döngü yok. Çözülemezse bildirim kutusu açılır.
 *  5. VELİ (M6): hedef çocuk kapsamlı bir veli ekranıysa çocuk, sunucudan
 *     okunan bildirim kaydındaki `studentId`'den alınır ve GÜNCEL çocuk
 *     listesiyle yeniden doğrulanır. Listede yoksa (bağlantı bitti) veya
 *     birden çok çocuk varken kayıt çocuğu belirtmiyorsa (belirsiz) bildirim
 *     kutusu açılır — başka çocuğa sessizce düşülmez. Yükte çocuk adı /
 *     kimliği YOKTUR (M5 politikası).
 */

// Ön planda: sistem afişi ve listeye eklenir, ses yok (uygulama içi kutu ayrıca güncellenir).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Aynı yanıtın (soğuk başlangıç + dinleyici) iki kez işlenmesini önler. */
const handledResponses = new Set<string>();

/** Yanıt güvenilmeyen girdidir: yapı savunmacı okunur, yalnız opak kimlik alınır. */
function notificationIdOf(response: Notifications.NotificationResponse | null | undefined): { key: string; id: string } | null {
  const request = response?.notification?.request;
  const data = request?.content?.data as { notificationId?: unknown } | undefined;
  const id = typeof data?.notificationId === 'string' && /^[\w:.-]{1,191}$/.test(data.notificationId) ? data.notificationId : null;
  return id && request ? { key: `${request.identifier}:${response?.actionIdentifier ?? ''}`, id } : null;
}

/** Aboneliği güvenle kaldırır (desteklenmeyen ortamda `remove` olmayabilir). */
function release(subscription: { remove?: unknown } | null): void {
  if (subscription && typeof subscription.remove === 'function') (subscription.remove as () => void)();
}

function safely<T>(run: () => T): T | null {
  try {
    return run();
  } catch {
    return null;
  }
}

export function PushRuntime() {
  const bootstrap = useReadyBootstrap();
  const { api, token, selectWorkspace } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState<{ href: string; workspace: 'OD' | 'OK' | 'ODK' } | null>(null);
  const navigation = bootstrap.workspace?.navigation ?? null;
  const activeProduct = bootstrap.workspace?.activeProduct ?? null;
  const parent = useParentContext();
  const parentRef = useRef(parent);
  parentRef.current = parent;
  const ctx = useRef({ navigation, activeProduct, products: bootstrap.workspace?.products ?? [] });
  ctx.current = { navigation, activeProduct, products: bootstrap.workspace?.products ?? [] };

  const refreshCounters = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [...queryKeys.user(bootstrap.user.id), 'notifications'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap(sessionKeyFor(token)) }),
    ]);

  async function openFromPush(notificationId: string) {
    let item;
    try {
      item = await fetchSingleNotification(api, notificationId);
    } catch (error) {
      // Bildirim bu hesaba ait değil / silinmiş / gizli: güvenli geri dönüş.
      if (!(error instanceof ApiError) || error.kind === 'not_found') router.push('/notifications');
      return;
    }
    if (!item.read) {
      try {
        await endpoints.markNotificationsRead(api, item.id);
      } catch {
        // Okundu yazılamazsa yine de hedef açılabilir; sayaç bir sonraki yenilemede düzelir.
      }
    }
    await refreshCounters();
    if (bootstrap.user.role === 'PARENT' && !(await resolveParentChild(item.href))) {
      router.push('/notifications');
      return;
    }
    const target = mapNotificationHref(item.href, ctx.current.navigation);
    const href = expoHrefFor(target);
    if (href) {
      router.push(href as Href);
      return;
    }
    const workspace = workspaceForWebPath(item.href);
    const available = workspace && ctx.current.products.some((product) => product.code === workspace && product.state === 'ACTIVE');
    if (item.href && workspace && available && workspace !== ctx.current.activeProduct) {
      setPending({ href: item.href, workspace });
      try {
        await selectWorkspace(workspace);
      } catch {
        setPending(null);
        router.push('/notifications');
      }
      return;
    }
    router.push('/notifications');
  }

  /** Veli hedefi için doğru çocuğu seçer; güvenle belirlenemezse false. */
  async function resolveParentChild(href: string | null): Promise<boolean> {
    const navId = parentNavIdForWebPath(href);
    // Çocuk kapsamlı olmayan hedef (bildirimler, hesap) veya veli dışı yol.
    if (!navId || navId === 'account') return true;
    const context = parentRef.current;
    if (!context) return false;
    const studentId = parentStudentIdFromHref(href);
    if (studentId) return context.selectFromTrustedSource(studentId);
    // Kayıt çocuğu belirtmiyor: yalnız tek çocuk varsa belirsizlik yoktur.
    const fresh = await context.childrenQuery.refetch();
    const children = fresh.data?.children ?? [];
    if (children.length !== 1) return false;
    return context.selectFromTrustedSource(children[0].studentId);
  }

  // Çalışma alanı geçişinden sonra hedefi YENİ menüyle bir kez çöz.
  useEffect(() => {
    if (!pending || activeProduct !== pending.workspace) return;
    const href = expoHrefFor(mapNotificationHref(pending.href, navigation));
    setPending(null);
    router.push((href ?? '/notifications') as Href);
  }, [pending, activeProduct, navigation, router]);

  // Dokunma: arka plan / ön plan dinleyicisi + soğuk başlangıç yanıtı (bir kez).
  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse | null) => {
      const parsed = notificationIdOf(response);
      if (!parsed || handledResponses.has(parsed.key)) return;
      handledResponses.add(parsed.key);
      safely(() => Notifications.clearLastNotificationResponse());
      void openFromPush(parsed.id);
    };
    handle(safely(() => Notifications.getLastNotificationResponse()));
    const subscription = safely(() => Notifications.addNotificationResponseReceivedListener(handle));
    const received = safely(() => Notifications.addNotificationReceivedListener(() => void refreshCounters()));
    return () => {
      release(subscription);
      release(received);
    };
    // Dinleyiciler kullanıcı başına bir kez kurulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap.user.id]);

  // Kayıt yenileme: kullanıcı push'u açmış ve izin varsa (sessiz; istem açmaz) + token rotasyonu.
  useEffect(() => {
    void syncPushRegistration(api, bootstrap.user.id).catch(() => undefined);
    const tokenSubscription = safely(() =>
      Notifications.addPushTokenListener(() => {
        void syncPushRegistration(api, bootstrap.user.id, { force: true }).catch(() => undefined);
      }),
    );
    return () => release(tokenSubscription);
  }, [api, bootstrap.user.id]);

  // Rozet: sunucu okunmamış sayısı (başka cihazda okunanlar ön plana dönüşte / yenilemede eşitlenir).
  const unread = bootstrap.workspace?.unreadNotifications ?? 0;
  useEffect(() => {
    void setBadge(unread);
  }, [unread]);

  return null;
}
