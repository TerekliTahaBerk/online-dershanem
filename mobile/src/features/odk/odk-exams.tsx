import type { OdkListView } from '@contracts/odk';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Screen, SegmentedTabs, Text } from '@/design/primitives';
import { space, tone } from '@/design/tokens';
import { fetchOdkExams } from '@/lib/api/odk';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { OdkExamRow } from './exam-row';
import { examHref } from './model';
import { QueryView, usePullToRefresh, useOdkQuery } from './shared';

/**
 * DENEME LİGİ · DENEMELERİM — web `app/panel/odk/ogrenci/denemeler`.
 * Veri `GET /api/odk/student/exams?gorunum=` (aynı yükleyici, aynı sıralama:
 * açık → yaklaşan → tamamlanan). Durumlar sunucunun `studentExamState`
 * kararıdır. Devam eden deneme en üstte açıklamalı satırdır; sınav web'de
 * sürer, mobil deneme çalıştırmaz. OD dış denemeleri bu ekrana girmez.
 */
const VIEWS: { value: OdkListView; label: string }[] = [
  { value: 'tumu', label: 'Tümü' },
  { value: 'yaklasan', label: 'Yaklaşan' },
  { value: 'acik', label: 'Açık' },
  { value: 'tamamlanan', label: 'Tamamlanan' },
];

export default function OdkExamsScreen() {
  const [view, setView] = useState<OdkListView>('tumu');
  const query = useOdkQuery('exams', (api, signal) => fetchOdkExams(api, view, signal), { params: { view } });
  const refresh = usePullToRefresh(() => query.refetch());
  const router = useRouter();
  const counts = query.data?.counts;
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="odk-exams">
      <PageHeader title="Denemelerim" description="Devam eden, başlayabileceğin ve yaklaşan denemelerin; bir de açıklanan sonuçların." />
      <SegmentedTabs label="Deneme görünümü" value={view} onChange={setView} options={VIEWS.map((item) => ({ ...item, count: counts?.[item.value] }))} />
      <QueryView query={query}>
        {(data) => (
          <>
            {data.active ? (
              <View style={styles.active} accessibilityRole="summary" testID="odk-active">
                <Text variant="bodyStrong">{`${data.active.title} devam ediyor`}</Text>
                <Text tone="secondary" variant="secondary">
                  {`${data.active.deadlineAt ? `Bitiş ${formatShortDateTime(data.active.deadlineAt)}. ` : ''}Süren işlemeye devam ediyor; denemene bilgisayardan, web sınav ekranından devam edebilirsin.`}
                </Text>
                {examHref(data.active.id) ? <Button label="Denemene dön" variant="secondary" onPress={() => router.push(examHref(data.active!.id) as Href)} /> : null}
              </View>
            ) : null}
            {data.exams.length ? (
              data.exams.map((exam) => <OdkExamRow key={exam.id} exam={exam} />)
            ) : (
              <EmptyState
                title={data.counts.tumu ? 'Burada şimdilik bir deneme yok.' : 'Henüz sana açılmış bir deneme yok.'}
                body={data.counts.tumu ? undefined : 'Yeni bir deneme açıldığında ilk burada göreceksin.'}
              />
            )}
            {data.truncated ? (
              <Banner tone="info">{`Burada en yeni ${data.limit} denemeni görüyorsun. Daha eskilerine web panelinden ulaşabilirsin.`}</Banner>
            ) : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  active: { gap: space[2], padding: space[3], borderRadius: 10, backgroundColor: tone.warning.soft, marginBottom: space[3] },
});
