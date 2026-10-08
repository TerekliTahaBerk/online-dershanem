import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'od_session_token';

/**
 * Oturum token'ı YALNIZ `expo-secure-store`'da (iOS Keychain / Android
 * Keystore) tutulur; AsyncStorage veya düz dosyaya yazılmaz. Cihaz kilidi
 * açıkken okunabilir (`AFTER_FIRST_UNLOCK`) ki arka plan senkronu (M5)
 * mümkün olsun; iCloud/yedek ile başka cihaza taşınmaz (`...THIS_DEVICE_ONLY`).
 *
 * Web önizlemesi desteklenmez (MD-17); orada kalıcı saklama bilerek yoktur.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const tokenStore = {
  async read(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY, OPTIONS);
    } catch {
      // Bozuk / erişilemeyen anahtar: oturum yokmuş gibi davran, kimliği tahmin etme.
      return null;
    }
  },
  async write(token: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.setItemAsync(TOKEN_KEY, token, OPTIONS);
  },
  async clear(): Promise<void> {
    if (Platform.OS === 'web') return;
    await SecureStore.deleteItemAsync(TOKEN_KEY, OPTIONS);
  },
};
