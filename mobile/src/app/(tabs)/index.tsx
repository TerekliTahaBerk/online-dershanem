import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarRow, Card, CardTitle, EmptyState, ProgressBar, SectionLabel } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

const TR_TIME = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });
const TR_SHORT = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const TR_LONG = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

type HomeData = {
  products: string[];
  profile: { id: string } | null;
  fullName: string | null;
  unifiedToday?: {
    items: Array<{
      id: string;
      kind: string;
      productLabel: string;
      title: string;
      subtitle: string | null;
      timeLabel: string | null;
      href: string | null;
    }>;
    whatNext: { title: string; productLabel: string; href: string | null } | null;
  } | null;
  today: {
    lessons: { id: string; startsAt: string; title: string; teacherName: string | null; groupName: string }[];
    tasks: { id: string; title: string; durationMinutes: number; scheduledFor: string }[];
    assignments?: { id: string; title: string; dueAt: string }[];
    mockExams?: { id: string; title: string; startsAt: string }[];
  };
  weeklyPlan: { done: number; total: number; tasks: { id: string; title: string; durationMinutes: number; done: boolean }[] } | null;
  latestExam: {
    id: string;
    title: string;
    takenAt: string;
    net: number;
    delta: number | null;
    sections: { name: string; correct: number; incorrect: number; net: number }[];
  } | null;
  trend: { takenAt: string; net: number }[];
  hasODK: boolean;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

/** Web'in "Toplam net / önceki denemeye göre" muted renkli metni — rozet/ok İCAT EDİLMEDİ. */
function DeltaText({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <ThemedText type="smallBold" style={{ color: positive ? BrandColors.brandStrong : '#B3261E' }}>
      {positive ? '+' : ''}
      {delta.toFixed(2)}
    </ThemedText>
  );
}

function TrendSparkline({ points }: { points: { takenAt: string; net: number }[] }) {
  const nets = points.map((p) => p.net);
  const min = Math.min(...nets);
  const max = Math.max(...nets);
  const range = max - min || 1;
  return (
    <View style={styles.sparkline}>
      {points.map((point, i) => {
        const heightRatio = (point.net - min) / range;
        const isLast = i === points.length - 1;
        return (
          <View key={point.takenAt + i} style={styles.sparklineBarWrap}>
            <View
              style={[
                styles.sparklineBar,
                { height: 8 + heightRatio * 44, backgroundColor: isLast ? BrandColors.brandStrong : BrandColors.brandSoftLine },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

export default function AnaSayfaScreen() {
  const { token, signOut } = useSession();
  const [data, setData] = useState<HomeData | null>(null);
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
        const result = await apiFetch<HomeData>('/api/panel/student/home', { token });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Oturum sunucuda iptal/süresi dolmuş — yerel token da temizlenir,
          // kök layout otomatik giriş ekranına döner.
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Veriler yüklenemedi. Bağlantınızı kontrol edin.');
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <ThemedView style={styles.centerFlex}>
        <ActivityIndicator color={BrandColors.brandStrong} size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerFlex}>
        <SafeAreaView style={styles.errorContainer}>
          <ThemedText type="default" style={styles.errorText}>
            {error}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => load()}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
            <ThemedText type="smallBold" style={styles.retryLabel}>
              Tekrar dene
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!data || data.products.length === 0 || !data.profile) {
    return (
      <ThemedView style={styles.centerFlex}>
        <SafeAreaView style={styles.container}>
          <EmptyState
            title={!data || data.products.length === 0 ? 'Aktif ürün yok' : 'Profil hazırlanıyor'}
            body={
              !data || data.products.length === 0
                ? 'Henüz aktif bir ürününüz yok. Yönetim ekibiyle iletişime geçin.'
                : 'Yönetim ekibi profilinizi tamamladığında dersleriniz burada görünecek.'
            }
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { today, weeklyPlan, latestExam, trend, unifiedToday } = data;
  const now = new Date();
  const maxSectionNet = latestExam ? Math.max(0.01, ...latestExam.sections.map((s) => s.net)) : 1;
  const todayItems = unifiedToday?.items?.length
    ? unifiedToday.items
    : [
        ...today.lessons.map((lesson) => ({
          id: lesson.id,
          kind: 'LESSON',
          productLabel: 'Dershanem',
          title: lesson.title,
          subtitle: [lesson.teacherName, lesson.groupName].filter(Boolean).join(' · ') || 'Canlı ders',
          timeLabel: TR_TIME.format(new Date(lesson.startsAt)),
          href: null as string | null,
        })),
        ...today.tasks.map((task) => ({
          id: task.id,
          kind: 'COACHING_TASK',
          productLabel: 'Koçum',
          title: task.title,
          subtitle: `${task.durationMinutes} dk · Plan görevi`,
          timeLabel: TR_TIME.format(new Date(task.scheduledFor)),
          href: null as string | null,
        })),
        ...(today.assignments ?? []).map((item) => ({
          id: item.id,
          kind: 'ASSIGNMENT_DUE',
          productLabel: 'Dershanem',
          title: item.title,
          subtitle: 'Ödev son tarihi',
          timeLabel: TR_TIME.format(new Date(item.dueAt)),
          href: null as string | null,
        })),
        ...(today.mockExams ?? []).map((item) => ({
          id: item.id,
          kind: 'MOCK_EXAM',
          productLabel: 'Deneme Kulübü',
          title: item.title,
          subtitle: 'Online deneme',
          timeLabel: TR_TIME.format(new Date(item.startsAt)),
          href: null as string | null,
        })),
      ];
  const todayEmpty = todayItems.length === 0;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={BrandColors.brandStrong}
              colors={[BrandColors.brandStrong]}
            />
          }>
          <View style={styles.header}>
            <ThemedText style={styles.greeting}>
              {greeting()}
              {data.fullName ? `, ${data.fullName.split(' ')[0]}` : ''}.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {TR_LONG.format(now)}
            </ThemedText>
          </View>

          <Card>
            <SectionLabel>Bugün</SectionLabel>
            {todayEmpty ? (
              <ThemedText type="small" themeColor="textSecondary">
                Bugün için planlanmış bir şey yok.
              </ThemedText>
            ) : (
              <View style={styles.rowGroup}>
                {todayItems.map((item, i) => (
                  <View key={item.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                    <View style={styles.rowTime}>
                      <ThemedText type="smallBold">{item.timeLabel ?? '—'}</ThemedText>
                    </View>
                    <View style={styles.rowBody}>
                      <ThemedText type="default">{item.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.productLabel}
                        {item.subtitle ? ` · ${item.subtitle}` : ''}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {weeklyPlan ? (
            <Card>
              <View style={styles.cardHeaderRow}>
                <SectionLabel>Haftalık Plan</SectionLabel>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {weeklyPlan.done}/{weeklyPlan.total}
                </ThemedText>
              </View>
              <ProgressBar percent={weeklyPlan.total ? (weeklyPlan.done / weeklyPlan.total) * 100 : 0} />
              <View style={styles.rowGroup}>
                {weeklyPlan.tasks.map((task, i) => (
                  <View key={task.id} style={[styles.taskRow, i > 0 && styles.rowDivider]}>
                    <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
                      {task.done ? <ThemedText style={styles.checkboxMark}>✓</ThemedText> : null}
                    </View>
                    <ThemedText type="small" themeColor={task.done ? 'textSecondary' : 'text'} style={styles.taskLabel}>
                      {task.title} · {task.durationMinutes} dk
                    </ThemedText>
                  </View>
                ))}
              </View>
              <View style={styles.cardLinkRow}>
                <Link href="/gelisim" style={styles.cardLink}>
                  Gelişimini gör →
                </Link>
                <Link href="/hedefler" style={styles.cardLink}>
                  Hedeflerini gör →
                </Link>
              </View>
            </Card>
          ) : null}

          {latestExam ? (
            <Card>
              <CardTitle>{latestExam.title}</CardTitle>
              <View style={styles.examHeaderRow}>
                <ThemedText style={styles.examNet}>{latestExam.net.toFixed(2)}</ThemedText>
                {latestExam.delta !== null ? <DeltaText delta={latestExam.delta} /> : null}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {TR_SHORT.format(new Date(latestExam.takenAt))} · net
              </ThemedText>

              {trend.length >= 2 ? <TrendSparkline points={trend} /> : null}

              <View style={styles.rowGroup}>
                {latestExam.sections.map((section) => (
                  <BarRow
                    key={section.name}
                    label={section.name}
                    value={(Math.max(0, section.net) / maxSectionNet) * 100}
                    meta={`${section.correct}D ${section.incorrect}Y · ${section.net.toFixed(2)}`}
                  />
                ))}
              </View>
              <Link href="/denemeler" style={styles.cardLink}>
                Sonucu ve analizi aç →
              </Link>
            </Card>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { alignItems: 'stretch', paddingHorizontal: Spacing.four, width: '100%' },
  errorContainer: { alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four },
  scrollContent: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  header: { gap: Spacing.half, marginBottom: Spacing.one },
  greeting: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.3 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLink: { fontSize: 13, fontWeight: '600', color: BrandColors.brandStrong },
  cardLinkRow: { flexDirection: 'row', gap: Spacing.three, marginTop: 2 },
  rowGroup: { gap: 0 },
  row: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BrandColors.line },
  rowTime: { width: 52 },
  rowBody: { flex: 1, gap: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one + 2 },
  taskLabel: { flex: 1 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: BrandColors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: BrandColors.brandStrong, borderColor: BrandColors.brandStrong },
  checkboxMark: { color: '#ffffff', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  examHeaderRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  examNet: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  sparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one, height: 52, marginVertical: Spacing.one },
  sparklineBarWrap: { flex: 1, alignItems: 'center' },
  sparklineBar: { width: '60%', borderRadius: 3 },
  errorText: { textAlign: 'center', marginBottom: Spacing.three },
  retryButton: {
    height: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: 10,
    backgroundColor: BrandColors.brandStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonPressed: { backgroundColor: BrandColors.brandHover },
  retryLabel: { color: '#ffffff' },
});
