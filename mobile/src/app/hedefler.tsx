import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ListEmpty, PanelHeading, ProgressBar } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

const NUM = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const RANK = new Intl.NumberFormat('tr-TR');

/* Tasarımın bant renkleri: hedefe uzakken kehribar, yakınken/ulaşınca yeşil. */
const BAND_COLOR: Record<'met' | 'close' | 'behind', string> = {
  met: BrandColors.brand,
  close: BrandColors.brand,
  behind: '#E0A34A',
};

type Goal = {
  id: string;
  kind: 'SUBJECT_NET' | 'PLAN_COMPLETION';
  label: string;
  target: number;
  current: number | null;
  percent: number | null;
  band: 'met' | 'close' | 'behind' | null;
  nearTermNote: string | null;
  basis: string | null;
};
type GoalsData = {
  profile: { id: string } | null;
  coachName: string | null;
  examLine: string;
  targetRank: number | null;
  goals: Goal[];
};

export default function HedeflerScreen() {
  const { token, signOut } = useSession();
  const [data, setData] = useState<GoalsData | null>(null);
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
        const result = await apiFetch<GoalsData>('/api/panel/student/goals', { token });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Hedefler yüklenemedi. Bağlantınızı kontrol edin.');
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

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={BrandColors.brandStrong} colors={[BrandColors.brandStrong]} />
          }>
          <PanelHeading
            title="Hedefler"
            description={
              data?.coachName ? `${data.coachName} ile belirlediğin hedefler ve şu anki durumun.` : 'Belirlenen hedeflerin ve şu anki durumun.'
            }
          />

          {error ? (
            <ThemedText type="small" style={styles.errorBanner}>
              {error}
            </ThemedText>
          ) : null}

          {!data?.profile ? (
            <ListEmpty title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında hedeflerin burada görünür." />
          ) : (
            <>
              {data.examLine || data.targetRank ? (
                <Card>
                  <ThemedText type="small" themeColor="textSecondary">
                    Sınav hedefi
                  </ThemedText>
                  <ThemedText style={styles.examLine}>
                    {data.examLine || 'Sınav belirlenmedi'}
                    {data.targetRank ? ` · hedef sıralama ${RANK.format(data.targetRank)}` : ''}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Hedef sıralama için gereken net aralığını koçun belirler.
                  </ThemedText>
                </Card>
              ) : null}

              {data.goals.length === 0 ? (
                <ListEmpty
                  title="Henüz hedef belirlenmedi."
                  body="Koçunla birlikte net ve plan hedeflerini belirlediğinizde burada takip edebilirsin."
                />
              ) : (
                <View style={styles.goalList}>
                  {data.goals.map((goal) => (
                    <Card key={goal.id}>
                      <View style={styles.goalHeader}>
                        <ThemedText type="smallBold" style={styles.goalLabel}>
                          {goal.label}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {goal.current === null
                            ? 'ölçüm yok'
                            : goal.kind === 'PLAN_COMPLETION'
                              ? `şimdi %${goal.current}`
                              : `şimdi ${NUM.format(goal.current)}`}
                        </ThemedText>
                      </View>

                      {goal.percent !== null && goal.band !== null ? (
                        <ProgressBar percent={goal.percent} color={BAND_COLOR[goal.band]} />
                      ) : null}

                      {goal.nearTermNote ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          Yakın hedef: {goal.nearTermNote}
                        </ThemedText>
                      ) : null}

                      <ThemedText type="small" style={styles.basisText}>
                        {goal.current === null ? 'Bu başlıkta henüz ölçüm yok; ilerleme çizilmiyor.' : `Kaynak: ${goal.basis}`}
                      </ThemedText>
                    </Card>
                  ))}
                </View>
              )}
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
  examLine: { fontSize: 20, fontWeight: '800', marginVertical: 2 },
  goalList: { gap: Spacing.two },
  goalHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.one },
  goalLabel: { flex: 1 },
  basisText: { color: '#8A9691' },
});
