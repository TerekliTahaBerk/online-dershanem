import type { MobileOdkResult } from '@contracts/odk';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, SegmentedTabs, StatusBadge, Text } from '@/design/primitives';
import { color, space } from '@/design/tokens';
import { fetchOdkResult } from '@/lib/api/odk';
import { ApiError } from '@/lib/api/errors';
import { formatDayMonth } from '@/lib/format/istanbul';

import { FamilyTag } from './exam-row';
import { useAnswerKeyOpener, useCrossProductOpen } from './hooks';
import { deltaTone, formatDelta, formatDurationMs, formatNet } from './model';
import { ResultQuestions } from './result-questions';
import { QueryView, SENSITIVE_GC_MS, usePullToRefresh, useOdkQuery } from './shared';

/**
 * DENEME LİGİ · SONUÇ — web `denemeler/[id]/sonuc`. Veri
 * `GET /api/odk/student/exams/[id]/result` (aynı yükleyici; yalnız yayınlanmış
 * sonuç). Skorlar sunucunun puanlamasıdır; istemci resmi olmayan puan
 * hesaplamaz. AYT "Benim alanım" görünümü sunucunun `inTrack` bayraklarıyla;
 * ham net puan tahmini değildir. Karşılaştırma yalnız aynı aileden kendi
 * sonuçlarıyla; sıralama / lig yok.
 */
export default function OdkExamResultScreen({ examId }: { examId: string }) {
  const query = useOdkQuery('result', (api, signal) => fetchOdkResult(api, examId, signal), { params: { examId }, gcTime: SENSITIVE_GC_MS });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="odk-result">
      {query.error instanceof ApiError && query.error.kind === 'not_found' && !query.data ? (
        <EmptyState title="Sonucun henüz açıklanmadı." body="Açıklandığında burada göreceksin. Erişim süren dolduysa sonucu burada gösteremiyoruz." />
      ) : (
        <QueryView query={query}>{(result) => <ResultBody result={result} />}</QueryView>
      )}
    </Screen>
  );
}

function ResultBody({ result }: { result: MobileOdkResult }) {
  const [mode, setMode] = useState<'benim' | 'tumu'>(result.track ? 'benim' : 'tumu');
  const scoped = <T extends { inTrack: boolean }>(rows: T[]) => (mode === 'benim' ? rows.filter((row) => row.inTrack) : rows);
  const delta = formatDelta(result.summary.delta);
  const strong = result.outcomes.filter((item) => item.group === 'strong').sort((a, b) => b.accuracy - a.accuracy);
  const improve = result.outcomes.filter((item) => item.group === 'improve');
  const timeSections = scoped(result.time.sections);
  const slowest = [...timeSections].sort((a, b) => b.totalActiveMs - a.totalActiveMs)[0];
  return (
    <>
      <PageHeader
        title="Deneme sonucun"
        context={<FamilyTag family={result.exam.family} />}
        description={`${result.exam.title}${result.exam.resultsReleasedAt ? ` · ${formatDayMonth(result.exam.resultsReleasedAt)}` : ''}. Sonucun yalnızca senin cevapların ve kilitli cevap anahtarıyla hesaplandı.`}
      />
      <View style={styles.summary} accessible accessibilityLabel={`Net ${formatNet(result.summary.totalNet)}`}>
        <Text variant="caption" tone="muted">Net</Text>
        <Text variant="numeric" style={styles.big}>{formatNet(result.summary.totalNet)}</Text>
      </View>
      <Section first>
        <Row title="Doğru · Yanlış · Boş" meta={`${result.summary.correct} · ${result.summary.wrong} · ${result.summary.blank}`} />
        {formatDurationMs(result.summary.activeDurationMs) ? <Row title="Aktif süre" meta={formatDurationMs(result.summary.activeDurationMs)} /> : null}
        {delta ? <Row title="Önceki denemene göre" subtitle={result.summary.previousTitle} trailing={<StatusBadge label={`${delta} net`} tone={deltaTone(result.summary.delta)} />} /> : null}
        {result.track ? <Row title={`${result.track.label} ham neti`} meta={formatNet(result.track.trackNet)} /> : null}
      </Section>
      {result.track ? (
        <View style={styles.track}>
          <SegmentedTabs
            label="AYT görünümü"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'benim', label: `Benim alanım (${result.track.label})` },
              { value: 'tumu', label: 'Tüm bölümler' },
            ]}
          />
          <Text tone="muted" variant="meta">Burada ham netini görüyorsun; bu bir puan tahmini değil.</Text>
        </View>
      ) : null}
      {scoped(result.sections).length ? (
        <Section title="Dersler">
          {scoped(result.sections).map((section, index) => (
            <Row
              key={section.code ?? index}
              title={section.title}
              subtitle={`D ${section.correct ?? '—'} · Y ${section.wrong ?? '—'} · B ${section.blank ?? '—'}`}
              meta={section.net === null ? '—' : `${formatNet(section.net)} net`}
            />
          ))}
        </Section>
      ) : null}
      <Section title="İyi olduğun konular">
        {strong.length ? strong.map((item) => <OutcomeRow key={item.code} item={item} />) : <Text tone="secondary">Bu denemede öne çıkan bir konu olmadı; her deneme yeni bir başlangıç.</Text>}
      </Section>
      <Section title="Biraz daha çalışabileceğin konular">
        {improve.length ? improve.map((item) => <OutcomeRow key={item.code} item={item} />) : <Text tone="secondary">Bu denemede eksik görünen bir konu yok, harika!</Text>}
      </Section>
      <Section title="Zaman analizi">
        {timeSections.length ? (
          <>
            {slowest ? <Text tone="secondary" variant="secondary">{`En çok vakit ayırdığın bölüm: ${slowest.title} (${Math.round(slowest.totalActiveMs / 60000)} dk).`}</Text> : null}
            {timeSections.map((section) => (
              <Row
                key={section.code}
                title={section.title}
                subtitle={`Doğru ort. ${section.correctAvgMs == null ? '—' : `${Math.round(section.correctAvgMs / 1000)} sn`} · Yanlış ort. ${section.wrongAvgMs == null ? '—' : `${Math.round(section.wrongAvgMs / 1000)} sn`}`}
                meta={`${Math.round(section.totalActiveMs / 60000)} dk`}
              />
            ))}
            {result.time.fastWrongCount || result.time.longWrongCount ? (
              <Text tone="muted" variant="meta">{`Hızlı yanlış: ${result.time.fastWrongCount} soru · Uzun süreli yanlış: ${result.time.longWrongCount} soru`}</Text>
            ) : null}
          </>
        ) : (
          <Text tone="secondary">Bu deneme için süre bilgisi kaydedilmemiş.</Text>
        )}
      </Section>
      <Section title="Soru dökümü" action={result.answerKey.available && result.answerKey.hasFile ? <AnswerKeyButton examId={result.exam.id} /> : undefined}>
        <ResultQuestions questions={scoped(result.questions)} answerKeyAvailable={result.answerKey.available} />
      </Section>
      {result.comparison.length > 1 ? (
        <Section title={`${result.exam.family} net gelişimi`}>
          <Text tone="muted" variant="meta">Yalnızca kendi açıklanan denemelerinle karşılaştırılır.</Text>
          {result.comparison.map((item) => (
            <Row key={item.examId} title={item.title} subtitle={formatDayMonth(item.takenAt)} meta={`${formatNet(item.totalNet)} net`} selected={item.current} />
          ))}
        </Section>
      ) : null}
      <NextSteps result={result} />
    </>
  );
}

