import { NOTE_VISIBILITY, type MobileCoachStudentDetail, type NoteVisibility } from '@contracts/staff';
import { useMutation } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, PageHeader, Row, Screen, SegmentedTabs, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { createCoachingSession, createCoachNote, fetchCoachStudent } from '@/lib/api/staff';
import { useSession } from '@/lib/auth/session-provider';
import { formatDayMonth, formatShortDateTime } from '@/lib/format/istanbul';

import { confirmAction, DateTimeField, isHttps, OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, usePullToRefresh, useStableKey, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

export const VISIBILITY_LABEL: Record<NoteVisibility, string> = { INTERNAL: 'Yalnız koçlar', STUDENT_VISIBLE: 'Öğrenci görür', PARENT_VISIBLE: 'Veli görür' };
const VISIBILITY_HINT: Record<NoteVisibility, string> = {
  INTERNAL: 'Öğrenci ve veli bu notu görmez.',
  STUDENT_VISIBLE: 'Öğrenci bu notu koçluk ekranında görür.',
  PARENT_VISIBLE: 'Veli bu notu veli panelinde görür.',
};

/**
 * KOÇ · ÖĞRENCİ — aktif atama ZORUNLU (sunucu). Öğrenci bağlamı yalnız bu
 * ekranın belleğinde; seçili öğrenci kalıcı saklanmaz. Not görünürlüğü AÇIK
 * seçilir, varsayılan INTERNAL.
 */
export function CoachStudentScreen({ studentId }: { studentId: string }) {
  const query = useStaffQuery('OK', 'coach-student', (api, signal) => fetchCoachStudent(api, studentId, signal), { params: { studentId }, gcTime: 0 });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="coach-student">
      <QueryView query={query}>{(data) => <Body data={data} />}</QueryView>
    </Screen>
  );
}

function Body({ data }: { data: MobileCoachStudentDetail }) {
  const router = useRouter();
  const online = useOnline();
  return (
    <>
      <PageHeader title={data.name} description={[data.classLevel, data.targetGoal].filter(Boolean).join(' · ') || undefined} />
      <OfflineWriteNotice online={online} />
      <Section title="Sıradaki görüşme" first>
        {data.nextSession ? <Row title={formatShortDateTime(data.nextSession.scheduledAt)} onPress={() => router.push(`/coach/session/${encodeURIComponent(data.nextSession!.id)}` as Href)} /> : <NewSession studentId={data.studentId} online={online} />}
      </Section>
      <Section title="Bu haftanın planı">
        {data.plan ? (
          <Row title={`${formatDayMonth(data.plan.weekStart)} haftası`} subtitle={`${data.plan.doneCount}/${data.plan.taskCount} görev tamamlandı`} onPress={() => router.push(`/coach/plan/${encodeURIComponent(data.plan!.id)}` as Href)} />
        ) : (
          <EmptyState title="Bu hafta için plan yok" />
        )}
      </Section>
      {data.recentSessions.length ? (
        <Section title="Son görüşmeler">
          {data.recentSessions.map((item) => <Row key={item.id} title={formatShortDateTime(item.scheduledAt)} subtitle={item.focus ?? item.sharedNote ?? undefined} onPress={() => router.push(`/coach/session/${encodeURIComponent(item.id)}` as Href)} />)}
        </Section>
      ) : null}
      <Notes data={data} online={online} />
    </>
  );
}

