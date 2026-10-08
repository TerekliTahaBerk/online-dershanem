/* global jest */
// Native modüllerin test sahteleri. Gerçek cihaz davranışı bu testlerde
// DOĞRULANMAZ (bkz. docs/mobile/m1-test-results.md).
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    __store: store,
  };
});

jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.0' }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => true), hideAsync: jest.fn(async () => true) }));

// lucide-react-native yalnız ESM (.mjs) yayınlar; testte ikonlar boş bileşendir.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
