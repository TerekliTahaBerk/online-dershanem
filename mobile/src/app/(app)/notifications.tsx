import type { MobileNotification } from '@contracts/api';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, ErrorState, Skeleton, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, space } from '@/design/tokens';
import * as endpoints from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { queryKeys, sessionKeyFor } from '@/lib/query/keys';
import { useNavTarget } from '@/navigation/use-nav-target';

const DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

/**
 * Uygulama içi bildirim kutusu (push M5). Okundu işaretleme sunucuya
 * yazılır; başarısızsa "okundu" GÖSTERİLMEZ. Dokunulan bildirim yalnız
 * sunucu menüsünde yetkili bir hedefe eşlenirse açılır; aksi halde kullanıcı
 * listede kalır ve bunu görür.
 */
export default function NotificationsScreen() {
  const bootstrap = useReadyBootstrap();
  const { api, token } = useSession();
  const queryClient = useQueryClient();
  const { product } = useDesign();
  const { openNotificationHref } = useNavTarget();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const key = queryKeys.notifications(bootstrap.user.id, filter);

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) => endpoints.fetchNotifications(api, pageParam, filter, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...queryKeys.user(bootstrap.user.id), 'notifications'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bootstrap(sessionKeyFor(token)) }),
    ]);
  };

  const markRead = useMutation({ mutationFn: (id?: string) => endpoints.markNotificationsRead(api, id), onSuccess: invalidate });

  async function openNotification(item: MobileNotification) {
    setNotice(null);
    if (!item.read) {
      try {
        await markRead.mutateAsync(item.id);
      } catch (cause) {
        setNotice(cause instanceof ApiError ? cause.message : 'Bildirim okundu olarak işaretlenemedi.');
        return;
      }
    }
    if (!openNotificationHref(item.href) && item.href) setNotice('Bu bildirimin içeriği bu çalışma alanında veya mobilde henüz açılamıyor.');
  }

  const items = query.data?.pages.flatMap((page) => page.notifications) ?? [];
  const unreadTotal = query.data?.pages[0]?.unreadTotal ?? 0;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={product.accent} />}
      onEndReachedThreshold={0.4}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.filters} accessibilityRole="tablist">
            {(['all', 'unread'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === value }}
                onPress={() => setFilter(value)}
                style={[styles.filter, filter === value && { backgroundColor: product.accentSoft }]}>
                <Text variant="label" tone={filter === value ? 'accent' : 'secondary'} accentColor={product.accent}>
                  {value === 'all' ? 'Tümü' : 'Okunmamış'}
                </Text>
              </Pressable>
            ))}
          </View>
          {unreadTotal > 0 ? <Button label="Tümünü okundu say" variant="quiet" loading={markRead.isPending && markRead.variables === undefined} onPress={() => markRead.mutate(undefined)} /> : null}
          {notice ? <Banner tone="info">{notice}</Banner> : null}
          {markRead.isError && !notice ? <Banner tone="critical">{markRead.error instanceof ApiError ? markRead.error.message : 'İşlem tamamlanamadı.'}</Banner> : null}
          {query.isPending ? <Skeleton rows={5} /> : null}
          {query.isError && !query.data ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}
        </View>
      }
      ListEmptyComponent={query.isSuccess ? <EmptyState title={filter === 'unread' ? 'Okunmamış bildirim yok' : 'Henüz bildirim yok'} body="Yeni bildirimler burada görünür." /> : null}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.read ? '' : 'Okunmamış. '}${item.title}. ${item.body}`}
          onPress={() => void openNotification(item)}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: color.pressed }]}>
          <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : product.accentMarker }]} />
          <View style={styles.flex}>
            <Text variant={item.read ? 'body' : 'bodyStrong'}>{item.title}</Text>
            <Text variant="secondary" tone="secondary" numberOfLines={3}>
              {item.body}
            </Text>
            <Text variant="meta" tone="muted">
              {DATE.format(new Date(item.createdAt))}
            </Text>
          </View>
        </Pressable>
      )}
      ListFooterComponent={query.isFetchingNextPage ? <Skeleton rows={2} /> : null}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: space[4], paddingBottom: space[8] },
  header: { gap: space[3], paddingTop: space[3], paddingBottom: space[2] },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  filter: { minHeight: 44, paddingVertical: space[2], paddingHorizontal: space[3], borderRadius: 6, justifyContent: 'center', borderWidth: 1, borderColor: color.border },
  row: { flexDirection: 'row', gap: space[3], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
});
