import type { MobileParentChild, MobileParentDigest } from '@contracts/parent';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Banner, Button, EmptyState, Row, Section, Text } from '@/design/primitives';
import { fetchParentDigest, sendParentDigestFeedback } from '@/lib/api/parent';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatDayMonth, formatShortDateTime } from '@/lib/format/istanbul';
import { queryKeys } from '@/lib/query/keys';

import { isChildNotFound, useParentContext, useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, parentStyles, usePullToRefresh } from './parent-shared';

const TREND_LABEL = { IMPROVING: 'Gelişiyor', STEADY: 'Dengeli', BUILDING: 'Temel oluşuyor', LIMITED_DATA: 'Sınırlı veri' } as const;
const PULSE = [
  { value: 1, label: 'Hiç kaygı yaratmadı' },
  { value: 2, label: 'Çok az' },
  { value: 3, label: 'Dengeli' },
  { value: 4, label: 'Biraz kaygı yarattı' },
  { value: 5, label: 'Kaygı yarattı' },
];

/**
 * VELİ · HAFTALIK ÖZET — web `app/panel/veli/haftalik` (aynı yükleyici).
 * Yalnız YAYINLANMIŞ öğretmen özeti; otomatik "yaklaşanlar" ayrı bölümde ve
 * açıkça "öğretmen özeti değildir" diye etiketli.
 */
export default function ParentWeeklyScreen() {
  const query = useParentQuery('digests', fetchParentDigest);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Haftalık özet" description="Haftada bir sakin bakış" testID="parent-weekly" refresh={refresh}>
      {(child) => (
        <ParentQueryView query={query} child={child} disabledTitle="Haftalık özet şu anda açık değil.">
          {(data) => <WeeklyBody data={data} child={child} />}
        </ParentQueryView>
      )}
    </ParentScreen>
  );
}

function WeeklyBody({ data, child }: { data: MobileParentDigest; child: MobileParentChild }) {
  const digest = data.digest;
  return (
    <>
      {digest ? (
        <>
          <Text tone="muted" variant="meta">{`${formatDayMonth(digest.dataThrough)} tarihine kadarki veriler · ${TREND_LABEL[digest.trendBand]}`}</Text>
          <Section title="Öğretmen özeti · bu hafta iyi gidenler" first>
            <View style={parentStyles.card}>
              <Text tone="secondary">{digest.goodThingOne}</Text>
              <Text tone="secondary">{digest.goodThingTwo}</Text>
            </View>
          </Section>
          {digest.supportArea ? <Section title="Destek olabilecek alan"><Text tone="secondary">{digest.supportArea}</Text></Section> : null}
          {digest.homeQuestion ? <Section title="Evde konuşmak için"><Text tone="secondary">{digest.homeQuestion}</Text></Section> : null}
          {data.feedbackAvailable ? (
            <DigestFeedback digestId={digest.id} studentId={child.studentId} initial={digest.feedback} />
          ) : (
            <Text tone="muted" variant="meta">Bu özet için geri bildirim web panelinden verilebilir.</Text>
          )}
        </>
      ) : (
        <EmptyState title="Haftalık özet henüz yayınlanmadı" body="Öğretmen önizlemeyi tamamladığında öğrenciyle aynı anda burada açılır." />
      )}
      <Section title="Sistemden görünenler · önümüzdeki günler">
        <Text tone="muted" variant="meta">Bu liste otomatik takvim ve koçluk kayıtlarından gelir; öğretmen özeti değildir.</Text>
        {data.upcoming.length ? (
          data.upcoming.map((item) => <Row key={`${item.kind}-${item.at}`} title={item.title} meta={formatShortDateTime(item.at)} />)
        ) : (
          <Text tone="secondary">Önümüzdeki iki hafta için planlanmış ders veya görüşme görünmüyor.</Text>
        )}
      </Section>
    </>
  );
}

function DigestFeedback({ digestId, studentId, initial }: { digestId: string; studentId: string; initial: { helpful: boolean | null; anxietyPulse: number | null } | null }) {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const client = useQueryClient();
  const context = useParentContext();
  const [helpful, setHelpful] = useState<boolean | null>(initial?.helpful ?? null);
  const [pulse, setPulse] = useState<number | null>(initial?.anxietyPulse ?? null);
  const [message, setMessage] = useState<{ tone: 'success' | 'critical'; text: string } | null>(null);
  const mutation = useMutation({ mutationFn: (input: { helpful: boolean | null; anxietyPulse: number | null }) => sendParentDigestFeedback(api, digestId, input) });

  async function save(nextHelpful: boolean | null, nextPulse: number | null) {
    if (mutation.isPending || (nextHelpful === null && nextPulse === null)) return;
    // Seçim değiştiyse (başka çocuk) bu çocuğun özetine gönderim yapılmaz.
    if (context?.selected?.studentId !== studentId) return;
    setMessage(null);
    try {
      await mutation.mutateAsync({ helpful: nextHelpful, anxietyPulse: nextPulse });
      setHelpful(nextHelpful);
      setPulse(nextPulse);
      setMessage({ tone: 'success', text: 'Geri bildiriminiz kaydedildi.' });
      // Yalnız bu çocuğun özet sorgusu yenilenir.
      await client.invalidateQueries({ queryKey: queryKeys.parentResource(bootstrap.user.id, studentId, 'digests') });
    } catch (error) {
      if (isChildNotFound(error) || (error instanceof ApiError && error.kind === 'not_found')) {
        setMessage({ tone: 'critical', text: 'Bu özet artık görüntülenemiyor. Sayfayı yenileyin.' });
        await client.invalidateQueries({ queryKey: queryKeys.parentResource(bootstrap.user.id, studentId, 'digests') });
        return;
      }
      setMessage({ tone: 'critical', text: error instanceof ApiError ? error.message : 'Geri bildirim kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.' });
    }
  }

  return (
    <Section title="Bu özet size nasıl hissettirdi?">
      {message ? <Banner tone={message.tone}>{message.text}</Banner> : null}
      <View style={parentStyles.row}>
        <Button testID="parent-digest-helpful" label="Yararlıydı" variant={helpful === true ? 'primary' : 'secondary'} disabled={mutation.isPending} onPress={() => void save(true, pulse)} />
        <Button testID="parent-digest-not-helpful" label="Yararlı değildi" variant={helpful === false ? 'primary' : 'secondary'} disabled={mutation.isPending} onPress={() => void save(false, pulse)} />
      </View>
      <Text variant="label" tone="secondary">Kaygı düzeyi (isteğe bağlı)</Text>
      <View style={parentStyles.row} accessibilityRole="radiogroup" accessibilityLabel="Özet kaygı düzeyi">
        {PULSE.map((option) => (
          <Button key={option.value} testID={`parent-digest-pulse-${option.value}`} label={option.label} variant={pulse === option.value ? 'primary' : 'quiet'} disabled={mutation.isPending} onPress={() => void save(helpful, option.value)} />
        ))}
      </View>
    </Section>
  );
}
