import { View } from 'react-native';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { PreviewReadOnlyContext } from '@/lib/auth/preview-context';
import { AdminOverlayBanner } from '@/features/admin/overlay-banner';
import { Stack } from 'expo-router';

import { useDesign } from '@/design/theme';
import { StepUpProvider } from '@/features/auth/step-up';
import { ParentContextProvider } from '@/features/parent/parent-context';
import { PushRuntime } from '@/features/push/push-runtime';
import { color, font } from '@/design/tokens';

/** Hazır çalışma alanı: sekmeler + üzerine itilen ekranlar (başlıklı). */
export default function AppLayout() {
  const { product, reduceMotion } = useDesign();
  const bootstrap = useReadyBootstrap();
  return (
    // M6: veli çocuk bağlamı (yalnız PARENT rolünde etkin; diğer rollerde geçirgen).
    // Faz 1: hassas yönetim işlemleri için native step-up (428 → kod → tek tekrar).
    <PreviewReadOnlyContext.Provider value={bootstrap.adminOverlay?.mode === 'PREVIEW'}>
    <View style={{ flex: 1 }}>
    <AdminOverlayBanner />
    <StepUpProvider>
    <ParentContextProvider>
      {/* M5: bildirim dokunuşu / soğuk başlangıç / rozet — yalnız hazır çalışma alanında. */}
      {!bootstrap.adminOverlay ? <PushRuntime /> : null}
      <Stack
      screenOptions={{
        animation: reduceMotion ? 'none' : 'default',
        headerTintColor: product.accent,
        headerTitleStyle: { fontFamily: font.semibold, color: color.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: color.canvas },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="screen/[id]" options={{ title: '' }} />
      <Stack.Protected guard={!bootstrap.adminOverlay}>
      <Stack.Screen name="notifications" options={{ title: 'Bildirimler' }} />
      <Stack.Screen name="account/profile" options={{ title: 'Öğrenci profilim' }} />
      <Stack.Screen name="account/index" options={{ title: 'Hesap ve ayarlar' }} />
      <Stack.Screen name="account/sessions" options={{ title: 'Oturumlar' }} />
      <Stack.Screen name="account/deletion" options={{ title: 'Hesap silme' }} />
      <Stack.Screen name="account/privacy" options={{ title: 'Gizlilik' }} />
      <Stack.Screen name="account/password" options={{ title: 'Parola' }} />
      <Stack.Screen name="account/notifications" options={{ title: 'Bildirim ayarları' }} />
      <Stack.Screen name="account/settings/index" options={{ title: 'Hesap ayarları' }} />
      <Stack.Screen name="account/settings/[section]" options={{ title: 'Ayar bölümü' }} />
      <Stack.Screen name="account/accessibility" options={{ title: 'Erişilebilirlik' }} />
      <Stack.Screen name="account/data-usage" options={{ title: 'Veri kullanımı' }} />
      <Stack.Screen name="account/security" options={{ title: 'İki adımlı doğrulama' }} />
      </Stack.Protected>
      <Stack.Screen name="od/assignment/[id]" options={{ title: 'Çalışma' }} />
      <Stack.Screen name="od/lesson/[id]" options={{ title: 'Ders' }} />
      <Stack.Screen name="od/review-recovery" options={{ title: 'Tekrar ve telafi' }} />
      <Stack.Screen name="od/mock-exam-editor" options={{ title: 'Dış deneme girişi' }} />
      <Stack.Screen name="yon/task/[id]" options={{ title: 'Görev' }} />
      <Stack.Screen name="odk/exam/[id]/index" options={{ title: 'Deneme' }} />
      <Stack.Screen name="odk/exam/[id]/result" options={{ title: 'Sonuç' }} />
      <Stack.Screen name="odk/manage/[id]" options={{ title: 'Deneme çalışma alanı' }} />
      {/* M7 öğretmen / koç detayları (StaffRouteGate + sunucu yetkisi). */}
      <Stack.Screen name="teacher/lesson/[id]" options={{ title: 'Ders' }} />
      <Stack.Screen name="teacher/education-editor" options={{ title: 'Eğitim editörü' }} />
      <Stack.Screen name="teacher/student/[id]" options={{ title: 'Öğrenci profili' }} />
      <Stack.Screen name="teacher/submission/[id]" options={{ title: 'Teslim' }} />
      <Stack.Screen name="coach/student/[id]" options={{ title: 'Öğrenci' }} />
      <Stack.Screen name="coach/session/[id]" options={{ title: 'Görüşme' }} />
      <Stack.Screen name="coach/plan/[id]" options={{ title: 'Plan' }} />
      {/* Faz 1 yönetim (AdminRouteGate + sunucu yetkisi). */}
      <Stack.Screen name="business/index" options={{ title: 'İşletme' }} />
      <Stack.Screen name="business/[slug]" options={{ title: 'İşletme' }} />
      <Stack.Screen name="business/conversation/[id]" options={{ title: 'Konuşma' }} />
      <Stack.Screen name="business/lead/[id]" options={{ title: 'Aday' }} />
      <Stack.Screen name="admin/preview" options={{ title: 'Panel önizlemesi' }} />
      <Stack.Screen name="admin/search" options={{ title: 'Ara' }} />
      <Stack.Screen name="admin/person/[id]" options={{ title: 'Kişi' }} />
      <Stack.Screen name="admin/student/[id]" options={{ title: 'Öğrenci 360' }} />
      <Stack.Screen name="admin/parents" options={{ title: 'Veliler' }} />
      <Stack.Screen name="admin/educators" options={{ title: 'Öğretmenler' }} />
      <Stack.Screen name="admin/group/[id]" options={{ title: 'Grup 360' }} />
      <Stack.Screen name="admin/group-create" options={{ title: 'Grup oluştur' }} />
      <Stack.Screen name="admin/metric/[metric]" options={{ title: 'Metrik detayı' }} />
      <Stack.Screen name="admin/order/[id]" options={{ title: 'Sipariş detayı' }} />
      <Stack.Screen name="admin/coaching" options={{ title: 'Koçluk operasyonu' }} />
      <Stack.Screen name="admin/coaching-session/[id]" options={{ title: 'Görüşme detayı' }} />
      <Stack.Screen name="admin/education-editor" options={{ title: 'Eğitim yönetimi' }} />
    </Stack>
    </ParentContextProvider>
    </StepUpProvider>
    </View>
    </PreviewReadOnlyContext.Provider>
  );
}
