import { resolveApiBaseUrl, resolveStoreUrls } from './app-info';

describe('yayın yapılandırması', () => {
  it('mağaza bağlantısı: Android paketten, iOS sayısal App Store kimliğinden; bilinmiyorsa yok', () => {
    expect(resolveStoreUrls('android', { androidPackage: 'com.onlinedershanem.app' })).toEqual({ primary: 'market://details?id=com.onlinedershanem.app', fallback: 'https://play.google.com/store/apps/details?id=com.onlinedershanem.app' });
    expect(resolveStoreUrls('ios', { iosAppStoreId: '6740000000' })).toEqual({ primary: 'itms-apps://apps.apple.com/app/id6740000000', fallback: 'https://apps.apple.com/app/id6740000000' });
    expect(resolveStoreUrls('ios', { iosAppStoreId: undefined })).toBeNull();
    expect(resolveStoreUrls('ios', { iosAppStoreId: 'id123' })).toBeNull();
    expect(resolveStoreUrls('android', { androidPackage: null })).toBeNull();
    expect(resolveStoreUrls('web', { androidPackage: 'com.onlinedershanem.app', iosAppStoreId: '6740000000' })).toBeNull();
  });

  it('üretim API kökü yalnız HTTPS ve genel adres; yerel/özel adres reddedilir', () => {
    expect(resolveApiBaseUrl('https://www.onlinedershanem.com/', false)).toBe('https://www.onlinedershanem.com');
    expect(resolveApiBaseUrl('http://www.onlinedershanem.com', false)).toBeNull();
    expect(resolveApiBaseUrl('https://192.168.1.10', false)).toBeNull();
    expect(resolveApiBaseUrl('https://api.example.com/v1', false)).toBeNull();
    expect(resolveApiBaseUrl(undefined, false)).toBeNull();
  });
});
