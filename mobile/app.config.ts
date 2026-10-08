import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Ortam farkında Expo yapılandırması (`app.json` temel alınır).
 *
 * Kalıcı mağaza kimlikleri (iOS bundle identifier, Android package, EAS
 * proje kimliği) HENÜZ VERİLMEDİ ve burada UYDURULMAZ. Değerler ortamdan
 * okunur; yoksa alan hiç yazılmaz. Böylece Expo Go / geliştirme çalışır,
 * mağaza derlemesi ise kimlik eksik olduğu için açıkça başarısız olur.
 * Kurulum adımları: docs/mobile/m1-implementation-report.md §Yapılandırma.
 */
function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosBundleIdentifier = optional('MOBILE_IOS_BUNDLE_ID');
  const androidPackage = optional('MOBILE_ANDROID_PACKAGE');
  const easProjectId = optional('EAS_PROJECT_ID');
  return {
    ...config,
    name: config.name ?? 'Online Dershanem',
    slug: config.slug ?? 'online-dershanem',
    ios: { ...config.ios, ...(iosBundleIdentifier ? { bundleIdentifier: iosBundleIdentifier } : {}) },
    android: { ...config.android, ...(androidPackage ? { package: androidPackage } : {}) },
    extra: { ...config.extra, ...(easProjectId ? { eas: { projectId: easProjectId } } : {}) },
  };
};
