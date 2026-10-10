import type { MobileCoachingSession, MobileYonCoaching, YonRescheduleReason } from '@contracts/yon';
import { YON_RESCHEDULE_REASONS } from '@contracts/yon';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { color, space } from '@/design/tokens';
import { fetchYonCoaching } from '@/lib/api/yon';
import { formatDateTime, formatDayMonth } from '@/lib/format/istanbul';
import { isSafeExternalUrl } from '@/lib/links';

import { useAcceptSessionProposal, useRescheduleRequest } from './hooks';
import { RESCHEDULE_REASON_LABEL, TASK_STATUS_LABEL } from './model';
import { QueryView, useOnline, usePullToRefresh, useYonQuery } from './shared';

/**
 * YÖN · KOÇUM — web `app/panel/ogrenci/kocluk`. Veri
 * `GET /api/panel/student/coaching` (aynı yükleyiciler). Saat değişikliği talebi ve koçun
 * önerdiği yeni saatin onayı panelle aynı uçtan yapılır. Koçun gizli notu ve iç notları
 * sunucudan hiç gelmez. Koçun eklediği çalışmalar OD ödevlerinden ayrıdır.
 */
export default function YonCoachingScreen() {
  const query = useYonQuery('coaching', (api, signal) => fetchYonCoaching(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  const data = query.data;
  const description =
    data?.state === 'READY' && data.coach
      ? `${data.coach.name}${data.coach.cadenceDays ? ` · ${data.coach.cadenceDays} günde bir görüşme` : ''}`
      : 'Koçunla görüşmelerin ve sana bıraktığı notlar burada.';
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="yon-coaching">
      <PageHeader title="Koçum" description={description} />
      <QueryView query={query}>{(hub) => <CoachingBody hub={hub} />}</QueryView>
    </Screen>
  );
}

function CoachingBody({ hub }: { hub: MobileYonCoaching }) {
  if (hub.state === 'NO_PROFILE') {
    return <EmptyState title="Hesabını hazırlıyoruz." body="Her şey hazır olduğunda koçunu ve görüşmelerini burada göreceksin." />;
  }
  return (
    <>
      {hub.coach ? (
        <Section title="Koçun" first>
          <Row title="Koç" meta={hub.coach.name} />
          <Row title="Sonraki görüşme" meta={hub.coach.overdue ? 'Yeni saat belirleniyor' : hub.coach.nextScheduledAt ? formatDateTime(hub.coach.nextScheduledAt) : 'Planlanmadı'} />
          {hub.coach.lastCompletedAt ? <Row title="Son görüşme" meta={formatDayMonth(hub.coach.lastCompletedAt)} /> : null}
          {hub.coach.focus ? <Row title="Bu haftanın odağı" subtitle={hub.coach.focus} /> : null}
        </Section>
      ) : (
        <EmptyState title="Koçunla çok yakında tanışacaksın." body="Koçun belli olduğunda görüşmelerin ve önerileri burada olacak." />
      )}
      {hub.coach ? (
        <Section title="Görüşmeler">
          <Text tone="secondary" variant="secondary">Saat sana uymuyorsa nedenini seçip değişiklik isteyebilirsin.</Text>
          {hub.upcoming.length ? hub.upcoming.map((session) => <SessionCard key={`${session.id}:${session.version}`} session={session} />) : <Text tone="secondary">Şimdilik planlanmış bir görüşmen yok.</Text>}
        </Section>
      ) : null}
      <Section title="Ortak notlar">
        {hub.sharedNotes.length ? (
          hub.sharedNotes.map((note) => (
            <View key={note.id} style={styles.note}>
              <Text>{note.body}</Text>
              <Text tone="muted" variant="meta">{formatDayMonth(note.at)}</Text>
            </View>
          ))
        ) : (
          <Text tone="secondary">Koçun bu hafta henüz yeni bir not bırakmadı.</Text>
        )}
      </Section>
      <Section title="Yapılacaklar">
        <Text tone="secondary" variant="secondary">Koçunun bu hafta sana özel eklediği çalışmalar.</Text>
        {hub.coachTasks === null ? (
          <Text tone="secondary">Koçunla belirlediğiniz çalışmalar hazır olunca burada göreceksin.</Text>
        ) : hub.coachTasks.length ? (
          hub.coachTasks.map((task) => (
            <Row
              key={task.id}
              title={task.title}
              meta={`${formatDayMonth(task.scheduledFor)} · ${task.durationMinutes} dk`}
              trailing={
                task.status === 'DONE' || task.status === 'PARTIAL' ? <StatusBadge label="Tamamlandı" tone="success" /> : task.status === 'COULD_NOT' ? <StatusBadge label={TASK_STATUS_LABEL.COULD_NOT} tone="warning" /> : undefined
              }
            />
          ))
        ) : (
          <Text tone="secondary">Koçun bu hafta ayrıca bir çalışma eklemedi. Plan görevlerin Bugün sayfasında seni bekliyor.</Text>
        )}
      </Section>
      {hub.past.length ? (
        <Section title="Geçmiş görüşmeler">
          {hub.past.map((item) => (
            <Row
              key={item.id}
              title={formatDayMonth(item.at)}
              subtitle={item.focus}
              trailing={<StatusBadge label={item.status === 'COMPLETED' ? 'Yapıldı' : item.status === 'CANCELLED' ? 'İptal edildi' : 'Kaçırıldı'} tone={item.status === 'COMPLETED' ? 'success' : 'neutral'} />}
            />
          ))}
        </Section>
      ) : null}
    </>
  );
}

function SessionCard({ session }: { session: MobileCoachingSession }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const accept = useAcceptSessionProposal(session);
  const online = useOnline();
  const [reason, setReason] = useState<YonRescheduleReason>('SCHOOL_SCHEDULE');
  const request = useRescheduleRequest(session);
  const now = Date.now();
  const past = Date.parse(session.scheduledAt) < now;
  const meetingUrl = session.meetingUrl && !past && isSafeExternalUrl(session.meetingUrl) ? session.meetingUrl : null;
  return (
    <View style={styles.session} testID={`yon-session-${session.id}`}>
      <Text variant="bodyStrong">{past ? 'Yeni saat belirleniyor' : formatDateTime(session.scheduledAt)}</Text>
      {accept.feedback ? <Banner tone={accept.feedback.tone}>{accept.feedback.message}</Banner> : null}
      {request.feedback ? <Banner tone={request.feedback.tone}>{request.feedback.message}</Banner> : null}
      {session.rescheduleRequestedAt ? (
        <Text tone="secondary" variant="secondary">{`Saat değişikliği isteğin koçuna ulaştı.${session.rescheduleReason ? ` ${RESCHEDULE_REASON_LABEL[session.rescheduleReason]}` : ''}`}</Text>
      ) : null}
      {session.proposedAt ? (
        <>
          <Text tone="secondary" variant="secondary">{`Önerilen saat: ${formatDateTime(session.proposedAt)}`}</Text>
          <Button label="Yeni saati onayla" variant="secondary" disabled={!online || Date.parse(session.proposedAt) <= now} onPress={() => setConfirm(true)} testID={`yon-accept-${session.id}`} />
        </>
      ) : null}
      <View style={styles.actions}>
        {meetingUrl ? <Button label="Görüşmeye katıl" onPress={() => void Linking.openURL(meetingUrl)} testID={`yon-join-${session.id}`} /> : null}
        {!session.rescheduleRequestedAt ? <Button label="Saat değiştir" variant="secondary" onPress={() => setOpen(true)} testID={`yon-reschedule-${session.id}`} /> : null}
      </View>
      <BottomSheet visible={confirm} title="Yeni görüşme saatini onayla" onClose={() => { if (!accept.submitting) setConfirm(false); }}>
        <Text>{session.proposedAt ? formatDateTime(session.proposedAt) : 'Şu an önerilmiş yeni bir saat yok.'}</Text>
        <Button label="Bu saati onaylıyorum" testID="yon-accept-confirm" loading={accept.submitting} disabled={!online} onPress={async () => { await accept.submit(); setConfirm(false); }} />
      </BottomSheet>
      <BottomSheet visible={open} title="Saat neden uymuyor?" onClose={() => setOpen(false)}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Saat değişikliği nedeni">
          {YON_RESCHEDULE_REASONS.map((value) => (
            <Row key={value} title={RESCHEDULE_REASON_LABEL[value]} selected={reason === value} onPress={() => setReason(value)} testID={`yon-reason-${value}`} />
          ))}
        </View>
        <Button
          label="Koçuma ilet"
          loading={request.submitting}
          testID="yon-reschedule-submit"
          onPress={async () => {
            if (await request.submit(reason)) setOpen(false);
          }}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { gap: space[1], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  session: { gap: space[2], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
