import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ReactNode } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, Text } from '@/design/primitives';
import { color, radius, space } from '@/design/tokens';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { newUuid } from '@/lib/ids';
import { queryKeys } from '@/lib/query/keys';
import { hasNavItem } from '@/navigation/od-targets';

import { openOnWeb } from '../shell/web-continuation';
import { keyForWrite, type PendingWrite } from '../od/assignments/model';

export { QueryView, useOnline, usePullToRefresh } from '../shared/workspace-data';

/**
 * PERSONEL (M7) ortak katmanı.
 *
 *  - Menü / çalışma alanı YETKİ DEĞİLDİR: her istek sunucuda rol + ürün +
 *    personel izni + kaynak ilişkisiyle doğrulanır. Burada yalnız görünürlük.
 *  - Anahtarlar `['user', id, 'workspace', ürün, 'staff', 'TEACHER', kaynak]`.
 *  - Yazmalar yalnız ÇEVRİMİÇİ; başarı yalnız sunucu onayıyla gösterilir.
 */
export type StaffProduct = 'OD' | 'OK' | 'ODK';

export function useStaffQuery<T>(product: StaffProduct, resource: string, fetcher: (api: ApiClient, signal: AbortSignal) => Promise<T>, options: { params?: Record<string, string | number | null>; enabled?: boolean; gcTime?: number } = {}) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const active = bootstrap.user.role === 'TEACHER' && bootstrap.workspace?.activeProduct === product;
  return useQuery({
    queryKey: queryKeys.staffResource(bootstrap.user.id, product, resource, options.params),
    queryFn: ({ signal }) => fetcher(api, signal),
    enabled: active && (options.enabled ?? true),
    ...(options.gcTime !== undefined ? { gcTime: options.gcTime } : {}),
  });
}

/** Sunucu onayından SONRA bu personelin ürün kapsamındaki görünümleri yenilenir. */
export function useInvalidateStaff(product: StaffProduct) {
  const client = useQueryClient();
  const bootstrap = useReadyBootstrap();
  return () => client.invalidateQueries({ queryKey: queryKeys.staff(bootstrap.user.id, product) });
}

/**
 * Personel detay rotalarının kapısı: TEACHER + doğru çalışma alanı + yetkili
 * menüde ilgili öğe. Derin bağlantıyla gelinse de başka durumda güvenli boş
 * durum. Sunucu ayrıca her istekte yetkiyi doğrular.
 */
export function StaffRouteGate({ product, navId, children }: { product: StaffProduct; navId: string; children: ReactNode }) {
  const bootstrap = useReadyBootstrap();
  const allowed = bootstrap.user.role === 'TEACHER' && bootstrap.workspace?.activeProduct === product && hasNavItem(bootstrap.workspace.navigation, navId);
  if (!allowed) return <EmptyState title="Bu bölüm bu çalışma alanında yok" body="Bağlantı başka bir çalışma alanına ait olabilir veya erişimin değişmiş olabilir." />;
  return <>{children}</>;
}

/**
 * Aynı MANTIKSAL gönderim için sabit tekrar anahtarı. Ağ hatasında anahtar
 * korunur (sunucu ikinci kez uygulamaz); içerik değişince yeni anahtar.
 */
export function useStableKey<I>(same: (left: I, right: I) => boolean) {
  const pending = useRef<PendingWrite<I>>(null);
  return {
    keyFor(input: I): string {
      const write = keyForWrite(pending.current, input, same, newUuid);
      pending.current = write.pending;
      return write.key;
    },
    settle(error?: unknown) {
      // Belirsiz sonuçta (ağ / zaman aşımı) anahtar korunur.
      const uncertain = error instanceof ApiError && (error.transient || error.kind === 'invalid_response');
      if (!uncertain) pending.current = null;
    },
  };
}

export type WriteState = { tone: 'success' | 'warning' | 'critical'; message: string; stepUp?: boolean } | null;

/** Yazma hatası → kullanıcıya açık durum. 409 / 428 / çevrimdışı ayrı ele alınır. */
export function writeError(error: unknown, conflictMessage: string): WriteState {
  if (error instanceof ApiError) {
    if (error.kind === 'conflict') return { tone: 'warning', message: conflictMessage };
    if (error.kind === 'step_up_required') return { tone: 'warning', message: 'Bu işlem için kimliğinizi yeniden doğrulamanız gerekiyor. Mobilde ek doğrulama yok; işlemi web panelinden tamamlayın.', stepUp: true };
    if (error.kind === 'network' || error.kind === 'timeout') return { tone: 'critical', message: 'Bağlantı kurulamadı. Kayıt yapılmadı; bağlantı gelince tekrar deneyin.' };
    return { tone: 'critical', message: error.message };
  }
  return { tone: 'critical', message: 'İşlem kaydedilemedi. Tekrar deneyin.' };
}

export function WriteBanner({ state, webPath }: { state: WriteState; webPath?: string }) {
  if (!state) return null;
  return (
    <Banner tone={state.tone} action={state.stepUp && webPath ? <Button label="Web'de aç" variant="secondary" onPress={() => void openOnWeb(webPath)} /> : undefined}>
      {state.message}
    </Banner>
  );
}

export function OfflineWriteNotice({ online }: { online: boolean }) {
  if (online) return null;
  return <Banner tone="warning" title="Çevrimdışısın">Kaydetmek için bağlantı gerekiyor. Yazdıkların bu ekranda kalır; bağlantı gelince kaydedebilirsin.</Banner>;
}

/** Önemli yazmalar öncesi sistem onay iletişim kutusu. */
export function confirmAction(input: { title: string; message: string; confirmLabel: string; destructive?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(input.title, input.message, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
      { text: input.confirmLabel, style: input.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** Yalnız sunucunun döndürdüğü HTTPS bağlantı sistem tarayıcısında açılır; loglanmaz. */
export function isHttps(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Native tarih + saat seçimi (iOS satır içi, Android sistem iletişim kutusu). */
export function DateTimeField({ label, value, onChange, minimumDate, maximumDate, mode = 'datetime' }: { label: string; value: Date; onChange: (next: Date) => void; minimumDate?: Date; maximumDate?: Date; mode?: 'datetime' | 'date' }) {
  const [androidStep, setAndroidStep] = useState<'date' | 'time' | null>(null);
  const handle = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type !== 'set' || !next) return setAndroidStep(null);
      if (androidStep === 'date' && mode === 'datetime') {
        const merged = new Date(value);
        merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
        onChange(merged);
        return setAndroidStep('time');
      }
      setAndroidStep(null);
    }
    if (next) onChange(next);
  };
  return (
    <View style={styles.field}>
      <Text variant="label" tone="secondary">{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker value={value} mode={mode} display="compact" locale="tr-TR" minimumDate={minimumDate} maximumDate={maximumDate} onChange={handle} />
      ) : (
        <>
          <Button label={formatShortDateTime(value)} variant="secondary" onPress={() => setAndroidStep('date')} />
          {androidStep ? <DateTimePicker value={value} mode={androidStep} minimumDate={minimumDate} maximumDate={maximumDate} onChange={handle} /> : null}
        </>
      )}
    </View>
  );
}

export const staffStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  card: { gap: space[2], backgroundColor: color.canvas, borderWidth: 1, borderColor: color.border, borderRadius: radius.card, padding: space[4] },
  gap: { gap: space[3] },
  input: { minHeight: 96, textAlignVertical: 'top' },
});

const styles = StyleSheet.create({ field: { gap: space[1] } });