function OutcomeRow({ item }: { item: MobileOdkResult['outcomes'][number] }) {
  const tone = item.accuracy >= 75 ? 'success' : item.accuracy >= 50 ? 'warning' : 'critical';
  const meta = [item.unitName, `${item.questionCount} soru`, `${item.correct} D, ${item.wrong} Y, ${item.blank} B`, item.avgSecondsPerQuestion != null ? `ort. ${item.avgSecondsPerQuestion} sn/soru` : null, item.evidenceCount != null ? `${item.evidenceCount} ölçüm` : null, item.lowEvidence ? 'az kanıt' : null]
    .filter(Boolean)
    .join(' · ');
  return <Row title={item.title} subtitle={`${item.code} · ${meta}`} trailing={<StatusBadge label={`%${item.accuracy.toFixed(0)}`} tone={tone} />} />;
}

function AnswerKeyButton({ examId }: { examId: string }) {
  const opener = useAnswerKeyOpener(examId);
  return (
    <View>
      <Button label="Cevap anahtarı" variant="quiet" loading={opener.opening} onPress={() => void opener.open()} testID="odk-answer-key" />
      {opener.error ? <Text tone="muted" variant="meta">{opener.error}</Text> : null}
    </View>
  );
}

function NextSteps({ result }: { result: MobileOdkResult }) {
  const cross = useCrossProductOpen();
  const answerKey = useAnswerKeyOpener(result.exam.id);
  const items = result.recommendations;
  if (!items.length && !result.coachSuggestions.length) {
    return (
      <Section title="Sonraki adım">
        <EmptyState title="Şimdilik net bir öneri çıkaramadık." body="Bir sonraki denemenle tablo netleşince sana ne çalışabileceğini burada söyleyeceğiz." />
      </Section>
    );
  }
  return (
    <Section title="Sonraki adım">
      {cross.error ? <Banner tone="critical">{cross.error}</Banner> : null}
      {answerKey.error ? <Banner tone="warning">{answerKey.error}</Banner> : null}
      {result.coachSuggestions.map((item) => (
        <Row key={item.outcomeCode} title={`Koçundan plan önerisi · ${item.subject} → ${item.topic}`} subtitle={`${item.label} Koçun onaylarsa planına eklenir.`} />
      ))}
      {items.map((item, index) => {
        const target = item.target;
        const action =
          !item.actionLabel || target.type === 'none'
            ? null
            : target.type === 'answer-key'
              ? result.answerKey.available && result.answerKey.hasFile
                ? () => void answerKey.open()
                : null
              : cross.available(target)
                ? () => void cross.open(target)
                : null;
        return (
          <View key={`${item.title}-${index}`} style={styles.step}>
            <Text variant="bodyStrong">{item.title}</Text>
            <Text tone="secondary" variant="secondary">{item.detail}</Text>
            {action && item.actionLabel ? <Button label={item.actionLabel} variant={item.primary ? 'primary' : 'secondary'} loading={cross.pending || answerKey.opening} onPress={action} testID={`odk-step-${index}`} /> : null}
          </View>
        );
      })}
    </Section>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 2, paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  big: { fontSize: 32, lineHeight: 38 },
  track: { gap: space[1], marginTop: space[3] },
  step: { gap: space[1], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
});
