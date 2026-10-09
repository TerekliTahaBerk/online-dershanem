import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { APP_VERSION } from '@/config/app-info';
import type { DeviceRegistration } from '@/lib/api/push';

/**
 * expo-notifications üzerinde ince katman (M5).
 *
 * - İZİN İSTEMİ açılışta YAPILMAZ: yalnız kullanıcı ayarlardan "Bildirimleri
 *   aç" dediğinde (`requestPermission`). Reddedildikten sonra sistem tekrar
 *   sormaz (`canAskAgain=false`); uygulama bunu açıklar, ayarlara yönlendirir.
 * - Push token'ı CİHAZ DEPOLAMASINA YAZILMAZ; gerektiğinde Expo'dan yeniden
 *   alınır. Sunucuya yalnız kimlikli kayıt ucu üzerinden gider.
 * - EAS proje kimliği uygulama yapılandırmasından (`extra.eas.projectId`,
 *   `EAS_PROJECT_ID`) okunur; UYDURULMAZ. Yoksa push desteklenmiyor sayılır.
 */

export type PushSupport =
  | { supported: true; projectId: string }
  | { supported: false; reason: 'SIMULATOR' | 'EXPO_GO' | 'NO_PROJECT_ID' | 'WEB' };

export function pushSupport(): PushSupport {
  if (Platform.OS === 'web') return { supported: false, reason: 'WEB' };
  if (!Device.isDevice) return { supported: false, reason: 'SIMULATOR' };
  // Expo Go uzak push'u (SDK 53+ Android) desteklemez; geliştirme derlemesi gerekir.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return { supported: false, reason: 'EXPO_GO' };
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return { supported: false, reason: 'NO_PROJECT_ID' };
  return { supported: true, projectId };
}

export type PermissionState = { status: 'granted' | 'denied' | 'undetermined'; canAskAgain: boolean; provisional: boolean };

function toState(response: Notifications.NotificationPermissionsStatus): PermissionState {
  const provisional = response.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  return { status: response.granted || provisional ? 'granted' : response.status === 'denied' ? 'denied' : 'undetermined', canAskAgain: response.canAskAgain, provisional };
}

export async function getPermission(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

/** Yalnız açık kullanıcı eylemiyle çağrılır. Zaten reddedilmişse sistem istemi tekrar açılmaz. */
export async function requestPermission(): Promise<PermissionState> {
  const current = await getPermission();
  if (current.status === 'granted' || !current.canAskAgain) return current;
  return toState(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } }));
}

/** Android 8+: token almadan önce kanal oluşturulmalı. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', { name: 'Bildirimler', importance: Notifications.AndroidImportance.DEFAULT });
}

function appEnvironment(): DeviceRegistration['appEnvironment'] {
  const value = (process.env.EXPO_PUBLIC_APP_ENV ?? '').trim();
  return value === 'production' || value === 'preview' || value === 'development' ? value : __DEV__ ? 'development' : null;
}

/** Desteklenen ortamda, izin verilmişken kayıt bilgisi; aksi halde null. */
export async function currentRegistration(permission: PermissionState): Promise<DeviceRegistration | null> {
  const support = pushSupport();
  if (!support.supported || permission.status !== 'granted' || !APP_VERSION) return null;
  await ensureAndroidChannel();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: support.projectId });
  return {
    token,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    appVersion: APP_VERSION.split(/[^0-9.]/)[0],
    projectId: support.projectId,
    appEnvironment: appEnvironment(),
    permissionStatus: permission.provisional ? 'provisional' : 'granted',
  };
}

/** Çıkış / hesap değişimi: rozet ve sistem bildirim merkezindeki bu uygulamanın bildirimleri temizlenir. */
export async function resetLocalPushState(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // Platform desteklemiyorsa yok sayılır.
  }
}

export async function setBadge(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Rozet desteklenmiyorsa yok sayılır.
  }
}
