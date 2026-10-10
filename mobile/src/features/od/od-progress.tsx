import { WEEKLY_GOAL_MAX, WEEKLY_GOAL_MIN, type MobileInsightsReady } from '@contracts/student';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { color, radius, space } from '@/design/tokens';
import { fetchInsights, saveWeeklyGoal } from '@/lib/api/student';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { expoHrefFor, targetForNavId } from '@/navigation/route-map';

import { QueryView, useOdNavigation, usePullToRefresh } from './shared';
import { useInvalidateWorkspace, useWorkspaceQuery } from '../shared/workspace-data';

/**
 * ORTAK · GİDİŞATIM — web `app/panel/ogrenci/analiz` ile AYNI servis
 * (`GET /api/panel/student/insights` → `loadStudentProgressInsight`).
 * Metrik ve anlatı sunucudan; burada yeniden hesaplanmaz. Eski
 * `/api/panel/student/progress` bu ekranda KULLANILMAZ.
 */

const DIRECTION: Record<'up' | 'down' | 'steady' | 'limited', { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  up: { label: 'Yükseliyor', tone: 'success' },
  down: { label: 'Düşüyor', tone: 'warning' },
  steady: { label: 'Dengeli', tone: 'neutral' },
  limited: { label: 'Az veri', tone: 'neutral' },
};

const formatNet = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

