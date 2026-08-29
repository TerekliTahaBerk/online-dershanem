import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Link } from 'expo-router';

import { FilterChip, ListEmpty, PanelHeading } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

const DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });

type Filter = 'yaklasan' | 'tamamlanan';

type Lesson = {
  id: string;
  startsAt: string;
  title: string;
  groupName: string;
  teacherName: string | null;
  statusLabel: string;
  statusTone: 'default' | 'ok' | 'warn';
  actionLabel: string;
};

type LessonsData = { profile: { id: string } | null; groupNames: string; lessons: Lesson[] };

const TONE_COLOR: Record<Lesson['statusTone'], string | undefined> = {
  default: undefined,
  ok: BrandColors.brandHover,
  warn: '#8A5F37',
};

export default function DerslerScreen() {
  const { token, signOut } = useSession();
  const [filter, setFilter] = useState<Filter>('yaklasan');
  const [data, setData] = useState<LessonsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (targetFilter: Filter, isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<LessonsData>(`/api/panel/student/lessons?durum=${targetFilter}`, { token });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Dersler yüklenemedi. Bağlantınızı kontrol edin.');
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(filter, true)}
              tintColor={BrandColors.brandStrong}
              colors={[BrandColors.brandStrong]}
            />
          }>
          <PanelHeading title="Derslerin" description={data?.groupNames || undefined} />

          <Link href="/materyaller" style={styles.materialsLink}>
            Materyaller →
          </Link>

          <View style={styles.filterRow}>
            <FilterChip label="Yaklaşan" active={filter === 'yaklasan'} onPress={() => setFilter('yaklasan')} />
            <FilterChip label="Tamamlanan" active={filter === 'tamamlanan'} onPress={() => setFilter('tamamlanan')} />
          </View>

          {loading ? (
            <ActivityIndicator color={BrandColors.brandStrong} style={styles.loading} />
          ) : error ? (
            <View style={styles.errorBox}>
              <ThemedText type="small" style={styles.errorText}>
                {error}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => load(filter)}
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
                <ThemedText type="smallBold" style={styles.retryLabel}>
                  Tekrar dene
                </ThemedText>
              </Pressable>
            </View>
          ) : !data?.profile ? (
            <ListEmpty title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında ders takvimin burada görünecek." />
          ) : data.lessons.length === 0 ? (
            <ListEmpty
              title={filter === 'yaklasan' ? 'Yaklaşan ders yok.' : 'Tamamlanmış ders yok.'}
              body={
                filter === 'yaklasan'
                  ? 'Yeni dersin planlandığında burada görünecek.'
                  : 'Ders tamamlandıkça öğretmen notlarıyla birlikte burada listelenir.'
              }
            />
          ) : (
            <View style={styles.table}>
              {data.lessons.map((lesson, i) => (
                <View key={lesson.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                  <View style={styles.rowTop}>
                    <View>
                      <ThemedText type="smallBold">{DATE.format(new Date(lesson.startsAt))}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {TIME.format(new Date(lesson.startsAt))}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={TONE_COLOR[lesson.statusTone] ? { color: TONE_COLOR[lesson.statusTone] } : undefined}>
                      {lesson.statusLabel}
                    </ThemedText>
                  </View>
                  <ThemedText type="default" style={styles.rowTitle}>
                    {lesson.title}
                    {lesson.groupName ? ` · ${lesson.groupName}` : ''}
                  </ThemedText>
                  <View style={styles.rowBottom}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {lesson.teacherName || '—'}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.actionLabel}>
                      {lesson.actionLabel}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  materialsLink: { fontSize: 13, fontWeight: '600', color: BrandColors.brandStrong, marginTop: -Spacing.one },
  filterRow: { flexDirection: 'row', gap: Spacing.one },
  loading: { marginTop: Spacing.five },
  errorBox: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  errorText: { textAlign: 'center' },
  retryButton: { height: 40, paddingHorizontal: Spacing.four, borderRadius: 10, backgroundColor: BrandColors.brandStrong, alignItems: 'center', justifyContent: 'center' },
  retryButtonPressed: { backgroundColor: BrandColors.brandHover },
  retryLabel: { color: '#ffffff' },
  table: { borderRadius: 14, borderWidth: 1, borderColor: BrandColors.line, backgroundColor: '#ffffff', overflow: 'hidden' },
  row: { padding: Spacing.three, gap: 4 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BrandColors.lineSoft },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rowTitle: { marginTop: 2 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  actionLabel: { color: BrandColors.brandStrong },
});
