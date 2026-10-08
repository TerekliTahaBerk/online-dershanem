import { Stack } from 'expo-router';

import { useDesign } from '@/design/theme';
import { color, font } from '@/design/tokens';

/** Hazır çalışma alanı: sekmeler + üzerine itilen ekranlar (başlıklı). */
export default function AppLayout() {
  const { product } = useDesign();
  return (
    <Stack
      screenOptions={{
        headerTintColor: product.accent,
        headerTitleStyle: { fontFamily: font.semibold, color: color.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: color.canvas },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="screen/[id]" options={{ title: '' }} />
      <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
      <Stack.Screen name="account/index" options={{ title: 'Hesap ve ayarlar' }} />
      <Stack.Screen name="account/sessions" options={{ title: 'Oturumlar' }} />
      <Stack.Screen name="account/password" options={{ title: 'Parola' }} />
    </Stack>
  );
}