export default function OdProgressScreen() {
  const bootstrap = useReadyBootstrap();
  const product = bootstrap.workspace?.activeProduct ?? 'OD';
  const query = useWorkspaceQuery(product, 'insights', (api, signal) => fetchInsights(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="od-progress">
      <QueryView query={query} disabledTitle="Gidişat analizi şu anda açık değil.">
        {(data) =>
          data.state === 'NO_PROFILE' ? (
            <>
              <PageHeader title="Gidişatın" />
              <EmptyState title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında analiz özetin burada açılır." />
            </>
          ) : (
            <InsightsBody data={data} />
          )
        }
      </QueryView>
    </Screen>
  );
}

function InsightsBody({ data }: { data: MobileInsightsReady }) {
  const nav = useOdNavigation();
  return (
    <>
      <PageHeader title="Gidişatın" context={<Text tone="muted" variant="meta">{data.periodRange}</Text>} />
      <View style={styles.summary} accessibilityRole="summary">
        {data.narrative.map((sentence, index) => (
          <Text key={index} tone="secondary">
            {sentence}
          </Text>
        ))}
      </View>
      <WeeklyGoal goal={data.weeklyGoal} />
      {data.isEmpty ? (
        <EmptyState title="Henüz gösterilecek veri yok." body="Derslerin işlendikçe, çalışmaların tamamlandıkça ve denemelerin girildikçe gidişatın burada birikir." />
      ) : (
        <>
          <Section title="Akademik">
            {data.academic.examCount < 2 ? (
              <Text tone="secondary">Deneme eğilimi için en az iki sonuç gerekiyor. İkinci deneme girildiğinde net değişimin burada görünür.</Text>
            ) : (
              <>
                <Row
                  title="Toplam net değişimi"
                  meta={data.academic.netDelta === null ? '—' : `${data.academic.netDelta >= 0 ? '+' : ''}${formatNet(data.academic.netDelta)}`}
                  subtitle={data.academic.netTrend.map((point) => `${point.label} ${formatNet(point.net)}`).join(' · ')}
                />
                {data.academic.subjects.map((subject) => (
                  <Row key={subject.name} title={subject.name} trailing={<StatusBadge label={DIRECTION[subject.direction].label} tone={DIRECTION[subject.direction].tone} />} />
                ))}
              </>
            )}
            {data.academic.strengths.map((item) => (
              <Text key={`s-${item.subject}`} tone="secondary">{`Güçlü: ${item.sentence}`}</Text>
            ))}
            {data.academic.supportAreas.map((item) => (
              <Text key={`d-${item.subject}`} tone="secondary">{`Destek: ${item.sentence}`}</Text>
            ))}
            {data.academic.subjectCaption ? <Text tone="muted" variant="meta">{data.academic.subjectCaption}</Text> : null}
          </Section>
          <Section title="Çalışma davranışı">
            <RateRow title="Derslere katılım" rate={data.behavioral.attendance} unit="ders" />
            <RateRow title="Çalışma tamamlama" rate={data.behavioral.assignments} unit="çalışma" />
          </Section>
        </>
      )}
      {data.mockExamAnalysis && nav.has('mock-exams') && nav.navigation ? (
        <Section title="Dış denemelerim">
          <Text tone="secondary">Okulda, kursta veya başka bir platformda çözdüğün deneme sonuçları. Deneme Ligi sonuçların ayrı çalışma alanındadır.</Text>
          <Button label="Dış denemelerimi gör" variant="secondary" onPress={() => nav.push(expoHrefFor(targetForNavId(nav.navigation!, 'mock-exams')))} />
        </Section>
      ) : null}
    </>
  );
}

function RateRow({ title, rate, unit }: { title: string; rate: { percent: number | null; numerator: number; denominator: number }; unit: string }) {
  if (rate.percent === null || rate.denominator === 0) return <Row title={title} meta="Henüz veri yok" />;
  return <Row title={title} meta={`%${Math.round(rate.percent)}`} subtitle={`${rate.numerator} / ${rate.denominator} ${unit}`} />;
}

/**
 * Haftalık hedef — mevcut `PATCH /api/panel/student/weekly-goal` akışı
 * (3–180 karakter). Kayıt yalnız sunucu onayından sonra gösterilir.
 */
function WeeklyGoal({ goal }: { goal: string | null }) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const invalidate = useInvalidateWorkspace(bootstrap.workspace?.activeProduct ?? 'OD');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal ?? '');
  const [message, setMessage] = useState<{ tone: 'success' | 'critical'; text: string } | null>(null);
  const mutation = useMutation({ mutationFn: (value: string) => saveWeeklyGoal(api, value) });
  const length = draft.trim().length;
  const invalid = length < WEEKLY_GOAL_MIN || length > WEEKLY_GOAL_MAX;

  async function save() {
    setMessage(null);
    try {
      await mutation.mutateAsync(draft.trim());
      setEditing(false);
      setMessage({ tone: 'success', text: 'Hedefin kaydedildi.' });
      await invalidate();
    } catch (error) {
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Hedef kaydedilemedi.' });
    }
  }

  return (
    <View style={styles.goal} testID="weekly-goal">
      <Text variant="caption" tone="muted">Bu haftaki kişisel hedefim</Text>
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      {editing ? (
        <>
          <TextField
            testID="weekly-goal-input"
            label="Haftalık hedef"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={WEEKLY_GOAL_MAX}
            hint={`${length}/${WEEKLY_GOAL_MAX}`}
            editable={!mutation.isPending}
          />
          <View style={styles.row}>
            <Button testID="weekly-goal-save" label="Hedefi kaydet" loading={mutation.isPending} disabled={invalid} onPress={() => void save()} />
            <Button label="Vazgeç" variant="quiet" disabled={mutation.isPending} onPress={() => setEditing(false)} />
          </View>
        </>
      ) : (
        <>
          <Text variant="bodyStrong">{goal ?? 'Henüz bu hafta için bir hedef yazmadın.'}</Text>
          <Button
            testID="weekly-goal-edit"
            label={goal ? 'Hedefi düzenle' : 'Hedef yaz'}
            variant="secondary"
            onPress={() => {
              setDraft(goal ?? '');
              setMessage(null);
              setEditing(true);
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: space[1] },
  goal: { gap: space[2], borderWidth: 1, borderColor: color.border, borderRadius: radius.card, padding: space[4] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
