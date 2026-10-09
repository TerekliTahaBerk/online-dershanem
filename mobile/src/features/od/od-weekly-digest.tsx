import type { MobileWeeklyDigest } from '@contracts/student';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Screen, Section, Text } from '@/design/primitives';
import { color, radius, space } from '@/design/tokens';
import { fetchWeeklyDigest, sendDigestFeedback } from '@/lib/api/student';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatDayMonth } from '@/lib/format/istanbul';

import { QueryView, useInvalidateOd, useOdQuery, usePullToRefresh } from './shared';

/**
 * OD · HAFTALIK ÖZET — web `app/panel/ogrenci/haftalik`.
 * Ailenin gördüğü özetin aynısı; öğretmenin özel notları bu özete girmez.
 * Geri bildirim mevcut `POST /api/panel/weekly-digests/[id]/feedback`
 * (upsert) ile; web `CalmDigestCard` seçenekleriyle aynı.
 */
export default function OdWeeklyDigestScreen() {
  const query = useOdQuery('weekly-digest', (api, signal) => fetchWeeklyDigest(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="od-weekly-digest">
      <PageHeader title="Haftalık özet" description="Ailenin gördüğü özet burada. Özel öğretmen notların bu özete eklenmez." />
      <QueryView query={query} disabledTitle="Haftalık özet şu anda açık değil.">
        {(data) =>
          data.state === 'NONE' ? (
            <EmptyState title="Haftalık özet henüz yayınlanmadı." body="Öğretmenin önizlemeyi tamamladığında sen ve ailen aynı özeti göreceksiniz." />
          ) : (
            <>
              <Text tone="muted" variant="meta">{`${formatDayMonth(data.digest.dataThrough)} tarihine kadarki veriler`}</Text>
              <Section title="Bu hafta iyi gidenler" first>
                <View style={styles.card}>
                  <Text tone="secondary">{data.digest.goodThingOne}</Text>
                  <Text tone="secondary">{data.digest.goodThingTwo}</Text>
                </View>
              </Section>
              <Section title="Destek olabilecek alan">
                <Text tone="secondary">{data.digest.supportArea}</Text>
              </Section>
              <Section title="Evde konuşmak için">
                <Text tone="secondary">{data.digest.homeQuestion}</Text>
              </Section>
              <DigestFeedback digest={data} />
            </>
          )
        }
      </QueryView>
    </Screen>
  );
}

const PULSE = [
  { value: 1, label: 'Hiç kaygı yaratmadı' },
  { value: 2, label: 'Çok az' },
  { value: 3, label: 'Dengeli' },
  { value: 4, label: 'Biraz kaygı yarattı' },
  { value: 5, label: 'Kaygı yarattı' },
];

function DigestFeedback({ digest }: { digest: Extract<MobileWeeklyDigest, { state: 'READY' }> }) {
  const { api } = useSession();
  const invalidate = useInvalidateOd();
  const [helpful, setHelpful] = useState<boolean | null>(digest.feedback?.helpful ?? null);
  const [pulse, setPulse] = useState<number | null>(digest.feedback?.anxietyPulse ?? null);
  const [message, setMessage] = useState<{ tone: 'success' | 'critical'; text: string } | null>(null);
  const mutation = useMutation({ mutationFn: (input: { helpful: boolean | null; anxietyPulse: number | null }) => sendDigestFeedback(api, digest.digest.id, input) });

  async function save(nextHelpful: boolean | null, nextPulse: number | null) {
    setMessage(null);
    try {
      await mutation.mutateAsync({ helpful: nextHelpful, anxietyPulse: nextPulse });
      // Seçim yalnız sunucu kaydettikten sonra işaretli gösterilir.
      setHelpful(nextHelpful);
      setPulse(nextPulse);
      setMessage({ tone: 'success', text: 'Geri bildirimin kaydedildi.' });
      await invalidate();
    } catch (error) {
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Geri bildirim kaydedilemedi.' });
    }
  }

  return (
    <Section title="Bu özet sana nasıl hissettirdi?">
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      <View style={styles.row}>
        <Button testID="digest-helpful" label="Yararlıydı" variant={helpful === true ? 'primary' : 'secondary'} disabled={mutation.isPending} onPress={() => void save(true, pulse)} />
        <Button testID="digest-not-helpful" label="Yararlı değildi" variant={helpful === false ? 'primary' : 'secondary'} disabled={mutation.isPending} onPress={() => void save(false, pulse)} />
      </View>
      <Text variant="label" tone="secondary">Kaygı düzeyi (isteğe bağlı)</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Özet kaygı düzeyi">
        {PULSE.map((option) => (
          <Button key={option.value} testID={`digest-pulse-${option.value}`} label={option.label} variant={pulse === option.value ? 'primary' : 'quiet'} disabled={mutation.isPending} onPress={() => void save(helpful, option.value)} />
        ))}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  card: { gap: space[2], backgroundColor: color.surfaceSubtle, borderRadius: radius.card, padding: space[3] },
});
