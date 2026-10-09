import type { MobileOdkResult } from '@contracts/odk';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet, Row, SegmentedTabs, StatusBadge, Text } from '@/design/primitives';
import { space } from '@/design/tokens';

/**
 * Soru dökümü — web "Soru cevap dökümü" ile aynı filtreler (Tümü · Yanlış ·
 * Boş · İşaretlediğim). Doğru cevap yalnız sunucu `correctOption` gönderdiyse
 * (cevap anahtarı yayında) gösterilir; aksi halde nötr yayın notu.
 */
type Filter = 'tumu' | 'yanlis' | 'bos' | 'isaretli';
type Question = MobileOdkResult['questions'][number];

const RESULT_LABEL = { CORRECT: 'Doğru', WRONG: 'Yanlış', BLANK: 'Boş' } as const;
const RESULT_TONE = { CORRECT: 'success', WRONG: 'critical', BLANK: 'neutral' } as const;

export function ResultQuestions({ questions, answerKeyAvailable }: { questions: Question[]; answerKeyAvailable: boolean }) {
  const [filter, setFilter] = useState<Filter>('tumu');
  const [open, setOpen] = useState<Question | null>(null);
  const match = (item: Question) => (filter === 'yanlis' ? item.result === 'WRONG' : filter === 'bos' ? item.result === 'BLANK' : filter === 'isaretli' ? item.marked : true);
  const visible = questions.filter(match);
  return (
    <View>
      <SegmentedTabs
        label="Soru filtresi"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'tumu', label: 'Tümü' },
          { value: 'yanlis', label: 'Yanlış', count: questions.filter((item) => item.result === 'WRONG').length },
          { value: 'bos', label: 'Boş', count: questions.filter((item) => item.result === 'BLANK').length },
          { value: 'isaretli', label: 'İşaretli', count: questions.filter((item) => item.marked).length },
        ]}
      />
      {!answerKeyAvailable ? <Text tone="muted" variant="meta">Doğru cevaplar, cevap anahtarı yayınlandığında görünür.</Text> : null}
      {visible.length ? (
        visible.map((item) => (
          <Row
            key={item.id}
            testID={`odk-question-${item.id}`}
            title={`${item.number}. soru · ${item.sectionTitle}`}
            subtitle={`Cevabın: ${item.selectedOption ?? 'Boş'}${item.correctOption ? ` · Doğru: ${item.correctOption}` : ''}${item.marked ? ' · İşaretli' : ''}`}
            trailing={<StatusBadge label={RESULT_LABEL[item.result]} tone={RESULT_TONE[item.result]} />}
            onPress={() => setOpen(item)}
            accessibilityHint="Soru ayrıntısını açar."
          />
        ))
      ) : (
        <Text tone="secondary">Bu filtrede soru yok.</Text>
      )}
      <BottomSheet visible={open !== null} title={open ? `Soru ${open.number}` : ''} onClose={() => setOpen(null)}>
        {open ? (
          <View style={styles.sheet}>
            <Row title="Bölüm" meta={open.sectionTitle} />
            <Row title="Sonuç" trailing={<StatusBadge label={RESULT_LABEL[open.result]} tone={RESULT_TONE[open.result]} />} />
            <Row title="Cevabın" meta={open.selectedOption ?? 'Boş bıraktın'} />
            <Row title="Doğru cevap" meta={open.correctOption ?? 'Cevap anahtarı yayınlanınca'} />
            <Row title="Süre" meta={open.activeDurationMs != null ? `${Math.round(open.activeDurationMs / 1000)} sn` : 'Süre kaydı yok'} />
            {open.marked ? <StatusBadge label="İşaretlemiştin" tone="warning" /> : null}
            {open.outcomes.map((outcome) => (
              <Row key={outcome.code} title={outcome.title} subtitle={`${outcome.code}${outcome.primary ? ' · ana kazanım' : ''}`} />
            ))}
            <Text tone="muted" variant="meta">Sorunun kendisi deneme kitapçığındadır.</Text>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({ sheet: { gap: space[1] } });
