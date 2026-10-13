import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { confirmAction, OfflineWriteNotice, useOnline, useStableKey, WriteBanner, writeError, type WriteState } from '@/features/staff/shared';
import { requestPackageMeeting } from '@/lib/api/account';
import { ApiError } from '@/lib/api/errors';
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
  const online = useOnline();
  const [state, setState] = useState<WriteState>(null);
  const meetingKey = useStableKey<string>((a, b) => a === b);
  const meeting = useMutation({
    networkMode: 'always',
    mutationFn: async (studentId: string) => {
      if (!online) throw new ApiError({ kind: 'network' });
      try {
        const result = await requestPackageMeeting(api, studentId, meetingKey.keyFor(studentId));
        meetingKey.settle();
        return result;
      } catch (error) {
        meetingKey.settle(error);
        throw error;
      }
    },
  });
  async function requestMeeting(child: { studentId: string; name: string }) {
    if (meeting.isPending) return;
    if (!(await confirmAction({ title: 'Görüşme talebi', message: `${child.name} için paket değişikliği görüşmesi talep edilsin mi? Ekibimiz sizinle iletişime geçer; bu bir satın alma değildir.`, confirmLabel: 'Talep et' }))) return;
    setState(null);
    try {
      const result = await meeting.mutateAsync(child.studentId);
      setState({ tone: 'success', message: result.message });
    } catch (error) {
      setState(writeError(error, 'Talep oluşturulamadı. Yenileyip tekrar deneyin.'));
    }
  }
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="parent-account">
      <PageHeader title="Hesap" description="Bağlı öğrenciler ve hesap ayarları" />
      <QueryView query={query}>
        {(data) => (
          <>
            <Section title="Veli" first>
              <Row title={data.parent.fullName || 'Ad belirtilmemiş'} subtitle={data.parent.email} />
              {!data.parent.hasPhone ? <Text tone="secondary">Telefon numaranız kayıtlı değil; Hesap ayarları › Profil bölümünden ekleyebilirsiniz.</Text> : null}
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
                <EmptyState title="Hesabınıza bağlı öğrenci görünmüyor" body="Bağlantı eksikse eğitim koordinatörünüzle görüşebilirsiniz." />
              )}
            </Section>
            {data.children.length ? (
              <Section title="Paket değişikliği">
                <Text tone="secondary">Bir öğrenci için ürün eklemek veya paketi değiştirmek isterseniz görüşme talebi oluşturabilirsiniz.</Text>
                <OfflineWriteNotice online={online} />
                <WriteBanner state={state} />
                {data.children.map((child) => (
                  <Button key={child.studentId} mutation variant="secondary" label={`${child.name} için görüşme talebi`} loading={meeting.isPending && meeting.variables === child.studentId} disabled={!online || meeting.isPending} onPress={() => void requestMeeting(child)} testID={`package-meeting-${child.studentId}`} />
                ))}
              </Section>
            ) : null}
            <Section title="Ayarlar">
              <Row title="Hesap ayarları" subtitle="Profil, çocuklarım, iletişim ve onaylar" onPress={() => router.push('/account/settings' as Href)} testID="parent-settings" />
              <Row title="Hesap ve güvenlik" subtitle="Parola, oturumlar ve cihazlar" onPress={() => router.push('/account')} />
              <Row title="Bildirim ayarları" onPress={() => router.push('/account/notifications')} />
            </Section>
          </>
        )}
      </QueryView>
    </Screen>
  );
}
