import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarRow, Card, FilterChip, LineChart, ListEmpty, PanelHeading } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

const FULL = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const SHORT = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

type Section = { id: string; subjectName: string; correctCount: number; incorrectCount: number; net: number };
type Current = {
  id: string;
  title: string;
  takenAt: string;
  durationMinutes: number | null;
  nextAction: string | null;
  total: number;
  delta: number | null;
  sections: Section[];
};
type ExamsData = {
  profile: { id: string } | null;
  exams: { id: string; title: string; takenAt: string }[];
  trend: { id: string; takenAt: string; net: number }[];
  current: Current | null;
};

const fmt = (v: number) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DenemelerScreen() {
  const { token, signOut } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<ExamsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (examId: string | null, isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const query = examId ? `?deneme=${examId}` : '';
        const result = await apiFetch<ExamsData>(`/api/panel/mock-exams${query}`, { token });
        setData(result);
        setSelectedId(result.current?.id ?? null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Denemeler yüklenemedi. Bağlantınızı kontrol edin.');
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    load(null);
  }, [load]);

  if (loading) {
    return (
      <ThemedView style={styles.centerFlex}>
        <ActivityIndicator color={BrandColors.brandStrong} size="large" />
      </ThemedView>
    );
  }

  const current = data?.current;
  const maxSectionNet = current ? Math.max(1, ...current.sections.map((s) => s.net)) : 1;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(selectedId, true)} tintColor={BrandColors.brandStrong} colors={[BrandColors.brandStrong]} />
          }>
          <PanelHeading title="Denemelerin" />

          {error ? (
            <ThemedText type="small" style={styles.errorBanner}>
              {error}
            </ThemedText>
          ) : null}

          {!data?.profile ? (
            <ListEmpty title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında deneme sonuçların burada açılır." />
          ) : !current ? (
            <ListEmpty
              title="Henüz deneme kaydın yok."
              body="Deneme girişi web panelinden yapılıyor — ilk sonucun girildiğinde analiz burada açılır."
            />
          ) : (
            <>
              {data.exams.length > 1 ? (
                <View style={styles.pickerRow}>
                  {data.exams.slice(0, 5).map((exam) => (
                    <FilterChip
                      key={exam.id}
                      label={SHORT.format(new Date(exam.takenAt))}
                      active={exam.id === current.id}
                      onPress={() => load(exam.id)}
                    />
                  ))}
                </View>
              ) : null}

              <ThemedText style={styles.examTitle}>{current.title}</ThemedText>

              <View style={styles.statStrip}>
                <View style={styles.statItem}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Toplam net
                  </ThemedText>
                  <ThemedText style={styles.statTotal}>{fmt(current.total)}</ThemedText>
                </View>
                {current.delta !== null ? (
                  <View style={styles.statItem}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Önceki denemeye göre
                    </ThemedText>
                    <ThemedText type="title" style={{ color: current.delta >= 0 ? BrandColors.brandHover : '#8A5F37' }}>
                      {current.delta >= 0 ? '+' : ''}
                      {fmt(current.delta)}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={styles.statItem}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Tarih
                  </ThemedText>
                  <ThemedText type="smallBold">{FULL.format(new Date(current.takenAt))}</ThemedText>
                </View>
                {current.durationMinutes ? (
                  <View style={styles.statItem}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Süre
                    </ThemedText>
                    <ThemedText type="smallBold">{current.durationMinutes} dk</ThemedText>
                  </View>
                ) : null}
              </View>

              <Card>
                <ThemedText type="smallBold">Ders bazında</ThemedText>
                <View style={styles.barList}>
                  {current.sections.map((s) => (
                    <BarRow
                      key={s.id}
                      label={s.subjectName}
                      value={(Math.max(0, s.net) / maxSectionNet) * 100}
                      meta={`${s.correctCount}D / ${s.incorrectCount}Y · ${fmt(s.net)}`}
                    />
                  ))}
                </View>
              </Card>

              {data.trend.length >= 2 ? (
                <Card>
                  <ThemedText type="smallBold">Kendi denemelerine göre</ThemedText>
                  <LineChart series={[{ color: BrandColors.brand, points: data.trend.map((t) => t.net) }]} height={140} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Karşılaştırma yalnızca kendi geçmiş denemelerinle yapılır.
                  </ThemedText>
                </Card>
              ) : null}

              {current.nextAction ? (
                <Card>
                  <ThemedText type="smallBold">Bir sonraki denemeye kadar</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {current.nextAction}
                  </ThemedText>
                </Card>
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
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  errorBanner: { color: '#B3261E' },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  examTitle: { fontSize: 20, fontWeight: '800' },
  statStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four, borderBottomWidth: 1, borderBottomColor: BrandColors.line, paddingBottom: Spacing.three },
  statItem: { gap: 2 },
  statTotal: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  barList: { gap: Spacing.two },
});
