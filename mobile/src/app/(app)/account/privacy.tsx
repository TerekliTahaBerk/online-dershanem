import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Banner, Button, PageHeader, Screen, Text } from '@/design/primitives';
import { WEB_BASE_URL } from '@/config/app-info';

export default function PrivacyScreen() {
  const [error, setError] = useState(false);
  async function open() {
    try {
      if (!WEB_BASE_URL) throw new Error('Configuration unavailable');
      await WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/gizlilik`);
    } catch { setError(true); }
  }
  return <Screen>
    <PageHeader title="Gizlilik" />
    <Text>Hesap, eğitim ve isteğe bağlı bildirim verilerinin işlenmesi hakkında web sitesindeki güncel gizlilik açıklamasını inceleyebilirsiniz.</Text>
    {error ? <Banner tone="critical">Gizlilik sayfası açılamadı. Bağlantınızı kontrol edip tekrar deneyin.</Banner> : null}
    <Button label="Gizlilik politikasını aç" onPress={() => void open()} />
  </Screen>;
}
