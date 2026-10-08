import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Banner, Button, EmptyState, ErrorState, PageHeader, Row, Screen, Section, Skeleton, StatusBadge } from '@/design/primitives';
import * as endpoints from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { queryKeys } from '@/lib/query/keys';

const DATE = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' });

/**
 * Açık oturumlar (`GET /api/auth/sessions`). Bu cihazın oturumu buradan
 * kapatılamaz (sunucu kuralı) — "Çıkış yap" kullanılır.
 */
export default function SessionsScreen() {
  const bootstrap = useReadyBootstrap();
  const { api } = useSession();
  const queryClient = useQueryClient();
  const key = queryKeys.sessions(bootstrap.user.id);
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => endpoints.fetchSessions(api, signal) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const revokeOne = useMutation({ mutationFn: (id: string) => endpoints.revokeSessionById(api, id), onSuccess: refresh });
  const revokeOthers = useMutation({ mutationFn: () => endpoints.revokeOtherSessions(api), onSuccess: refresh });
  const failure = revokeOne.error ?? revokeOthers.error;

  const sessions = query.data?.sessions ?? [];
  const others = sessions.filter((session) => !session.current);

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <PageHeader title="Oturumlar" description="Tanımadığın bir cihaz görürsen oturumu kapat ve parolanı değiştir." />
      {failure ? <Banner tone="critical">{failure instanceof ApiError ? failure.message : 'Oturum kapatılamadı.'}</Banner> : null}
      {query.isPending ? <Skeleton rows={3} /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.isSuccess ? (
        <Section first>
          {sessions.length === 0 ? <EmptyState title="Açık oturum yok" /> : null}
          {sessions.map((session) => (
            <Row
              key={session.id}
              title={session.device}
              subtitle={`Son etkinlik ${DATE.format(new Date(session.lastSeenAt))}`}
              trailing={
                session.current ? (
                  <StatusBadge label="Bu cihaz" tone="success" />
                ) : (
                  <Button label="Kapat" variant="quiet" loading={revokeOne.isPending && revokeOne.variables === session.id} onPress={() => revokeOne.mutate(session.id)} />
                )
              }
            />
          ))}
        </Section>
      ) : null}
      {others.length > 0 ? <Button label="Diğer tüm oturumları kapat" variant="destructive" loading={revokeOthers.isPending} onPress={() => revokeOthers.mutate()} /> : null}
    </Screen>
  );
}
