import type { MobileOdkExamList, OdkListView } from '@contracts/odk';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Screen, SegmentedTabs, Text } from '@/design/primitives';
import { space, tone } from '@/design/tokens';
import { fetchOdkExams } from '@/lib/api/odk';
import { useSession } from '@/lib/auth/session-provider';
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
 * S20: okuma sınırını aşan eski denemeler `nextCursor` ile sayfa sayfa native
 * yüklenir ve kendi ayrıntı / sonuç ekranlarında açılır.
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
      <PageHeader title="Denemelerim" description="Devam eden, başlayabileceğin ve yaklaşan denemelerin ile açıklanan sonuçların burada 📝" />
      <SegmentedTabs label="Deneme görünümü" value={view} onChange={setView} options={VIEWS.map((item) => ({ ...item, count: counts?.[item.value] }))} />
      <QueryView query={query}>
        {(data) => (
          <>
            {data.active ? (
              <View style={styles.active} accessibilityRole="summary" testID="odk-active">
                <Text variant="bodyStrong">{`${data.active.title} devam ediyor`}</Text>
                <Text tone="secondary" variant="secondary">
                  {`${data.active.deadlineAt ? `Bitiş ${formatShortDateTime(data.active.deadlineAt)}. ` : ''}Süren işliyor; denemene web sınav ekranından devam edebilirsin 💻`}
                </Text>
                {examHref(data.active.id) ? <Button label="Ayrıntı ve devam" variant="secondary" onPress={() => router.push(examHref(data.active!.id) as Href)} /> : null}
              </View>
            ) : null}
            {data.exams.length ? (
              data.exams.map((exam) => <OdkExamRow key={exam.id} exam={exam} />)
            ) : (
              <EmptyState
                title={data.counts.tumu ? 'Bu görünümde şimdilik bir deneme yok.' : 'Henüz yayınlanmış bir denemen yok 📝'}
                body={data.counts.tumu ? undefined : 'Yeni bir deneme açıldığında burada görünecek. Şimdiden başarılar! 🍀'}
              />
            )}
            {data.truncated ? <OlderExams key={`${view}:${data.generatedAt}`} first={data} view={view} /> : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

/** Daha eski sayfalar: ilk sayfanın imlecinden başlar; görünüm veya yenileme değişince sıfırlanır. */
function OlderExams({ first, view }: { first: MobileOdkExamList; view: OdkListView }) {
  const { api } = useSession();
  const [pages, setPages] = useState<MobileOdkExamList[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const last = pages.at(-1) ?? first;
  async function loadMore() {
    if (!last.nextCursor || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const page = await fetchOdkExams(api, view, undefined, last.nextCursor);
      setPages((current) => [...current, page]);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      {pages.flatMap((page) => page.exams).map((exam) => <OdkExamRow key={exam.id} exam={exam} />)}
      {failed ? <Banner tone="critical">Eski denemeler yüklenemedi. Bağlantını kontrol edip tekrar dene.</Banner> : null}
      {last.nextCursor ? (
        <Button label="Daha eski denemeleri yükle" variant="secondary" loading={loading} disabled={loading} onPress={() => void loadMore()} testID="odk-exams-older" />
      ) : last.truncated ? (
        <Banner tone="info">{`Şimdilik en yeni ${first.limit} deneme gösteriliyor. Daha eski denemelerin için web panelini kullanabilirsin.`}</Banner>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  active: { gap: space[2], padding: space[3], borderRadius: 10, backgroundColor: tone.warning.soft, marginBottom: space[3] },
});
