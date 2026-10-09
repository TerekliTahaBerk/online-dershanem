import type { MobileGoal } from '@contracts/yon';
import { StyleSheet, View } from 'react-native';

import { EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, radius, space, tone } from '@/design/tokens';
import { fetchGoals } from '@/lib/api/yon';

import { QueryView, usePullToRefresh, useYonQuery } from './shared';

/**
 * YÖN · HEDEFLERİM — web `app/panel/ogrenci/hedefler` (M1'den kalan eski
 * `ok-goals` ekranının yerine). Veri mevcut `GET /api/panel/student/goals`
 * (web ile aynı `getStudentGoals`). Şu anki değer sunucuda gerçek veriden
 * hesaplanır; ölçüm yoksa "ölçülmedi" yazılır ve çubuk ÇİZİLMEZ (sahte %0
 * yok). Gruplar web ile aynı.
 */
const NUM = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const RANK = new Intl.NumberFormat('tr-TR');

const GROUPS: { id: string; title: string; kinds: MobileGoal['kind'][] }[] = [
  { id: 'sinav', title: 'Sınav hedefi', kinds: ['EXAM_TARGET', 'SCORE_TARGET'] },
  { id: 'dersler', title: 'Ders netleri', kinds: ['SUBJECT_NET'] },
  { id: 'haftalik', title: 'Haftalık', kinds: ['WEEKLY_STUDY_MINUTES', 'WEEKLY_QUESTION_COUNT', 'PLAN_COMPLETION'] },
  { id: 'odak', title: 'Odak', kinds: ['SUBJECT_FOCUS'] },
];

function currentLabel(goal: MobileGoal): string {
  if (goal.current === null) return 'Ölçülmedi';
  return goal.kind === 'PLAN_COMPLETION' ? `Şu an %${goal.current}` : `Şu an ${NUM.format(goal.current)}`;
}

export default function YonGoalsScreen() {
  const query = useYonQuery('goals', (api, signal) => fetchGoals(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="yon-goals">
      <PageHeader
        title="Hedeflerim"
        description={query.data?.coachName ? `${query.data.coachName} ile belirlediğin hedefler ve şu anki durumun. Hedefleri koçun günceller.` : 'Belirlenen hedeflerin ve şu anki durumun.'}
      />
      <QueryView query={query}>
        {(data) =>
          !data.profile ? (
            <EmptyState title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında hedeflerin burada görünür." />
          ) : (
            <>
              {data.examLine || data.targetRank ? (
                <Section title="Sınav ve sıralama" first>
                  <Row title="Sınav" meta={data.examLine || 'Sınav belirlenmedi'} />
                  {data.targetRank ? <Row title="Hedef sıralama" meta={RANK.format(data.targetRank)} subtitle="Gereken net aralığını koçun belirler." /> : null}
                </Section>
              ) : null}
              {data.goals.length === 0 ? (
                <EmptyState title="Henüz hedef belirlenmedi." body="Koçunla birlikte net ve plan hedeflerini belirlediğinizde burada takip edebilirsin." />
              ) : (
                GROUPS.map((group) => {
                  const items = data.goals.filter((goal) => group.kinds.includes(goal.kind));
                  if (!items.length) return null;
                  return (
                    <Section key={group.id} title={group.title}>
                      {items.map((goal) => (
                        <GoalRow key={goal.id} goal={goal} />
                      ))}
                    </Section>
                  );
                })
              )}
            </>
          )
        }
      </QueryView>
    </Screen>
  );
}

function GoalRow({ goal }: { goal: MobileGoal }) {
  const { product } = useDesign();
  const fill = goal.band === 'behind' ? tone.warning.text : goal.band === 'close' ? product.accentMarker : product.accent;
  return (
    <View style={styles.goal} testID={`yon-goal-${goal.id}`}>
      <View style={styles.head}>
        <Text variant="bodyStrong" style={styles.flex}>{goal.label}</Text>
        {goal.status === 'ACHIEVED' ? <StatusBadge label="Ulaşıldı" tone="success" /> : goal.status === 'PAUSED' ? <StatusBadge label="Duraklatıldı" tone="neutral" /> : null}
      </View>
      <Text tone="secondary" variant="secondary">{`Hedef ${NUM.format(goal.target)}${goal.kind === 'PLAN_COMPLETION' ? '%' : ''} · ${currentLabel(goal)}`}</Text>
      <Text tone="muted" variant="meta">
        {`${goal.current === null ? 'Bu başlıkta henüz ölçüm yok; ilerleme çizilmiyor.' : `Kaynak: ${goal.basis ?? '—'}`}${goal.nearTermNote ? ` · Yakın hedef: ${goal.nearTermNote}` : ''}`}
      </Text>
      {goal.percent !== null && goal.band !== null ? (
        <View style={styles.track} accessible accessibilityRole="progressbar" accessibilityLabel={`${goal.label} ilerlemesi`} accessibilityValue={{ min: 0, max: 100, now: Math.round(goal.percent) }}>
          <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, goal.percent))}%`, backgroundColor: fill }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  goal: { gap: space[1], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  flex: { flex: 1 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: color.surfaceSubtle, overflow: 'hidden', marginTop: space[1] },
  fill: { height: '100%', borderRadius: radius.pill },
});