function NewSession({ studentId, online }: { studentId: string; online: boolean }) {
  const { api } = useSession();
  const invalidate = useInvalidateStaff('OK');
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(() => new Date(Date.now() + 24 * 3600_000));
  const [url, setUrl] = useState('');
  const [state, setState] = useState<WriteState>(null);
  const stable = useStableKey<string>((a, b) => a === b);
  const mutation = useMutation({ mutationFn: (payload: Parameters<typeof createCoachingSession>[1]) => createCoachingSession(api, payload) });
  const urlValue = url.trim() || null;
  const urlValid = urlValue === null || isHttps(urlValue);
  const future = at.getTime() > Date.now();

  if (!open) return <><WriteBanner state={state} /><Button label="Görüşme planla" variant="secondary" disabled={!online} onPress={() => setOpen(true)} testID="coach-new-session" /></>;
  async function save() {
    if (!future || !urlValid || mutation.isPending || !online) return;
    const scheduledAt = at.toISOString();
    const idempotencyKey = stable.keyFor(JSON.stringify({ studentId, scheduledAt, urlValue }));
    setState(null);
    try {
      await mutation.mutateAsync({ studentId, scheduledAt, meetingUrl: urlValue, idempotencyKey });
      stable.settle();
      setOpen(false);
      setState({ tone: 'success', message: 'Görüşme planlandı.' });
      await invalidate();
    } catch (error) {
      stable.settle(error);
      setState(writeError(error, 'Görüşme başka bir işlemde değişti. Listeyi yenileyin.'));
    }
  }
  return (
    <View style={staffStyles.card}>
      <WriteBanner state={state} />
      <DateTimeField label="Tarih ve saat" value={at} minimumDate={new Date()} onChange={setAt} />
      {!future ? <Text tone="secondary" variant="meta">Gelecekteki bir saat seçin.</Text> : null}
      <TextField label="Görüşme bağlantısı (isteğe bağlı)" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" error={urlValid ? undefined : 'Yalnız https:// bağlantısı.'} />
      <View style={staffStyles.row}>
        <Button label="Planla" disabled={!future || !urlValid || !online} loading={mutation.isPending} onPress={() => void save()} />
        <Button label="Vazgeç" variant="secondary" onPress={() => setOpen(false)} />
      </View>
    </View>
  );
}

function Notes({ data, online }: { data: MobileCoachStudentDetail; online: boolean }) {
  const { api } = useSession();
  const invalidate = useInvalidateStaff('OK');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<NoteVisibility>('INTERNAL');
  const [state, setState] = useState<WriteState>(null);
  const mutation = useMutation({ mutationFn: () => createCoachNote(api, { studentId: data.studentId, body: body.trim(), visibility }) });
  const ready = body.trim().length >= 2 && online && !mutation.isPending;

  async function save() {
    if (!ready) return;
    if (visibility !== 'INTERNAL') {
      const ok = await confirmAction({ title: 'Paylaşılan not', message: `${VISIBILITY_HINT[visibility]} Göndermek istiyor musun?`, confirmLabel: 'Kaydet' });
      if (!ok) return;
    }
    setState(null);
    try {
      await mutation.mutateAsync();
      setBody('');
      setVisibility('INTERNAL');
      setState({ tone: 'success', message: 'Not kaydedildi.' });
      await invalidate();
    } catch (error) {
      setState(writeError(error, 'Not kaydedilemedi. Tekrar deneyin.'));
    }
  }
  return (
    <Section title="Koç notları">
      {!data.canReadInternal ? <Text tone="muted" variant="meta">İç notları görme izniniz yok; yalnız paylaşılan notlar listelenir.</Text> : null}
      <WriteBanner state={state} />
      <View style={staffStyles.card}>
        <TextField label="Yeni not" value={body} onChangeText={setBody} maxLength={2000} multiline />
        <SegmentedTabs label="Görünürlük" value={visibility} onChange={setVisibility} options={NOTE_VISIBILITY.map((value) => ({ value, label: VISIBILITY_LABEL[value] }))} />
        <Text tone="muted" variant="meta">{VISIBILITY_HINT[visibility]}</Text>
        <Button label="Notu kaydet" disabled={!ready} loading={mutation.isPending} onPress={() => void save()} testID="coach-note-save" />
      </View>
      {data.notes.length ? (
        data.notes.map((note) => <Row key={note.id} title={note.body} subtitle={`${note.own ? 'Sen' : note.authorName} · ${formatShortDateTime(note.createdAt)}`} trailing={<StatusBadge label={VISIBILITY_LABEL[note.visibility]} tone={note.visibility === 'INTERNAL' ? 'neutral' : 'info'} />} />)
      ) : (
        <EmptyState title="Henüz not yok" />
      )}
    </Section>
  );
}
