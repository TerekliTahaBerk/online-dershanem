import type { MobileOdkExamRow, MobileOdkHome } from '@contracts/odk';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, radius, space } from '@/design/tokens';
import { fetchOdkHome } from '@/lib/api/odk';
import { formatDayMonth, formatLongDate, formatShortDateTime } from '@/lib/format/istanbul';
import { expoHrefFor, targetForNavId } from '@/navigation/route-map';

import { FamilyTag } from './exam-row';
import { deltaTone, examHref, formatDelta, formatNet, minutesLeft, resultHref } from './model';
import { QueryView, usePullToRefresh, useOdkNavigation, useOdkQuery } from './shared';

/**
 * DENEME LİGİ · BUGÜN — web `components/odk/student-dl-home.tsx`. Veri
 * `GET /api/odk/student/home` (aynı yükleyici). Sıradaki deneme seçimi
 * sunucuda (devam eden → başlanabilir → yaklaşan). Gelişim yalnız AYNI
 * sınav ailesindeki kendi sonuçlarıyla; lig / sıralama / başka öğrenci yok.
 */
export default function OdkHomeScreen() {
  const query = useOdkQuery('home', (api, signal) => fetchOdkHome(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="odk-home">
      <PageHeader title="Deneme Ligi" context={<Text tone="muted" variant="meta">{formatLongDate(new Date())}</Text>} description="Sıradaki denemen, açıklanan sonuçların ve odaklanman gereken konular." />
      <QueryView query={query}>{(home) => <HomeBody home={home} />}</QueryView>
    </Screen>
  );
}

function HomeBody({ home }: { home: MobileOdkHome }) {
  const nav = useOdkNavigation();
  const router = useRouter();
  const exams = nav.navigation && nav.has('odk-exams') ? expoHrefFor(targetForNavId(nav.navigation, 'odk-exams')) : null;
  return (
    <>
      <NextExam exam={home.next} />
      <Section title="Son sonuçlar">
        {home.results.length ? (
          home.results.map((row) => {
            const href = resultHref(row.examId);
            const delta = formatDelta(row.delta);
            return (
              <Row
                key={row.examId}
                testID={`odk-result-${row.examId}`}
                title={row.title}
                subtitle={`${row.family} · ${formatDayMonth(row.at)}`}
                meta={`${formatNet(row.net)} net`}
                trailing={delta ? <StatusBadge label={delta} tone={deltaTone(row.delta)} /> : undefined}
                onPress={href ? () => router.push(href as Href) : undefined}
                accessibilityHint="Sonuç ayrıntısını açar."
              />
            );
          })
        ) : (
          <Text tone="secondary">Açıklanan sonuç olduğunda burada görünecek.</Text>
        )}
      </Section>
      {home.trend ? (
        <Section title="Gelişimim">
          <Text tone="muted" variant="meta">Yalnız kendi önceki denemelerinle, aynı sınav türünde karşılaştırılır.</Text>
          <Text>{`${home.trend.family} netin ${formatNet(home.trend.points[0].net)} → ${formatNet(home.trend.points[home.trend.points.length - 1].net)} · son ${home.trend.points.length} deneme`}</Text>
          {home.trend.points.map((point) => (
            <Row key={point.examId} title={point.title} subtitle={formatDayMonth(point.at)} meta={`${formatNet(point.net)} net`} />
          ))}
        </Section>
      ) : null}
      {home.focus ? (
        <Section title="Odak konularım">
          <Text tone="muted" variant="meta">{`${home.focus.examTitle} sonucuna göre en çok gelişim bekleyen kazanımlar.`}</Text>
          {home.focus.items.map((item) => (
            <Row key={item.code} title={item.title} subtitle={item.code} meta={`%${item.accuracy.toFixed(0)} · ${item.questionCount} soru`} />
          ))}
        </Section>
      ) : null}
      {exams ? (
        <View style={styles.actions}>
          <Button label="Denemelerime git" variant="secondary" onPress={() => nav.push(exams)} testID="odk-go-exams" />
        </View>
      ) : null}
    </>
  );
}

function NextExam({ exam }: { exam: MobileOdkExamRow | null }) {
  const router = useRouter();
  const { product } = useDesign();
  if (!exam) {
    return (
      <Section title="Sıradaki deneme" first>
        <EmptyState title="Henüz planlanmış bir denemen yok." body="Yeni deneme açıldığında burada görünecek." />
      </Section>
    );
  }
  const left = exam.state.key === 'IN_PROGRESS' ? minutesLeft(exam.deadlineAt, new Date()) : null;
  const line =
    exam.state.key === 'IN_PROGRESS'
      ? left !== null
        ? `Devam ediyor — ${left} dk kaldı`
        : 'Devam ediyor'
      : exam.state.key === 'AVAILABLE'
        ? 'Şimdi başlayabilirsin (web sınav ekranında)'
        : exam.startsAt
          ? `${formatShortDateTime(exam.startsAt)}'da açılır`
          : 'Saat bekleniyor';
  const href = examHref(exam.id);
  return (
    <Section title={exam.state.key === 'IN_PROGRESS' ? 'Devam eden deneme' : 'Sıradaki deneme'} first>
      <View style={[styles.next, { borderColor: product.accentSoft }]} testID="odk-next">
        <View style={styles.badges}>
          <FamilyTag family={exam.family} />
          <StatusBadge label={exam.state.label} tone={exam.state.tone} />
        </View>
        <Text variant="sectionTitle" accessibilityRole="header">{exam.title}</Text>
        <Text tone="secondary">{`${line}${exam.durationMinutes ? ` · ${exam.durationMinutes} dakika` : ''}`}</Text>
        {href ? <Button label={exam.state.key === 'IN_PROGRESS' ? 'Ayrıntı ve devam' : 'Denemeye git'} onPress={() => router.push(href as Href)} testID="odk-next-cta" /> : null}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  next: { gap: space[2], borderWidth: 1, borderRadius: radius.card, padding: space[4], backgroundColor: color.canvas },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  actions: { marginTop: space[4] },
});
