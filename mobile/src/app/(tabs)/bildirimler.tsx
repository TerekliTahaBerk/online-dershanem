import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterChip, ListEmpty, PanelHeading } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import { useSession } from '@/lib/auth-context';
import { mapNotificationHref } from '@/lib/notification-links';

const FULL = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

type NotifType = 'LESSON_SUMMARY' | 'ABSENCE' | 'ASSIGNMENT' | 'PAYMENT' | 'SYSTEM';
type TypeFilter = 'ALL' | NotifType;
type Notification = { id: string; type: NotifType; title: string; body: string; href: string | null; read: boolean; createdAt: string };
type NotificationsData = { page: number; totalPages: number; unreadTotal: number; notifications: Notification[] };

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'LESSON_SUMMARY', label: 'Ders' },
  { value: 'ASSIGNMENT', label: 'Ödev' },
  { value: 'ABSENCE', label: 'Devamsızlık' },
  { value: 'PAYMENT', label: 'Ödeme' },
  { value: 'SYSTEM', label: 'Sistem' },
];

export default function BildirimlerScreen() {
  const { token, signOut } = useSession();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (typeFilter !== 'ALL') query.set('type', typeFilter);
        if (statusFilter === 'unread') query.set('status', 'unread');
        if (page > 1) query.set('page', String(page));
        const result = await apiFetch<NotificationsData>(`/api/panel/notifications?${query.toString()}`, { token });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Bildirimler yüklenemedi. Bağlantınızı kontrol edin.');
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [token, typeFilter, statusFilter, page, signOut],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function handlePress(notification: Notification) {
    if (!token) return;
    if (!notification.read) {
      try {
        await apiFetch('/api/panel/notifications/read', { method: 'POST', token, body: { id: notification.id } });
        setData((d) =>
          d
            ? {
                ...d,
                unreadTotal: Math.max(0, d.unreadTotal - 1),
                notifications: d.notifications.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
              }
            : d,
        );
      } catch {
        // Okundu işaretleme başarısız olsa da gezinme engellenmez.
      }
    }
    const target = mapNotificationHref(notification.href);
    if (target) router.push(target as never);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={BrandColors.brandStrong} colors={[BrandColors.brandStrong]} />
          }>
          <PanelHeading title="Bildirimler" description="Ders, çalışma ve operasyon hareketlerini kaçırmadan takip edin." />

          <View style={styles.filterScroll}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {TYPE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  label={opt.label}
                  active={typeFilter === opt.value}
                  onPress={() => {
                    setTypeFilter(opt.value);
                    setPage(1);
                  }}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterRow}>
            <FilterChip
              label="Tüm durumlar"
              active={statusFilter === 'all'}
              onPress={() => {
                setStatusFilter('all');
                setPage(1);
              }}
            />
            <FilterChip
              label={`Okunmamış${data ? ` (${data.unreadTotal})` : ''}`}
              active={statusFilter === 'unread'}
              onPress={() => {
                setStatusFilter('unread');
                setPage(1);
              }}
            />
          </View>

          {loading ? (
            <ActivityIndicator color={BrandColors.brandStrong} style={styles.loading} />
          ) : error ? (
            <ThemedText type="small" style={styles.errorBanner}>
              {error}
            </ThemedText>
          ) : !data || data.notifications.length === 0 ? (
            <ListEmpty title="Bildirim yok." body="Yeni bir gelişme olduğunda burada görünecek." />
          ) : (
            <>
              <View style={styles.list}>
                {data.notifications.map((n, i) => (
                  <Pressable
                    key={n.id}
                    accessibilityRole="button"
                    onPress={() => handlePress(n)}
                    style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}>
                    {!n.read ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotSpacer} />}
                    <View style={styles.rowBody}>
                      <ThemedText type={n.read ? 'default' : 'smallBold'}>{n.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {n.body}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.dateText}>
                        {FULL.format(new Date(n.createdAt))}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>

              {data.totalPages > 1 ? (
                <View style={styles.pagination}>
                  <Pressable disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))} style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}>
                    <ThemedText type="small">← Önceki</ThemedText>
                  </Pressable>
                  <ThemedText type="small" themeColor="textSecondary">
                    {data.page}/{data.totalPages}
                  </ThemedText>
                  <Pressable disabled={page >= data.totalPages} onPress={() => setPage((p) => Math.min(data.totalPages, p + 1))} style={[styles.pageButton, page >= data.totalPages && styles.pageButtonDisabled]}>
                    <ThemedText type="small">Sonraki →</ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  filterScroll: { marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: Spacing.one },
  loading: { marginTop: Spacing.five },
  errorBanner: { color: '#B3261E' },
  list: { borderRadius: 14, borderWidth: 1, borderColor: BrandColors.line, backgroundColor: '#ffffff', overflow: 'hidden' },
  row: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BrandColors.lineSoft },
  rowPressed: { backgroundColor: BrandColors.brandSoft },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BrandColors.brandStrong, marginTop: 6 },
  unreadDotSpacer: { width: 8 },
  rowBody: { flex: 1, gap: 2 },
  dateText: { marginTop: 2 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one },
  pageButton: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two },
  pageButtonDisabled: { opacity: 0.4 },
});
