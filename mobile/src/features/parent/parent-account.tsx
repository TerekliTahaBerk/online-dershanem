import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchParentAccount } from '@/lib/api/parent';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { queryKeys } from '@/lib/query/keys';

import { QueryView, usePullToRefresh } from '../shared/workspace-data';
import { useParentContext } from './parent-context';

/**
 * VELİ · HESAP — `account` amacı: akademik izni kapalı bağlantılar da ad +
 * ürünle listelenir, ama akademik veri YOKTUR. Fiyat, sipariş, ödeme ve
 * satın alma mobilde yoktur (MD-09).
 * Ayarlar, bildirimler ve oturumlar M1 / M5 ekranlarına gider.
 */
export default function ParentAccountScreen() {
  const bootstrap = useReadyBootstrap();
  const { api } = useSession();
  const router = useRouter();
  const context = useParentContext();
  const query = useQuery({ queryKey: queryKeys.parentAccount(bootstrap.user.id), queryFn: ({ signal }) => fetchParentAccount(api, signal) });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="parent-account">
      <PageHeader title="Hesap" description="Bağlı öğrenciler ve hesap ayarları" />
      <QueryView query={query}>
        {(data) => (
          <>
            <Section title="Veli" first>
              <Row title={data.parent.fullName || 'Ad belirtilmemiş'} subtitle={data.parent.email} />
              {!data.parent.hasPhone ? <Text tone="secondary">Telefon numaranız kayıtlı değil. Size daha kolay ulaşabilmemiz için web panelindeki hesap ayarlarından ekleyebilirsiniz.</Text> : null}
            </Section>
            <Section title="Bağlı öğrenciler">
              {data.children.length ? (
                data.children.map((child) => (
                  <Row
                    key={child.studentId}
                    title={child.name}
                    subtitle={child.products.length ? child.products.map((product) => product.label).join(' · ') : 'Aktif ürün yok'}
                    trailing={child.academicAccess ? undefined : <StatusBadge label="Akademik bilgi kapalı" tone="neutral" />}
                    selected={context?.selected?.studentId === child.studentId}
                    onPress={child.academicAccess && context ? () => context.selectChild(child.studentId) : undefined}
                  />
                ))
              ) : (
                <EmptyState title="Hesabınıza bağlı bir öğrenci görünmüyor" body="Bir eksiklik olduğunu düşünüyorsanız eğitim koordinatörünüz hemen yardımcı olur." />
              )}
            </Section>
            <Section title="Ayarlar">
              <Row title="Hesap ve güvenlik" subtitle="Parola, oturumlar ve cihazlar" onPress={() => router.push('/account')} />
              <Row title="Bildirim ayarları" onPress={() => router.push('/account/notifications')} />
            </Section>
          </>
        )}
      </QueryView>
    </Screen>
  );
}
