import type { MobileParentChild, ParentNavId } from '@contracts/parent';
import type { UseQueryResult } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, ErrorState, PageHeader, Row, Screen, Skeleton, Text } from '@/design/primitives';
import { color, radius, space, touchTarget } from '@/design/tokens';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { expoHrefFor, targetForNavId } from '@/navigation/route-map';

import { QueryView, usePullToRefresh } from '../shared/workspace-data';
import { useParentContext } from './parent-context';

export { usePullToRefresh };

const PRODUCT_LABEL = { OD: 'onlinedershanem.', OK: 'Yön Koçluk', ODK: 'Deneme Ligi' } as const;

export function productList(products: readonly ('OD' | 'OK' | 'ODK')[]): string {
  return products.length ? products.map((code) => PRODUCT_LABEL[code]).join(' · ') : 'Açık üyelik yok';
}

/**
 * Seçili çocuğun bağlam satırı: "Öğrenci: Ad" (§ veli her ekranda kimin
 * verisine baktığını görür). Birden çok çocuk varsa "Değiştir" ile sade bir
 * alt sayfa açılır; tek çocukta seçici gösterilmez.
 */
export function ChildBar() {
  const context = useParentContext();
  const [open, setOpen] = useState(false);
  if (!context?.selected) return null;
  const { selected, children } = context;
  const many = children.length > 1;
  return (
    <>
      <Pressable
        testID="parent-child-bar"
        accessibilityRole={many ? 'button' : 'text'}
        accessibilityLabel={`Öğrenci: ${selected.name}`}
        accessibilityHint={many ? 'Bağlı öğrencileri listeler' : undefined}
        disabled={!many}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.bar, pressed && many && { backgroundColor: color.pressed }]}>
        <Text tone="muted" variant="meta">Öğrenci</Text>
        <Text variant="bodyStrong" style={styles.flex}>{selected.name}</Text>
        {many ? <Text tone="muted" variant="meta">Değiştir</Text> : null}
      </Pressable>
      <ChildPicker visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ChildPicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const context = useParentContext();
  if (!context) return null;
  return (
    <BottomSheet visible={visible} title="Öğrenci seç" onClose={onClose}>
      {context.children.map((child) => (
        <Row
          key={child.studentId}
          testID={`parent-child-${child.studentId}`}
          title={child.name}
          subtitle={productList(child.products)}
          selected={child.studentId === context.selected?.studentId}
          onPress={() => {
            context.selectChild(child.studentId);
            onClose();
          }}
        />
      ))}
    </BottomSheet>
  );
}

/** Çocuk seçimi gerektiğinde (erişim değişti / bildirim belirsiz) tam ekran seçim listesi. */
function ChildSelection({ revoked }: { revoked: boolean }) {
  const context = useParentContext();
  if (!context) return null;
  return (
    <View style={styles.gap}>
      {revoked ? (
        <Banner tone="warning" title="Öğrenci erişimi değişti">
          Seçili öğrencinin bilgileri artık bu hesapla paylaşılmıyor. Lütfen görmek istediğiniz öğrenciyi seçin.
        </Banner>
      ) : (
        <Text tone="secondary">Hangi öğrencinizin bilgilerini görmek istersiniz?</Text>
      )}
      {context.children.map((child: MobileParentChild) => (
        <Row key={child.studentId} testID={`parent-select-${child.studentId}`} title={child.name} subtitle={productList(child.products)} onPress={() => context.selectChild(child.studentId)} />
      ))}
    </View>
  );
}

function NoChildren({ revoked }: { revoked: boolean }) {
  const bootstrap = useReadyBootstrap();
  const preparing = (bootstrap.workspace?.products ?? []).some((product) => product.state === 'PREPARING');
  if (preparing) {
    return <EmptyState title="Öğrenci hesabı hazırlanıyor" body="Ödemeniz alındı, teşekkür ederiz. Öğrenci hesabı açılır açılmaz bilgileri burada görebileceksiniz; bu bir hata değil, kısa bir hazırlık süreci." />;
  }
  return (
    <EmptyState
      title={revoked ? 'Öğrenci erişimi değişti' : 'Henüz bağlı öğrenci yok'}
      body={revoked ? 'Bu hesapla paylaşılan bir öğrenci bilgisi kalmadı. Bir yanlışlık olduğunu düşünüyorsanız eğitim koordinatörünüz hemen yardımcı olur.' : 'Hesabınız öğrencinizle eşleştirildiğinde bilgilerini burada görebilirsiniz.'}
    />
  );
}

