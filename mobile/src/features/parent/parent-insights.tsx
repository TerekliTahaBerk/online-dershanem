import type { MobileParentInsightsReady } from '@contracts/parent';

import { EmptyState, Row, Section, Text } from '@/design/primitives';
import { fetchParentInsights } from '@/lib/api/parent';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, usePullToRefresh } from './parent-shared';

const DIRECTION = { up: 'yükseliyor', down: 'tekrar öneriliyor', steady: 'dengeli', limited: 'henüz yeterli ölçüm yok' } as const;
const fmt = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

/**
 * VELİ · AKADEMİK GELİŞİM — `loadStudentProgressInsight({ audience: "parent_calm" })`
 * (web `app/panel/veli/analiz`). Anlatı ve metrikler sunucudan; null değer
 * sıfıra çevrilmez, akran karşılaştırması / tahmin yok.
 */
export default function ParentInsightsScreen() {
  const query = useParentQuery('insights', fetchParentInsights);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Gelişim" testID="parent-insights" refresh={refresh}>
      {(child) => (
        <ParentQueryView query={query} child={child} disabledTitle="Gelişim özeti şimdilik kapalı.">
          {(data) => (data.state === 'PREPARING' ? <EmptyState title="Özet hazırlanıyor" body="Öğrencinizin ilk verileri geldiğinde gelişimini burada görebilirsiniz." /> : <InsightsBody data={data} />)}
        </ParentQueryView>
      )}
    </ParentScreen>
  );
}

function RateLine({ label, rate }: { label: string; rate: MobileParentInsightsReady['behavioral']['attendance'] }) {
  return <Row title={label} meta={rate.percent === null ? 'Henüz kayıt yok' : `%${Math.round(rate.percent)} (${rate.numerator}/${rate.denominator})`} />;
}

function InsightsBody({ data }: { data: MobileParentInsightsReady }) {
  const { academic } = data;
  return (
    <>
      <Text tone="muted" variant="meta">{data.periodRange || data.periodLabel}</Text>
      <Section title="Özet" first>
        {data.narrative.length ? data.narrative.map((line, index) => <Text key={`${index}-${line}`}>{line}</Text>) : <Text tone="secondary">Özet henüz oluşmadı.</Text>}
      </Section>
      {data.isEmpty ? (
        <EmptyState title="Gidişat yeni yeni şekilleniyor" body="Ders katılımı, çalışmalar ve denemeler biriktikçe öğrencinizin gidişatını burada görebilirsiniz." />
      ) : (
        <>
          {data.hasExamAccess ? (
            <Section title="Deneme eğilimi">
              {academic.netTrend.length >= 2 ? (
                <>
                  <Text>{`Toplam net ${fmt(academic.netTrend[0].net)} → ${fmt(academic.netTrend[academic.netTrend.length - 1].net)}${academic.netDelta !== null ? ` (${academic.netDelta > 0 ? '+' : ''}${fmt(academic.netDelta)})` : ''}`}</Text>
                  {academic.netTrend.map((point) => <Row key={point.label} title={point.label} meta={`${fmt(point.net)} net`} />)}
                </>
              ) : (
                <Text tone="secondary">Eğilimi görebilmek için en az iki deneme sonucu gerekiyor. İkinci sonuç girildiğinde gelişimi burada görebilirsiniz.</Text>
              )}
              {academic.subjects.map((subject) => <Row key={subject.name} title={subject.name} meta={DIRECTION[subject.direction]} />)}
              {academic.subjectCaption ? <Text tone="muted" variant="meta">{academic.subjectCaption}</Text> : null}
              {academic.strengths.map((item) => <Text key={`s-${item.subject}`} tone="secondary">{item.sentence}</Text>)}
              {academic.supportAreas.map((item) => <Text key={`d-${item.subject}`} tone="secondary">{item.sentence}</Text>)}
            </Section>
          ) : (
            <Section title="Deneme eğilimi">
              <Text tone="secondary">Bu öğrencinin deneme üyeliği yok. Aşağıda ders katılımını ve çalışma tamamlama durumunu görebilirsiniz.</Text>
            </Section>
          )}
          <Section title="Öğrenme düzeni">
            <RateLine label="Ders katılımı" rate={data.behavioral.attendance} />
            <RateLine label="Çalışma tamamlama" rate={data.behavioral.assignments} />
          </Section>
        </>
      )}
    </>
  );
}
