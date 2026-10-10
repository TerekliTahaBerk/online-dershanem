import type { MobileOdkExamDetail } from '@contracts/odk';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { color, radius, space } from '@/design/tokens';
import { openOnWeb, webUrlFor } from '@/features/shell/web-continuation';
import { fetchOdkExamDetail } from '@/lib/api/odk';
import { ApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format/istanbul';

import { FamilyTag } from './exam-row';
import { minutesLeft, resultHref } from './model';
import { QueryView, usePullToRefresh, useOdkQuery } from './shared';

/**
 * DENEME LİGİ · DENEME AYRINTISI — web `denemeler/[id]`. Veri
 * `GET /api/odk/student/exams/[id]` (salt okunur; deneme başlatılmaz).
 *
 * WEB SINAV SINIRI: Mobil deneme çalıştırmaz, başlatmaz, sürdürmez ve teslim
 * etmez. Başlama / devam etme web sınav ekranında yapılır; bağlantı sistem
 * tarayıcısında açılır ve token TAŞIMAZ — öğrencinin tarayıcıda ayrıca giriş
 * yapması gerekebilir. Oturum sırası, cevap kilidi ve teslim web sınav
 * sisteminin (sunucu) kontrolündedir.
 */
export default function OdkExamDetailScreen({ examId }: { examId: string }) {
  const query = useOdkQuery('exam', (api, signal) => fetchOdkExamDetail(api, examId, signal), { params: { examId } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="odk-exam-detail">
      {query.error instanceof ApiError && query.error.kind === 'not_found' && !query.data ? (
        <EmptyState title="Deneme bulunamadı." body="Bu deneme sana açık değil, yayından kalkmış veya erişim hakkın sona ermiş olabilir." />
      ) : (
        <QueryView query={query}>{(detail) => <DetailBody detail={detail} />}</QueryView>
      )}
    </Screen>
  );
}

function windowCopy(detail: MobileOdkExamDetail): string {
  const { startsAt, endsAt } = detail.exam;
  if (startsAt && endsAt) return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`;
  return startsAt ? formatDateTime(startsAt) : 'Başlama saati bekleniyor';
}

function DetailBody({ detail }: { detail: MobileOdkExamDetail }) {
  const { exam, state } = detail;
  const plan = exam.sessionPlan;
  return (
    <>
      <PageHeader title={exam.title} context={<FamilyTag family={exam.family} />} description={windowCopy(detail)} />
      <View style={styles.badge}>
        <StatusBadge label={state.label} tone={state.tone} />
      </View>
      <StateBlock detail={detail} />
      <Section title="Deneme bilgisi">
        <Row title="Soru sayısı" meta={`${exam.questionCount} soru`} />
        <Row title="Bölümler" subtitle={exam.sections.map((section) => `${section.title} (${section.questionCount})`).join(' · ') || '—'} />
        {plan ? (
          <Row
            title="Oturumlar"
            subtitle={plan
              .map((item, index) => `${item.title} ${item.durationMinutes} dk${index < plan.length - 1 && item.breakAfterMinutes ? ` · ${item.breakAfterMinutes} dk ara` : ''}`)
              .join(' · ')}
          />
        ) : null}
        <Row title="Süre" meta={`${exam.durationMinutes} dakika${plan && exam.sessionTotalMinutes ? ` (aralar hariç; toplam ${exam.sessionTotalMinutes} dk)` : ''}`} />
        <Row title="Geç giriş" meta={exam.lateEntryMinutes ? `Başlangıçtan sonra ${exam.lateEntryMinutes} dk` : 'Yok'} />
        <Row title="Deneme hakkı" meta={`${exam.attemptLimit}`} />
        <Row title="Gözetim" meta={exam.meetRequired ? 'Meet zorunlu' : 'Meet gerekmiyor'} />
      </Section>
      {plan ? (
        <Section title="Oturum planı">
          {plan.map((item, index) => (
            <Row
              key={item.key}
              title={`${index + 1}. ${item.title}`}
              subtitle={item.sectionTitles.join(' · ')}
              meta={`${item.durationMinutes} dk${index < plan.length - 1 && item.breakAfterMinutes ? ` + ${item.breakAfterMinutes} dk ara` : ''}`}
            />
          ))}
          <Text tone="muted" variant="meta">Oturumlar sırayla açılır; biten oturumun cevapları kilitlenir. Oturum sırası, süreler ve teslim web sınav sistemi tarafından yönetilir.</Text>
        </Section>
      ) : null}
      <Section title="Kurallar">
        <Text tone="secondary">• Süre sunucuda tutulur; sayfayı kapatmak süreyi durdurmaz.</Text>
        <Text tone="secondary">• Her cevap seçtiğin anda kaydedilir; süre bitince deneme otomatik teslim edilir.</Text>
        {exam.meetRequired ? <Text tone="secondary">• Deneme boyunca Meet görüşmesinde kalman gerekir.</Text> : null}
      </Section>
    </>
  );
}

/** Duruma göre doğru ve güvenli eylem; hiçbir durumda başlatma / devam API'si çağrılmaz. */
function StateBlock({ detail }: { detail: MobileOdkExamDetail }) {
  const router = useRouter();
  const { state } = detail;
  const canOpenWeb = Boolean(webUrlFor(detail.webPath));
  const webNotice = 'Deneme mobil uygulamada çözülmez. Web sınav ekranı tarayıcıda açılır; orada ayrıca giriş yapman gerekebilir. Kitapçıklı denemelerde bilgisayar veya tablet önerilir.';
  switch (state.key) {
    case 'UPCOMING':
      return (
        <Banner tone="info" title="Henüz açılmadı">
          {`${detail.exam.startsAt ? `${formatDateTime(detail.exam.startsAt)}'da açılır. ` : ''}Erken başlatma yok.`}
        </Banner>
      );
    case 'AVAILABLE':
      return (
        <View style={styles.block} testID="odk-available">
          <Text variant="bodyStrong">Şu anda başlayabilirsin</Text>
          <Text tone="secondary" variant="secondary">{`${webNotice} Başlattığında ${detail.exam.durationMinutes} dakikalık süren sunucuda işlemeye başlar ve durdurulamaz.`}</Text>
          {canOpenWeb ? <Button label="Web sınav ekranında aç" onPress={() => void openOnWeb(detail.webPath)} testID="odk-open-web" /> : null}
        </View>
      );
    case 'IN_PROGRESS': {
      const left = minutesLeft(detail.attempt?.deadlineAt ?? null, new Date(detail.serverNow));
      return (
        <View style={styles.block} testID="odk-in-progress">
          <Text variant="bodyStrong">{`Denemen devam ediyor${left !== null ? ` — yaklaşık ${left} dk kaldı` : ''}`}</Text>
          <Text tone="secondary" variant="secondary">{`Süre sunucuda işlemeye devam ediyor; cevapların kayıtlı. ${webNotice}`}</Text>
          {canOpenWeb ? <Button label="Web'de denemeye devam et" onPress={() => void openOnWeb(detail.webPath)} testID="odk-continue-web" /> : null}
        </View>
      );
    }
    case 'WAITING_RESULT':
      return (
        <Banner tone="neutral" title={detail.attempt?.expired ? 'Süre doldu' : 'Denemen teslim edildi'}>
          {detail.attempt?.expired ? 'Denemen süre sonunda otomatik teslim edilir. ' : ''}Sonucun açıklandığında burada görebileceksin.
        </Banner>
      );
    case 'RESULT_RELEASED': {
      const href = resultHref(detail.exam.id);
      return (
        <View style={styles.block}>
          <Text variant="bodyStrong">Sonucun ve kazanım analizin açıklandı.</Text>
          {href ? <Button label="Sonucunu gör" onPress={() => router.push(href as Href)} testID="odk-open-result" /> : null}
        </View>
      );
    }
    case 'MISSED':
      return <Banner tone="neutral" title="Kaçırıldı">{detail.startBlockedReason ?? 'Bu denemenin giriş süresi doldu.'}</Banner>;
    default:
      return <Banner tone="neutral" title="Kapandı">{detail.startBlockedReason ?? 'Bu deneme şu anda sınava açık değil.'}</Banner>;
  }
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', marginBottom: space[3] },
  block: { gap: space[2], padding: space[4], borderRadius: radius.card, borderWidth: 1, borderColor: color.border, marginBottom: space[2] },
});
