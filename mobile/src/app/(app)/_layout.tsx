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
      <Stack.Screen name="od/assignment/[id]" options={{ title: 'Çalışma' }} />
      <Stack.Screen name="od/lesson/[id]" options={{ title: 'Ders' }} />
      <Stack.Screen name="od/review-recovery" options={{ title: 'Tekrar ve telafi' }} />
      <Stack.Screen name="yon/task/[id]" options={{ title: 'Görev' }} />
      <Stack.Screen name="odk/exam/[id]/index" options={{ title: 'Deneme' }} />
      <Stack.Screen name="odk/exam/[id]/result" options={{ title: 'Sonuç' }} />
    </Stack>
  );
}