type ParentScreenProps = {
  title: string;
  description?: string;
  testID: string;
  refresh?: { refreshing: boolean; onRefresh: () => void };
  children: (child: MobileParentChild) => ReactNode;
};

/**
 * Veli ekran kabuğu: bağlam durumunu (yükleniyor / hata / çocuk yok /
 * seçim gerekli) ele alır; içerik YALNIZ bir çocuk seçiliyken çizilir.
 */
export function ParentScreen({ title, description, testID, refresh, children }: ParentScreenProps) {
  const context = useParentContext();
  const childrenRefresh = usePullToRefresh(async () => context?.childrenQuery.refetch());
  if (!context) {
    return (
      <Screen testID={testID}>
        <EmptyState title="Bu bölüm veli hesabı içindir" />
      </Screen>
    );
  }
  const ready = context.status === 'ready' && context.selected;
  const activeRefresh = ready && refresh ? refresh : childrenRefresh;
  return (
    <Screen refreshing={activeRefresh.refreshing} onRefresh={activeRefresh.onRefresh} testID={testID}>
      <PageHeader title={title} description={description} context={ready ? <ChildBar /> : undefined} />
      {context.status === 'loading' ? <Skeleton rows={4} /> : null}
      {context.status === 'error' ? <ErrorState error={context.childrenQuery.error} onRetry={() => void context.childrenQuery.refetch()} /> : null}
      {context.status === 'no-children' ? <NoChildren revoked={context.revoked} /> : null}
      {context.status === 'select' ? <ChildSelection revoked={context.revoked} /> : null}
      {ready ? children(context.selected!) : null}
    </Screen>
  );
}

/**
 * Çocuk kapsamlı sorgu görünümü. Yanıttaki `studentId` seçili çocukla
 * eşleşmiyorsa (ör. yarış) veri GÖSTERİLMEZ — başka çocuğun verisi o çocuğun
 * adı altında asla çizilmez.
 */
export function ParentQueryView<T extends { studentId: string }>({ query, child, children, disabledTitle }: { query: UseQueryResult<T>; child: MobileParentChild; children: (data: T) => ReactNode; disabledTitle?: string }) {
  return (
    <QueryView query={query} disabledTitle={disabledTitle}>
      {(data) => (data.studentId === child.studentId ? children(data) : <Skeleton rows={3} />)}
    </QueryView>
  );
}

/** Sunucu menü kimliği → yetkili native hedef (yoksa null; keyfi web adresi açılmaz). */
export function useParentNav() {
  const bootstrap = useReadyBootstrap();
  const router = useRouter();
  const navigation = bootstrap.workspace?.navigation ?? null;
  const hrefFor = (navId: ParentNavId | null): string | null => (navId && navigation ? expoHrefFor(targetForNavId(navigation, navId)) : null);
  return {
    hrefFor,
    open: (navId: ParentNavId | null) => {
      const href = hrefFor(navId);
      if (href) router.push(href as Href);
    },
  };
}

export function NavButton({ navId, label, testID }: { navId: ParentNavId; label: string; testID?: string }) {
  const nav = useParentNav();
  if (!nav.hrefFor(navId)) return null;
  return <Button label={label} variant="secondary" onPress={() => nav.open(navId)} testID={testID} />;
}

export const parentStyles = StyleSheet.create({
  card: { gap: space[2], backgroundColor: color.canvas, borderWidth: 1, borderColor: color.border, borderRadius: radius.card, padding: space[4] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  gap: { gap: space[2] },
});

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: touchTarget, paddingHorizontal: space[3], borderRadius: radius.control, borderWidth: 1, borderColor: color.border, backgroundColor: color.canvas },
  flex: { flex: 1 },
  gap: { gap: space[3] },
});
