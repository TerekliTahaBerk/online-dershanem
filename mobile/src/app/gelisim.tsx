import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { Card, CardTitle, ListEmpty, LineChart, PanelHeading, ProgressBar } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

const DAY = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });

type Series = { name: string; color: string; nets: number[] };
type ProgressData = {
  profile: { id: string } | null;
  weeklyGoal: string | null;
  series: Series[];
  labels: string[];
  trendCaption: string | null;
  attendance: { attended: number; total: number; missedLessonAt: string | null } | null;
  completion: { done: number; total: number; pct: number } | null;
};

function WeeklyGoalCard({ token, goal, onSaved }: { token: string; goal: string; onSaved: (goal: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const result = await apiFetch<{ goal: string }>('/api/panel/student/weekly-goal', {
        method: 'PATCH',
        token,
        body: { goal: draft },
      });
      onSaved(result.goal);
      setEditing(false);
      setMessage('Hedefin kaydedildi.');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Hedef kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={styles.goalHeaderLabel}>
          <SymbolView name="target" size={14} tintColor="#92400E" fallback={null} />
          <ThemedText type="smallBold" style={styles.goalHeaderText}>
            Bu haftaki kişisel hedefim
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Haftalık hedefi düzenle"
          onPress={() => {
            setDraft(goal);
            setEditing((v) => !v);
            setMessage('');
          }}
          style={styles.goalEditButton}>
          <SymbolView name="pencil" size={14} tintColor="#92400E" fallback={null} />
        </Pressable>
      </View>

      {editing ? (
        <View style={styles.goalForm}>
          <TextInput
            value={draft}
            onChangeText={(text) => setDraft(text.slice(0, 180))}
            multiline
            style={styles.goalInput}
            accessibilityLabel="Haftalık hedef"
          />
          <View style={styles.goalFormFooter}>
            <ThemedText type="small" style={styles.goalCharCount}>
              {draft.length}/180
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              disabled={busy || draft.trim().length < 3}
              onPress={save}
              style={({ pressed }) => [styles.goalSaveButton, (busy || draft.trim().length < 3) && styles.goalSaveButtonDisabled, pressed && styles.goalSaveButtonPressed]}>
              {busy ? <ActivityIndicator color="#ffffff" /> : <ThemedText type="smallBold" style={styles.goalSaveLabel}>Hedefi kaydet</ThemedText>}
            </Pressable>
          </View>
        </View>
      ) : (
        <ThemedText style={styles.goalText}>{goal}</ThemedText>
      )}
      {message ? (
        <ThemedText type="small" style={styles.goalMessage}>
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

export default function GelisimScreen() {
  const { token, signOut } = useSession();
  const [data, setData] = useState<ProgressData | null>(null);
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
        const result = await apiFetch<ProgressData>('/api/panel/student/progress', { token });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Gelişim yüklenemedi. Bağlantınızı kontrol edin.');
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

  const nothingYet = !!data && data.series.length === 0 && !data.attendance && !data.completion;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={BrandColors.brandStrong} colors={[BrandColors.brandStrong]} />
          }>
          <PanelHeading title="Gelişimin" description="Ders katılımı, çalışma tamamlama ve deneme netleri bir arada." />

          {error ? (
            <ThemedText type="small" style={styles.errorBanner}>
              {error}
            </ThemedText>
          ) : null}

          {!data?.profile ? (
            <ListEmpty title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında gelişim özetin burada açılır." />
          ) : (
            <>
              <WeeklyGoalCard
                token={token!}
                goal={data.weeklyGoal || 'Bu hafta en az üç odaklı çalışma tamamlayacağım.'}
                onSaved={(goal) => setData((d) => (d ? { ...d, weeklyGoal: goal } : d))}
              />

              {nothingYet ? (
                <ListEmpty
                  title="Henüz gösterilecek veri yok."
                  body="Derslerin işlendikçe, çalışmaların tamamlandıkça ve denemelerin girildikçe gelişimin burada birikir."
                />
              ) : (
                <>
                  {data.series.length && data.labels.length >= 2 ? (
                    <Card>
                      <CardTitle>Ders bazında deneme neti · son {data.labels.length} deneme</CardTitle>
                      <LineChart series={data.series.map((s) => ({ color: s.color, points: s.nets }))} height={180} />
                      <View style={styles.legendRow}>
                        {data.series.map((s) => (
                          <View key={s.name} style={styles.legendItem}>
                            <View style={[styles.legendSwatch, { backgroundColor: s.color }]} />
                            <ThemedText type="small" themeColor="textSecondary">
                              {s.name}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                      {data.trendCaption ? (
                        <ThemedText type="small" themeColor="textSecondary" style={styles.captionText}>
                          {data.trendCaption}
                        </ThemedText>
                      ) : null}
                    </Card>
                  ) : null}

                  <View style={styles.statRow}>
                    {data.attendance ? (
                      <Card style={styles.statCard}>
                        <CardTitle>Ders katılımı</CardTitle>
                        <ThemedText style={styles.statValue}>
                          {data.attendance.attended} / {data.attendance.total}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {data.attendance.missedLessonAt
                            ? `Son ${data.attendance.total} ders · ${DAY.format(new Date(data.attendance.missedLessonAt))} dersine katılmadın`
                            : `Son ${data.attendance.total} ders`}
                        </ThemedText>
                      </Card>
                    ) : null}

                    {data.completion ? (
                      <Card style={styles.statCard}>
                        <CardTitle>Çalışma tamamlama</CardTitle>
                        <ThemedText style={styles.statValue}>%{data.completion.pct}</ThemedText>
                        <ProgressBar percent={data.completion.pct} />
                        <ThemedText type="small" themeColor="textSecondary">
                          {data.completion.done} / {data.completion.total} çalışma tamamlandı.
                        </ThemedText>
                      </Card>
                    ) : null}
                  </View>
                </>
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
  goalCard: { borderRadius: 14, borderWidth: 1, borderColor: '#EADF9E', backgroundColor: '#FFF9DC', padding: Spacing.three, gap: Spacing.two },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalHeaderLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalHeaderText: { color: '#92400E', letterSpacing: 0.6 },
  goalEditButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  goalText: { fontSize: 16, fontWeight: '600', color: '#451A03', lineHeight: 24 },
  goalForm: { gap: Spacing.two },
  goalInput: { minHeight: 80, borderRadius: 10, borderWidth: 1, borderColor: '#EADF9E', backgroundColor: '#ffffff', padding: Spacing.two, fontSize: 14, textAlignVertical: 'top' },
  goalFormFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCharCount: { color: '#92400E99' },
  goalSaveButton: { flexDirection: 'row', height: 40, paddingHorizontal: Spacing.three, borderRadius: 10, backgroundColor: BrandColors.brandStrong, alignItems: 'center', justifyContent: 'center' },
  goalSaveButtonPressed: { backgroundColor: BrandColors.brandHover },
  goalSaveButtonDisabled: { opacity: 0.5 },
  goalSaveLabel: { color: '#ffffff' },
  goalMessage: { color: '#047857' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 3, borderRadius: 2 },
  captionText: { lineHeight: 20 },
  statRow: { flexDirection: 'row', gap: Spacing.three },
  statCard: { flex: 1, gap: 6 },
  statValue: { fontSize: 26, fontWeight: '800' },
});
