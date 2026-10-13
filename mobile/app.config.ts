import type { ConfigContext, ExpoConfig } from 'expo/config';

const optional = (name: string) => process.env[name]?.trim() || undefined;
const required = (name: string) => {
  const value = optional(name);
  if (!value) throw new Error(`Release configuration missing: ${name}`);
  return value;
};

/**
 * iOS gizlilik bildirimi (App Store "required reason API" şartı). Uygulama
 * izleme yapmaz (reklam/ATT/analitik SDK yok). API nedenleri Expo/React Native
 * modüllerinin kullandığı kategorilerdir: ayarlar (UserDefaults), dosya zaman
 * damgası (önbellek/paylaşım), açılış süresi (zamanlayıcı) ve disk alanı
 * (dosya sistemi). Toplanan veri türleri App Store Connect "App Privacy"
 * beyanıyla birlikte hukuk onayından sonra eklenir (m9-privacy-disclosures).
 */
const PRIVACY_MANIFEST = {
  NSPrivacyTracking: false,
  NSPrivacyTrackingDomains: [],
  NSPrivacyAccessedAPITypes: [
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['0A2A.1', '3B52.1', 'C617.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'] },
  ],
};

/** No identities or credentials are guessed. EAS native builds fail before signing. */
export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = optional('EXPO_PUBLIC_APP_ENV');
  // OTA exports must obey the same production/preview guard as native builds.
  const profile = optional('EAS_BUILD_PROFILE') ?? (environment === 'production' || environment === 'preview' ? environment : undefined);
  const nativeBuild = Boolean(profile || process.env.EAS_BUILD === 'true');
  const iosId = nativeBuild ? required('MOBILE_IOS_BUNDLE_ID') : optional('MOBILE_IOS_BUNDLE_ID');
  const androidId = nativeBuild ? required('MOBILE_ANDROID_PACKAGE') : optional('MOBILE_ANDROID_PACKAGE');
  const projectId = nativeBuild ? required('EAS_PROJECT_ID') : optional('EAS_PROJECT_ID');
  // Zorunlu güncelleme ekranındaki App Store bağlantısı (App Store Connect → Apple ID, yalnız rakam). Gizli değildir.
  const iosAppStoreId = optional('MOBILE_IOS_APP_STORE_ID');
  // Android push: Firebase istemci dosyası EAS "file" ortam değişkeni olarak verilir (yol). Gizli anahtar değildir; Git'e girmez.
  const googleServicesFile = optional('GOOGLE_SERVICES_JSON');
  if (iosAppStoreId && !/^\d{6,12}$/.test(iosAppStoreId)) throw new Error('Invalid MOBILE_IOS_APP_STORE_ID');
  if (projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) throw new Error('Invalid EAS_PROJECT_ID');
  if (iosId && !/^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(iosId)) throw new Error('Invalid iOS bundle identifier');
  if (androidId && !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(androidId)) throw new Error('Invalid Android package');
  if (nativeBuild) {
    if (!['development', 'preview', 'production'].includes(profile ?? '') || environment !== profile) throw new Error('Build profile and app environment must match');
    const api = new URL(required('EXPO_PUBLIC_API_URL'));
    const expected = new URL(required(profile === 'production' ? 'MOBILE_PRODUCTION_API_ORIGIN' : 'MOBILE_STAGING_API_ORIGIN'));
    if (api.protocol !== 'https:' || api.username || api.password || api.pathname !== '/' || api.search || api.hash || api.origin !== expected.origin) throw new Error('Build API must be the approved HTTPS origin');
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[|.*\.local$)/i.test(api.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(api.hostname)) throw new Error('Local API forbidden in native release profiles');
    const productionOrigin = optional('MOBILE_PRODUCTION_API_ORIGIN');
    if (profile !== 'production' && (['onlinedershanem.com', 'www.onlinedershanem.com'].includes(api.hostname) || (productionOrigin && api.origin === new URL(productionOrigin).origin))) throw new Error('Internal builds must use isolated staging');
    // Keep public bundle inputs deliberately small. Values are never printed.
    const publicKeys = new Set([
      'EXPO_PUBLIC_API_URL',
      'EXPO_PUBLIC_APP_ENV',
      'EXPO_PUBLIC_USE_STATIC',
      'EXPO_PUBLIC_PROJECT_ROOT',
    ]);
    const unexpectedPublicKeys = Object.keys(process.env).filter(
      (key) => key.startsWith('EXPO_PUBLIC_') && !publicKeys.has(key)
    );
    if (unexpectedPublicKeys.length > 0) {
      throw new Error(
        `Unexpected public environment variables: ${unexpectedPublicKeys.join(', ')}`
      );
    }
  }
  const releaseProfile = profile === 'preview' || profile === 'production';
  const suffix = environment === 'development' ? ' Dev' : environment === 'preview' ? ' Preview' : '';
  const name = `Online Dershanem${suffix}`;
  return {
    ...config,
    name,
    // Uygulama yalnız Türkçe: mağaza dil listesi ve sistem iletişim kutuları (bildirim izni, dosya seçici) Türkçe.
    locales: { tr: { ios: { CFBundleDisplayName: name }, android: { app_name: name } } },
    slug: config.slug ?? 'online-dershanem',
    runtimeVersion: { policy: 'fingerprint' },
    updates: projectId ? { url: `https://u.expo.dev/${projectId}`, enabled: true, checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0 } : { enabled: false },
    ios: {
      ...config.ios,
      ...(iosId ? { bundleIdentifier: iosId } : {}),
      infoPlist: { ...config.ios?.infoPlist, CFBundleDevelopmentRegion: 'tr', ...(releaseProfile ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: false } } : {}) },
      privacyManifests: PRIVACY_MANIFEST,
    },
    android: { ...config.android, ...(androidId ? { package: androidId } : {}), ...(googleServicesFile ? { googleServicesFile } : {}), ...(releaseProfile ? { blockedPermissions: [...(config.android?.blockedPermissions ?? []), 'android.permission.SYSTEM_ALERT_WINDOW'] } : {}) },
    extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}), ...(iosAppStoreId ? { store: { iosAppStoreId } } : {}), push: { androidFcm: Boolean(googleServicesFile) } },
  };
};
