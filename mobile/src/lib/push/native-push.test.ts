/** Android push: FCM yapılandırması zorunlu; Android 13+ izin isteminden önce kanal oluşturulur. */
function load(extra: Record<string, unknown>) {
  const calls: string[] = [];
  jest.resetModules();
  jest.doMock('react-native', () => ({ Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default } }));
  jest.doMock('expo-device', () => ({ isDevice: true }));
  jest.doMock('expo-application', () => ({ nativeApplicationVersion: '1.0.0', applicationId: 'com.onlinedershanem.app' }));
  jest.doMock('expo-constants', () => ({ __esModule: true, ExecutionEnvironment: { StoreClient: 'storeClient' }, default: { executionEnvironment: 'standalone', expoConfig: { version: '1.0.0', extra: { eas: { projectId: 'bd75d82a-7152-41c5-bab8-9cd14e670231' }, ...extra } } } }));
  jest.doMock('expo-notifications', () => ({
    AndroidImportance: { DEFAULT: 3 },
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    getPermissionsAsync: jest.fn(async () => { calls.push('get'); return { granted: false, status: 'undetermined', canAskAgain: true }; }),
    setNotificationChannelAsync: jest.fn(async () => { calls.push('channel'); }),
    requestPermissionsAsync: jest.fn(async () => { calls.push('request'); return { granted: true, status: 'granted', canAskAgain: true }; }),
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('./native-push') as typeof import('./native-push');
  return { module, calls };
}

afterEach(() => jest.resetModules());

describe('Android push', () => {
  it('Firebase (google-services.json) derlemeye girmediyse push desteklenmez', () => {
    expect(load({}).module.pushSupport()).toEqual({ supported: false, reason: 'NO_FCM' });
    expect(load({ push: { androidFcm: true } }).module.pushSupport()).toEqual({ supported: true, projectId: 'bd75d82a-7152-41c5-bab8-9cd14e670231' });
  });

  it('izin isteminden önce bildirim kanalı oluşturulur (Android 13+)', async () => {
    const { module, calls } = load({ push: { androidFcm: true } });
    await expect(module.requestPermission()).resolves.toMatchObject({ status: 'granted' });
    expect(calls).toEqual(['get', 'channel', 'request']);
  });
});
