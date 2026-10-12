import { parseStudentProfile } from '@contracts/profile';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, PageHeader, Row, Screen, Section } from '@/design/primitives';
import { QueryView, usePullToRefresh } from '@/features/shared/workspace-data';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { queryKeys } from '@/lib/query/keys';
import { formatDayMonth } from '@/lib/format/istanbul';

export default function ProfileScreen() {
  const bootstrap = useReadyBootstrap();
  const { api } = useSession();
  const allowed = bootstrap.user.role === 'STUDENT';
  const query = useQuery({ queryKey: queryKeys.workspaceResource(bootstrap.user.id, null, 'student-profile'), enabled: allowed, queryFn: async ({ signal }) => {
    const result = parseStudentProfile(await api.request('/api/panel/student/profile', { signal }));
    if (!result.ok) throw new ApiError({ kind: 'invalid_response', details: { contract: result.error } });
    return result.value;
  } });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="student-profile" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
    <PageHeader title="Öğrenci profilim" />
    {!allowed ? <EmptyState title="Bu profil yalnız öğrenci hesaplarında açılır" /> : <QueryView query={query}>{(data) => <>
      <Section title="Profil" first>
        <Row title="Ad soyad" subtitle={data.fullName ?? '—'} />
        <Row title="E-posta" subtitle={data.email} />
        <Row title="Sınıf" subtitle={data.classLevel ?? '—'} />
        <Row title="Hedef" subtitle={data.targetGoal ?? 'Henüz belirlenmedi'} />
      </Section>
      <Section title="Veliler">{data.parents.length ? data.parents.map((parent, index) => <Row key={index} title={parent} />) : <EmptyState title="Bağlı veli yok" />}</Section>
      <Section title="Aktif ürünler">{data.activeProducts.length ? data.activeProducts.map((product, index) => <Row key={index} title={product.label} subtitle={product.expiresAt ? `Bitiş: ${formatDayMonth(product.expiresAt)}` : 'Süre sınırı yok'} />) : <EmptyState title="Aktif ürün yok" />}</Section>
    </>}</QueryView>}
  </Screen>;
}
