import type { MobileNotificationPreferences } from '@contracts/push';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Switch, View } from 'react-native';

import { Banner, Button, EmptyState, ErrorState, PageHeader, Row, Screen, Section, Skeleton, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { space } from '@/design/tokens';
import { ApiError } from '@/lib/api/errors';
import { fetchNotificationPreferences, patchNotificationPreferences } from '@/lib/api/push';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { getPermission, pushSupport, requestPermission, type PermissionState } from '@/lib/push/native-push';
import { syncPushRegistration, unregisterCurrentDevice } from '@/lib/push/registration';
import { queryKeys } from '@/lib/query/keys';

/**
 * BİLDİRİM AYARLARI (M5). Sunucu tercihi (`pushEnabled`) ile işletim sistemi
 * izni AYRI gösterilir. İzin istemi yalnız kullanıcı "Telefon bildirimlerini
 * aç" dediğinde, açıklamadan sonra açılır; reddedildiyse tekrar istenmez,
 * sistem ayarlarına yönlendirilir. Tercihler GELECEK gönderimleri etkiler;
 * teslim garanti edilmez. Değişiklikler kısmi gönderilir (web alanlarının
 * üzerine yazılmaz).
 */
const CATEGORIES: { key: keyof MobileNotificationPreferences; title: string; subtitle: string }[] = [
  { key: 'assignment', title: 'Çalışmalar ve ödevler', subtitle: 'Yeni çalışma ve teslim hatırlatmaları' },
  { key: 'lessonSummary', title: 'Dersler ve koçluk', subtitle: 'Ders hatırlatmaları, ders özetleri, görüşme güncellemeleri' },
  { key: 'absence', title: 'Devamsızlık', subtitle: 'Derse katılım bildirimleri' },
  { key: 'weeklyDigest', title: 'Haftalık özet', subtitle: 'Yayınlanan haftalık özetler' },
  { key: 'examUpdates', title: 'Deneme Ligi', subtitle: 'Deneme hatırlatması, sonuç ve cevap anahtarı' },
];

const QUIET_PRESETS: { label: string; start: number | null; end: number | null }[] = [
  { label: 'Kapalı', start: null, end: null },
  { label: '22:00 – 07:00', start: 22 * 60, end: 7 * 60 },
  { label: '23:00 – 08:00', start: 23 * 60, end: 8 * 60 },
];

const SUPPORT_COPY: Record<string, string> = {
  SIMULATOR: 'Telefon bildirimleri yalnız gerçek bir cihazda çalışır.',
  EXPO_GO: 'Bu geliştirme ortamı (Expo Go) telefon bildirimlerini desteklemiyor; geliştirme derlemesi gerekir.',
  NO_PROJECT_ID: 'Bu uygulama derlemesi telefon bildirimleri için yapılandırılmamış.',
  WEB: 'Telefon bildirimleri yalnız mobil uygulamada kullanılabilir.',
};

export default function NotificationSettingsScreen() {
  const bootstrap = useReadyBootstrap();
  const { api } = useSession();
  const queryClient = useQueryClient();
  const { product } = useDesign();
  const key = [...queryKeys.user(bootstrap.user.id), 'notification-preferences'];
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => fetchNotificationPreferences(api, signal) });
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'critical' | 'warning' | 'info'; text: string } | null>(null);
  const support = pushSupport();

  // İzin durumu: açılışta ve uygulama ön plana dönünce (kullanıcı sistem ayarlarından değiştirmiş olabilir).
  useEffect(() => {
    void getPermission().then(setPermission).catch(() => undefined);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getPermission().then(setPermission).catch(() => undefined);
    });
    return () => subscription.remove();
  }, []);

  const save = useMutation({
    mutationFn: (patch: Partial<MobileNotificationPreferences>) => patchNotificationPreferences(api, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  async function update(patch: Partial<MobileNotificationPreferences>, success?: string) {
    setMessage(null);
    try {
      await save.mutateAsync(patch);
      if (success) setMessage({ tone: 'success', text: success });
    } catch (error) {
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Tercih kaydedilemedi.' });
    }
  }

  async function enablePush() {
    setMessage(null);
    const state = await requestPermission();
    setPermission(state);
    if (state.status !== 'granted') {
      setMessage({ tone: 'warning', text: 'Telefon bildirimleri için izin verilmedi. İstersen sistem ayarlarından açabilirsin; uygulama içi bildirimler çalışmaya devam eder.' });
      return;
    }
    try {
      await save.mutateAsync({ pushEnabled: true });
      const result = await syncPushRegistration(api, bootstrap.user.id, { force: true });
      setMessage(result === 'REGISTERED' || result === 'ALREADY' ? { tone: 'success', text: 'Telefon bildirimleri açıldı. Gönderim zamanlaması ağ ve cihaz koşullarına bağlıdır.' } : { tone: 'warning', text: 'Tercih kaydedildi, ancak bu cihaz kaydedilemedi.' });
    } catch (error) {
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Telefon bildirimleri açılamadı. Bağlantını kontrol et.' });
    }
  }

  async function disablePush() {
    setMessage(null);
    try {
      await save.mutateAsync({ pushEnabled: false });
      await unregisterCurrentDevice(api).catch(() => undefined);
      setMessage({ tone: 'success', text: 'Telefon bildirimleri kapatıldı. Uygulama içi bildirimler sürüyor.' });
    } catch (error) {
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Tercih kaydedilemedi.' });
    }
  }

  if (bootstrap.user.role !== 'STUDENT' && bootstrap.user.role !== 'PARENT') {
    return (
      <Screen>
        <EmptyState title="Bildirim ayarları bu hesap için mobilde açık değil." />
      </Screen>
    );
  }

  return (
    <Screen testID="notification-settings">
      <PageHeader title="Bildirim ayarları" description="Tercihler bundan sonraki bildirimleri etkiler. Telefon bildirimlerinde ad, not veya puan gibi kişisel ayrıntılar gösterilmez." />
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {query.isPending ? (
        <Skeleton rows={6} />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Section title="Telefon bildirimleri" first>
            {!support.supported ? (
              <Text tone="secondary">{SUPPORT_COPY[support.reason]}</Text>
            ) : (
              <>
                <Row title="Sistem izni" meta={permission?.status === 'granted' ? 'Verildi' : permission?.status === 'denied' ? 'Reddedildi' : 'Henüz sorulmadı'} />
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">Telefon bildirimleri</Text>
                    <Text tone="muted" variant="meta">Açarsan, yeni bildirimler telefonuna da gönderilir. Sessiz saatlerde gönderim ertelenir.</Text>
                  </View>
                  <Switch
                    value={Boolean(query.data?.pushEnabled) && permission?.status === 'granted'}
                    disabled={save.isPending || (permission?.status === 'denied' && !permission.canAskAgain && !query.data?.pushEnabled)}
                    onValueChange={(next) => void (next ? enablePush() : disablePush())}
                    trackColor={{ true: product.accent }}
                    accessibilityLabel="Telefon bildirimleri"
                    testID="push-toggle"
                  />
                </View>
                {permission?.status === 'denied' ? (
                  <View style={styles.hint}>
                    <Text tone="secondary" variant="secondary">İzin sistem ayarlarında kapalı. Uygulama tekrar sormaz; açmak için sistem ayarlarını kullan.</Text>
                    <Button label="Sistem ayarlarını aç" variant="secondary" onPress={() => void Linking.openSettings()} />
                  </View>
                ) : null}
              </>
            )}
          </Section>
          <Section title="Kategoriler">
            {CATEGORIES.map((item) => (
              <View key={item.key} style={styles.row}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{item.title}</Text>
                  <Text tone="muted" variant="meta">{item.subtitle}</Text>
                </View>
                <Switch value={Boolean(query.data?.[item.key])} disabled={save.isPending} onValueChange={(next) => void update({ [item.key]: next })} trackColor={{ true: product.accent }} accessibilityLabel={item.title} testID={`pref-${item.key}`} />
              </View>
            ))}
          </Section>
          <Section title="Sessiz saatler">
            <Text tone="muted" variant="meta">Bu saatlerde telefon bildirimi gönderilmez; hâlâ geçerliyse sonradan gönderilir (İstanbul saati).</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Sessiz saatler">
              {QUIET_PRESETS.map((preset) => (
                <Row
                  key={preset.label}
                  title={preset.label}
                  selected={query.data?.quietStartMinute === preset.start && query.data?.quietEndMinute === preset.end}
                  onPress={() => void update({ quietStartMinute: preset.start, quietEndMinute: preset.end }, 'Sessiz saatler kaydedildi.')}
                  testID={`quiet-${preset.start ?? 'off'}`}
                />
              ))}
            </View>
          </Section>
          <Section title="Günlük özet">
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text variant="bodyStrong">Günün gelişmeleri tek bildirimde</Text>
                <Text tone="muted" variant="meta">{"Açıkken hatırlatmalar 18:00'de tek özet olarak gelir."}</Text>
              </View>
              <Switch
                value={Boolean(query.data?.dailyDigest)}
                disabled={save.isPending}
                onValueChange={(next) => void update(next ? { dailyDigest: true, dailyDigestMinute: query.data?.dailyDigestMinute ?? 18 * 60 } : { dailyDigest: false })}
                trackColor={{ true: product.accent }}
                accessibilityLabel="Günlük özet"
                testID="pref-dailyDigest"
              />
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
  flex: { flex: 1 },
  hint: { gap: space[2], marginTop: space[2] },
});
