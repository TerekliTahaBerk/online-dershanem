import type { MobileParentCoaching } from '@contracts/parent';
import { YON_RESCHEDULE_REASONS, type YonRescheduleReason } from '@contracts/yon';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, Row, Section, Text } from '@/design/primitives';
import { useOnline, useStableKey } from '@/features/staff/shared';
import { RESCHEDULE_REASON_LABEL } from '@/features/yon/model';
import { ApiError } from '@/lib/api/errors';
import { fetchParentCoaching } from '@/lib/api/parent';
import { requestSessionReschedule } from '@/lib/api/yon';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatDayMonth, formatShortDateTime } from '@/lib/format/istanbul';
import { isSafeExternalUrl } from '@/lib/links';
import { queryKeys } from '@/lib/query/keys';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, parentStyles, usePullToRefresh } from './parent-shared';

/**
 * VELİ · YÖN KOÇLUK — web `app/panel/veli/kocluk` (aynı yükleyici). Yalnız
 * yayınlanmış plan / koç özeti ve PARENT_VISIBLE notlar. Görüşmeler (V07):
 * web ile aynı uçla saat değişikliği talebi (sunucu velinin aktif, akademik
 * izinli bağını ve çocuğun OK üyeliğini yeniden doğrular) ve HTTPS katılım
 * bağlantısı. İç koç notu, ham check-in, enerji / zorluk girdisi yanıtta yok.
 */
export default function ParentCoachingScreen() {
  const query = useParentQuery('coaching', fetchParentCoaching);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Yön Koçluk" testID="parent-coaching" refresh={refresh}>
      {(child) => <ParentQueryView query={query} child={child}>{(data) => <CoachingBody data={data} />}</ParentQueryView>}
    </ParentScreen>
  );
}

function CoachingBody({ data }: { data: MobileParentCoaching }) {
  if (!data.available) return <EmptyState title="Bu öğrenci için Yön Koçluk henüz açık değil" body="Koçluk eklendiğinde haftalık plan, tamamlanma oranı ve koç özeti burada görünecek." />;
  return (
    <>
      {data.coach ? (
        <Section title="Koç" first>
          <Row title="Koçu" meta={data.coach.name} />
          <Row title="Sonraki görüşme" meta={data.coach.awaitingNewTime ? 'Yeni saat bekleniyor' : data.coach.nextScheduledAt ? formatShortDateTime(data.coach.nextScheduledAt) : 'Henüz planlanmadı'} />
          {data.coach.focus ? <Row title="Haftanın odağı" subtitle={data.coach.focus} /> : null}
          {data.coach.sharedNote ? <View style={parentStyles.card}><Text tone="secondary">{data.coach.sharedNote}</Text></View> : null}
        </Section>
      ) : (
        <Section title="Koç" first><Text tone="secondary">Koç ataması tamamlandığında koç bilgileri burada görünecek 🤝</Text></Section>
      )}

      {data.sessions.length ? (
        <Section title="Planlanan görüşmeler">
          {data.sessions.map((session) => <SessionRow key={`${session.id}:${session.version ?? 0}`} session={session} studentId={data.studentId} />)}
        </Section>
      ) : null}

      <Section title="Bu hafta">
        {data.week ? (
          <>
            <Text tone="muted" variant="meta">{`${formatDayMonth(data.week.start)} – ${formatDayMonth(data.week.end)}`}</Text>
            <Text variant="bodyStrong">{data.week.planCompletionPct === null ? 'Plan tamamlanma bilgisi henüz oluşmadı.' : `Bu haftanın planının %${data.week.planCompletionPct}'i tamamlandı 🌱`}</Text>
            {data.week.lines.map((line, index) => <Text key={`${index}-${line}`} tone="secondary">{line}</Text>)}
          </>
        ) : (
          <EmptyState title="Bu haftanın planı henüz yayınlanmadı" body="Koç haftalık planı yayınladığında tamamlanma özeti burada görünecek 🗓️" />
        )}
      </Section>

      {data.summary ? (
        <Section title="Koç özeti">
          {data.summary.coachSummary ? <Text>{data.summary.coachSummary}</Text> : null}
          {data.summary.strengths ? <Row title="Güçlü" subtitle={data.summary.strengths} /> : null}
          {data.summary.focusAreas ? <Row title="Odak" subtitle={data.summary.focusAreas} /> : null}
          {data.summary.nextWeekFocus ? <Row title="Gelecek hafta" subtitle={data.summary.nextWeekFocus} /> : null}
        </Section>
      ) : null}

      {data.notes.length ? (
        <Section title="Koç notları">
          {data.notes.map((note) => <Row key={note.id} title={note.body} subtitle={formatDayMonth(note.createdAt)} />)}
        </Section>
      ) : null}

      {data.goals.length ? (
        <Section title="Hedefler">
          {data.goals.map((goal) => <Row key={goal.id} title={goal.label} meta={goal.percent === null ? 'henüz ölçüm yok' : `%${Math.round(goal.percent)} ilerleme`} />)}
        </Section>
      ) : null}

      <Text tone="muted" variant="meta">Bu ekran sakin bir özet sunar. İç koç notları, ham check-in ayrıntıları ve diğer öğrencilerin verisi paylaşılmaz.</Text>
    </>
  );
}

