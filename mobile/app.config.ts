import type { ConfigContext, ExpoConfig } from 'expo/config';

const optional = (name: string) => process.env[name]?.trim() || undefined;
const required = (name: string) => {
  const value = optional(name);
  if (!value) throw new Error(`Release configuration missing: ${name}`);
  return value;
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
  return {
    ...config,
    name: `Online Dershanem${suffix}`,
    slug: config.slug ?? 'online-dershanem',
    runtimeVersion: { policy: 'fingerprint' },
    updates: projectId ? { url: `https://u.expo.dev/${projectId}`, enabled: true, checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0 } : { enabled: false },
    ios: { ...config.ios, ...(iosId ? { bundleIdentifier: iosId } : {}), ...(releaseProfile ? { infoPlist: { ...config.ios?.infoPlist, NSAppTransportSecurity: { NSAllowsArbitraryLoads: false } } } : {}) },
    android: { ...config.android, ...(androidId ? { package: androidId } : {}), ...(releaseProfile ? { blockedPermissions: [...(config.android?.blockedPermissions ?? []), 'android.permission.SYSTEM_ALERT_WINDOW'] } : {}) },
    extra: { ...config.extra, ...(projectId ? { eas: { projectId } } : {}) },
  };
};
