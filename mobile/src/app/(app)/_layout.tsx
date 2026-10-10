import { Stack } from 'expo-router';

import { useDesign } from '@/design/theme';
import { ParentContextProvider } from '@/features/parent/parent-context';
import { PushRuntime } from '@/features/push/push-runtime';
import { color, font } from '@/design/tokens';

/** Hazır çalışma alanı: sekmeler + üzerine itilen ekranlar (başlıklı). */
export default function AppLayout() {
  const { product } = useDesign();
  return (
    // M6: veli çocuk bağlamı (yalnız PARENT rolünde etkin; diğer rollerde geçirgen).
    <ParentContextProvider>
      {/* M5: bildirim dokunuşu / soğuk başlangıç / rozet — yalnız hazır çalışma alanında. */}
      <PushRuntime />
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
      <Stack.Screen name="account/deletion" options={{ title: 'Hesap silme' }} />
      <Stack.Screen name="account/privacy" options={{ title: 'Gizlilik' }} />
      <Stack.Screen name="account/password" options={{ title: 'Parola' }} />
      <Stack.Screen name="account/notifications" options={{ title: 'Bildirim ayarları' }} />
      <Stack.Screen name="od/assignment/[id]" options={{ title: 'Çalışma' }} />
      <Stack.Screen name="od/lesson/[id]" options={{ title: 'Ders' }} />
      <Stack.Screen name="od/review-recovery" options={{ title: 'Tekrar ve telafi' }} />
      <Stack.Screen name="yon/task/[id]" options={{ title: 'Görev' }} />
      <Stack.Screen name="odk/exam/[id]/index" options={{ title: 'Deneme' }} />
      <Stack.Screen name="odk/exam/[id]/result" options={{ title: 'Sonuç' }} />
      {/* M7 öğretmen / koç detayları (StaffRouteGate + sunucu yetkisi). */}
      <Stack.Screen name="teacher/lesson/[id]" options={{ title: 'Ders' }} />
      <Stack.Screen name="teacher/submission/[id]" options={{ title: 'Teslim' }} />
      <Stack.Screen name="coach/student/[id]" options={{ title: 'Öğrenci' }} />
      <Stack.Screen name="coach/session/[id]" options={{ title: 'Görüşme' }} />
      <Stack.Screen name="coach/plan/[id]" options={{ title: 'Plan' }} />
    </Stack>
    </ParentContextProvider>
  );
}
