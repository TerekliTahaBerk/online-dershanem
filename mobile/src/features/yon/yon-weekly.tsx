import { EmptyState, PageHeader, Row, Screen, Section, Text } from '@/design/primitives';
import { WeeklyDigestContent } from '@/features/od/od-weekly-digest';
import { fetchWeeklyDigest } from '@/lib/api/student';
import { fetchYonPlan } from '@/lib/api/yon';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { formatDayMonth } from '@/lib/format/istanbul';

import { QueryView, usePullToRefresh, useYonFlag, useYonQuery } from './shared';

/**
 * YÖN · HAFTALIK — iki AYRI kavram, ayrı başlıklarla:
 *  1. Koçunun haftalık özeti (`WeeklyCoachSummary`, yalnız YAYINLANMIŞ ve
 *     öğrenciye görünen alanlar; Planım ile aynı sorgu — `adaptivePlan`).
 *  2. Ortak haftalık özet (`WeeklyDigest`, `parentWeeklyDigest`): M2 okuma
 *     ekranı aynen yeniden kullanılır. Özet uçları OD üyeliği ister
 *     (mevcut politika); bu yüzden yalnız öğrencinin aktif OD üyeliği varken
 *     istenir — politika genişletilmedi.
 */
export default function YonWeeklyScreen() {
  const bootstrap = useReadyBootstrap();
  const planEnabled = useYonFlag('adaptivePlan');
  const digestEnabled = useYonFlag('parentWeeklyDigest');
  const hasOd = (bootstrap.workspace?.products ?? []).some((product) => product.code === 'OD' && product.state === 'ACTIVE');
  const plan = useYonQuery('yon-plan', (api, signal) => fetchYonPlan(api, signal), { enabled: planEnabled });
  const digest = useYonQuery('weekly-digest', (api, signal) => fetchWeeklyDigest(api, signal), { enabled: digestEnabled && hasOd });
  const refresh = usePullToRefresh(() => Promise.all([planEnabled ? plan.refetch() : null, digestEnabled && hasOd ? digest.refetch() : null]));
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="yon-weekly">
      <PageHeader title="Haftalık özet" description="Koçunun bu hafta için yazdıkları ve ailenle birlikte gördüğün ortak özet." />
      <Section title="Koçunun haftalık özeti" first>
        {planEnabled ? (
          <QueryView query={plan} rows={2} disabledTitle="Koç özeti şimdilik kapalı.">
            {(data) =>
              data.state === 'READY' && data.coachSummary ? (
                <>
                  <Text tone="muted" variant="meta">{`${formatDayMonth(data.coachSummary.weekStart)} haftası`}</Text>
                  {data.coachSummary.studentVisibleText ? <Text>{data.coachSummary.studentVisibleText}</Text> : null}
                  {data.coachSummary.strengths ? <Row title="Güçlü yanların" subtitle={data.coachSummary.strengths} /> : null}
                  {data.coachSummary.focusAreas ? <Row title="Odak alanları" subtitle={data.coachSummary.focusAreas} /> : null}
                  {data.coachSummary.nextWeekFocus ? <Row title="Gelecek hafta" subtitle={data.coachSummary.nextWeekFocus} /> : null}
                </>
              ) : (
                <Text tone="secondary">Koçun bu haftanın özetini henüz yazmadı.</Text>
              )
            }
          </QueryView>
        ) : (
          <Text tone="secondary">Koçunun haftalık özeti hazır olunca burada göreceksin.</Text>
        )}
      </Section>
      <Section title="Ortak haftalık özet">
        {!digestEnabled ? (
          <Text tone="secondary">Haftalık özet şimdilik kapalı.</Text>
        ) : !hasOd ? (
          <EmptyState title="Ortak özet onlinedershanem. derslerinden gelir." body="Derslerin başladığında öğretmeninin hazırladığı özeti burada da göreceksin." />
        ) : (
          <QueryView query={digest} disabledTitle="Haftalık özet şimdilik kapalı.">
            {(data) => <WeeklyDigestContent data={data} product="OK" />}
          </QueryView>
        )}
      </Section>
    </Screen>
  );
}
