import type { MobileLessonDetail } from '@contracts/student';
import { useState } from 'react';
import { Linking } from 'react-native';

import { Banner, Button, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchLessonDetail } from '@/lib/api/student';
import { formatDateTime, formatShortDateTime, formatTime } from '@/lib/format/istanbul';
import { isSafeExternalUrl } from '@/lib/links';
import { assignmentDetailHref, reviewRecoveryHref } from '@/navigation/od-targets';

import { QueryView, useOdNavigation, useOdQuery, usePullToRefresh } from '../shared';

/**
 * OD · DERS DETAYI — web `app/panel/ogrenci/takvim/[id]` ile AYNI sunucu
 * okuma modeli (`GET /api/panel/student/lessons/[id]`). Katılım bağlantısı
 * ve penceresi sunucudan gelir; istemci bağlantı veya saat UYDURMAZ.
 */
export function LessonDetailScreen({ lessonId }: { lessonId: string }) {
  const query = useOdQuery('lesson-detail', (api, signal) => fetchLessonDetail(api, lessonId, signal), { params: { id: lessonId } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="lesson-detail">
      <QueryView query={query}>{(detail) => <LessonDetailBody detail={detail} onRefresh={() => void query.refetch()} />}</QueryView>
    </Screen>
  );
}

function JoinSection({ detail, onRefresh }: { detail: MobileLessonDetail; onRefresh: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const { join, lesson } = detail;
  if (lesson.status === 'CANCELLED') return <Banner tone="neutral" title="Bu ders iptal edildi" />;
  if (join.state === 'OPEN' && isSafeExternalUrl(join.url)) {
    const url = join.url;
    return (
      <Section first>
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <Button
          testID="lesson-join"
          label="Derse katıl"
          accessibilityHint="Canlı ders bağlantısı tarayıcıda veya toplantı uygulamasında açılır."
          onPress={() => {
            setError(null);
            Linking.openURL(url).catch(() => setError('Bağlantı açılamadı. Toplantı uygulamasının yüklü olduğundan emin ol.'));
          }}
        />
      </Section>
    );
  }
  if (join.state === 'NOT_YET' && join.opensAt) {
    return (
      <Section first>
        <Text tone="secondary">{`Katılım bağlantısı ${formatTime(join.opensAt)}'da açılır.`}</Text>
        <Button label="Yenile" variant="quiet" onPress={onRefresh} />
      </Section>
    );
  }
  return null;
}

function LessonDetailBody({ detail, onRefresh }: { detail: MobileLessonDetail; onRefresh: () => void }) {
  const nav = useOdNavigation();
  const { lesson } = detail;
  const missed = detail.attendance.status === 'ABSENT';
  return (
    <>
      <PageHeader title={lesson.title} context={<Text tone="muted" variant="meta">{`${lesson.subject} · ${lesson.groupName}`}</Text>} />
      <JoinSection detail={detail} onRefresh={onRefresh} />
      <Section title="Ders bilgisi">
        <Row title="Tarih" meta={`${formatDateTime(lesson.startsAt)}–${formatTime(lesson.endsAt)}`} />
        <Row title="Öğretmen" meta={lesson.teacherName || '—'} />
        <Row title="Grup" meta={lesson.groupName} />
        <Row title="Katılım" trailing={<StatusBadge label={detail.attendance.label} tone={detail.attendance.tone} />} />
      </Section>
      {missed && detail.recovery && nav.has('review-recovery') ? (
        <Section title="Telafi">
          <Text tone="secondary">{detail.recovery.status === 'COMPLETED' ? 'Bu dersin telafisini tamamladın.' : 'Bu ders için hazırlanmış bir telafi paketin var.'}</Text>
          {detail.recovery.status === 'PUBLISHED' ? <Button testID="lesson-recovery" label="Telafiye başla" onPress={() => nav.push(reviewRecoveryHref('telafi', lesson.id))} /> : null}
        </Section>
      ) : null}
      <Section title="Derste ne işlendi?">
        <Text tone="secondary">{detail.topic || 'Öğretmen bu dersin özetini henüz eklemedi. Eklendiğinde burada görünecek.'}</Text>
      </Section>
      {detail.personalNote ? (
        <Section title="Öğretmen notu">
          <Text tone="secondary">{`“${detail.personalNote}”`}</Text>
        </Section>
      ) : null}
      <Section title="Verilen çalışma">
        {detail.homework ? <Text tone="secondary">{detail.homework}</Text> : null}
        {detail.assignments.length ? (
          detail.assignments.map((assignment) => {
            const href = nav.has('assignments') ? assignmentDetailHref(assignment.id) : null;
            return (
              <Row
                key={assignment.id}
                title={assignment.title}
                meta={`Teslim: ${formatShortDateTime(assignment.dueAt)}`}
                trailing={<StatusBadge label={assignment.done ? 'Tamamlandı' : 'Bekliyor'} tone={assignment.done ? 'success' : 'neutral'} />}
                onPress={href ? () => nav.push(href) : undefined}
              />
            );
          })
        ) : !detail.homework ? (
          <Text tone="muted">Bu ders için çalışma verilmedi.</Text>
        ) : null}
      </Section>
      {detail.nextGoal ? (
        <Section title="Sonraki hedef">
          <Text tone="secondary">{detail.nextGoal}</Text>
        </Section>
      ) : null}
      <Text tone="muted" variant="meta">
        Bu dersin veliye açık özeti: işlenen konu, katılım ve verilen çalışma. Öğretmenin sana özel notu veliyle paylaşılmaz.
      </Text>
    </>
  );
}