type Session = MobileParentCoaching['sessions'][number];

function SessionRow({ session, studentId }: { session: Session; studentId: string }) {
  const bootstrap = useReadyBootstrap();
  const { api } = useSession();
  const client = useQueryClient();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<YonRescheduleReason>('SCHOOL_SCHEDULE');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning' | 'critical'; message: string } | null>(null);
  const key = useStableKey<{ reason: YonRescheduleReason; version: number }>((a, b) => a.reason === b.reason && a.version === b.version);
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: async (input: { reason: YonRescheduleReason; version: number }) => {
      if (!online) throw new ApiError({ kind: 'network' });
      try {
        const result = await requestSessionReschedule(api, session.id, { reason: input.reason, expectedVersion: input.version, idempotencyKey: key.keyFor(input) });
        key.settle();
        return result;
      } catch (error) {
        key.settle(error);
        throw error;
      }
    },
  });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.parentResource(bootstrap.user.id, studentId, 'coaching') });
  async function submit() {
    if (!session.version || mutation.isPending) return;
    setFeedback(null);
    try {
      await mutation.mutateAsync({ reason, version: session.version });
      setOpen(false);
      setFeedback({ tone: 'success', message: 'Saat değişikliği talebiniz koça iletildi 📨 En kısa sürede dönüş yapılacaktır.' });
      await refresh();
    } catch (error) {
      const conflict = error instanceof ApiError && error.kind === 'conflict';
      if (conflict) await refresh();
      setFeedback({ tone: conflict ? 'warning' : 'critical', message: error instanceof ApiError ? error.message : 'Talebinizi şu an iletemedik. Lütfen birazdan tekrar dener misiniz?' });
    }
  }
  const past = Date.parse(session.scheduledAt) < Date.now();
  const meetingUrl = session.meetingUrl && !past && isSafeExternalUrl(session.meetingUrl) ? session.meetingUrl : null;
  return (
    <View style={styles.session} testID={`parent-session-${session.id}`}>
      <Row
        title={formatShortDateTime(session.scheduledAt)}
        subtitle={session.proposedAt ? `Önerilen yeni saat: ${formatShortDateTime(session.proposedAt)}` : session.rescheduleRequested ? 'Saat değişikliği talebiniz alındı' : null}
      />
      {feedback ? <Banner tone={feedback.tone}>{feedback.message}</Banner> : null}
      <View style={styles.actions}>
        {meetingUrl ? <Button label="Görüşmeye katıl" variant="secondary" onPress={() => void Linking.openURL(meetingUrl)} testID={`parent-join-${session.id}`} /> : null}
        {!session.rescheduleRequested && session.version ? <Button mutation label="Saat değişikliği iste" variant="secondary" disabled={!online} onPress={() => setOpen(true)} testID={`parent-reschedule-${session.id}`} /> : null}
      </View>
      <BottomSheet visible={open} title="Saat değişikliği nedeni" onClose={() => { if (!mutation.isPending) setOpen(false); }}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Saat değişikliği nedeni">
          {YON_RESCHEDULE_REASONS.map((value) => (
            <Row key={value} title={RESCHEDULE_REASON_LABEL[value]} selected={reason === value} onPress={() => setReason(value)} testID={`parent-reason-${value}`} />
          ))}
        </View>
        <Button mutation label="Talebi ilet" loading={mutation.isPending} disabled={!online} onPress={() => void submit()} testID="parent-reschedule-submit" />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({ session: { gap: 8 }, actions: { gap: 8 } });
