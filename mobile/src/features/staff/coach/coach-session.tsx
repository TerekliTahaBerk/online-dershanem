import type { MobileCoachSessionDetail } from '@contracts/staff';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { Banner, Button, PageHeader, Row, Screen, SegmentedTabs, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { mutateCoachingSession, fetchCoachSession, type SessionMutation } from '@/lib/api/staff';
import { useSession } from '@/lib/auth/session-provider';
import { formatDayMonth, formatShortDateTime } from '@/lib/format/istanbul';

import { confirmAction, DateTimeField, isHttps, OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, usePullToRefresh, useStableKey, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';
import { SESSION_STATUS_LABEL } from './coach-sessions';

type Decision = { title: string; scheduledFor: Date; durationMinutes: string };
const DAY = 24 * 3600_000;

/**
 * KOÇ · GÖRÜŞME — MEVCUT `POST /api/panel/coaching-sessions/[id]`:
 *  - SAVE: saat / bağlantı. Öğrencinin bekleyen saat talebi varsa sunucu saati
 *    DEĞİŞTİRMEZ, öneri (`proposedAt`) olarak kaydeder; öğrenci onaylar.
 *  - COMPLETE: odak, öğrenciyle paylaşılan not, koç özel notu AYRI alanlar;
 *    en çok 3 karar yalnız bu haftanın günlerine (sunucu kuralı).
 * Her eylem `expectedVersion` + sabit `idempotencyKey`; 409 → yeniden yükle.
 */
export function CoachSessionScreen({ sessionId }: { sessionId: string }) {
  const query = useStaffQuery('OK', 'coach-session', (api, signal) => fetchCoachSession(api, sessionId, signal), { params: { sessionId }, gcTime: 0 });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="coach-session">
      <QueryView query={query}>{(data) => <Body key={`${data.id}:${data.version}`} data={data} refetch={() => query.refetch()} />}</QueryView>
    </Screen>
  );
}

function Body({ data, refetch }: { data: MobileCoachSessionDetail; refetch: () => Promise<unknown> }) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff('OK');
  const [mode, setMode] = useState<'view' | 'save' | 'complete'>('view');
  const [state, setState] = useState<WriteState>(null);
  const stable = useStableKey<string>((a, b) => a === b);
  const mutation = useMutation({ mutationFn: (payload: SessionMutation) => mutateCoachingSession(api, data.id, payload) });
  const planned = data.status === 'PLANNED';
  const pendingRequest = Boolean(data.rescheduleRequestedAt);

  async function send(build: (key: string) => SessionMutation, fingerprint: string, success: string) {
    if (mutation.isPending || !online) return;
    const key = stable.keyFor(`${data.version}:${fingerprint}`);
    setState(null);
    try {
      await mutation.mutateAsync(build(key));
      stable.settle();
      setState({ tone: 'success', message: success });
      await invalidate();
    } catch (error) {
      stable.settle(error);
      const next = writeError(error, 'Görüşme başka bir yerde değişti. Son durum yüklendi.');
      setState(next);
      if (next?.tone === 'warning') await refetch();
    }
  }

  return (
    <>
      <PageHeader title={data.studentName} description={formatShortDateTime(data.scheduledAt)} context={<StatusBadge label={SESSION_STATUS_LABEL[data.status]} tone="neutral" />} />
      <OfflineWriteNotice online={online} />
      <WriteBanner state={state} webPath="/panel/ogretmen/yon/gorusmeler" />
      {pendingRequest ? (
        <Banner tone="warning" title="Öğrenci saat değişikliği istedi">
          {`${data.rescheduleReasonLabel ?? ''}${data.proposedAt ? ` Önerdiğin saat: ${formatShortDateTime(data.proposedAt)} (öğrenci onayı bekleniyor).` : ' Yeni bir saat önerebilirsin.'}`}
        </Banner>
      ) : null}
      {isHttps(data.meetingUrl) ? (
        <Button label="Görüşme bağlantısını aç" variant="secondary" onPress={() => void Linking.openURL(data.meetingUrl!)} />
      ) : null}
      {planned ? (
        <SegmentedTabs label="İşlem" value={mode} onChange={setMode} options={[{ value: 'view', label: 'Özet' }, { value: 'save', label: pendingRequest ? 'Saat öner' : 'Saati düzenle' }, { value: 'complete', label: 'Tamamla' }]} />
      ) : null}
      {mode === 'save' && planned ? (
        <SaveForm data={data} pending={mutation.isPending} online={online} onSubmit={(at, url) => void send((key) => ({ action: 'SAVE', expectedVersion: data.version, idempotencyKey: key, scheduledAt: at, meetingUrl: url }), `save:${at}:${url}`, pendingRequest ? 'Yeni saat öğrenciye önerildi.' : 'Görüşme güncellendi.')} />
      ) : mode === 'complete' && planned ? (
        <CompleteForm
          data={data}
          pending={mutation.isPending}
          online={online}
          onSubmit={async (input) => {
            const ok = await confirmAction({ title: 'Görüşmeyi tamamla', message: input.decisions.length ? `Görüşme kapanır ve ${input.decisions.length} karar haftalık plana onay bekleyen taslak olarak eklenir.` : 'Görüşme kapanır; paylaşılan not öğrenciye görünür.', confirmLabel: 'Tamamla' });
            if (ok) await send((key) => ({ action: 'COMPLETE', expectedVersion: data.version, idempotencyKey: key, ...input }), `complete:${JSON.stringify(input)}`, 'Görüşme tamamlandı.');
          }}
        />
      ) : (
        <>
          <Section title="Odak" first><Text>{data.focus || '—'}</Text></Section>
          <Section title="Öğrenciyle paylaşılan not"><Text>{data.sharedNote || '—'}</Text></Section>
          {data.canReadPrivate ? <Section title="Koç özel notu (öğrenci görmez)"><Text>{data.privateNote || '—'}</Text></Section> : null}
          {data.completedAt ? <Row title="Tamamlandı" meta={formatShortDateTime(data.completedAt)} /> : null}
        </>
      )}
    </>
  );
}

function SaveForm({ data, pending, online, onSubmit }: { data: MobileCoachSessionDetail; pending: boolean; online: boolean; onSubmit: (at: string, url: string | null) => void }) {
  const [at, setAt] = useState(() => new Date(data.proposedAt ?? data.scheduledAt));
  const [url, setUrl] = useState(data.meetingUrl ?? '');
  const urlValue = url.trim() || null;
  const valid = at.getTime() > Date.now() && (urlValue === null || isHttps(urlValue));
  return (
    <View style={staffStyles.card}>
      <DateTimeField label="Tarih ve saat" value={at} minimumDate={new Date()} onChange={setAt} />
      <TextField label="Görüşme bağlantısı (isteğe bağlı)" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" error={urlValue === null || isHttps(urlValue) ? undefined : 'Yalnız https:// bağlantısı.'} />
      {data.rescheduleRequestedAt ? <Text tone="muted" variant="meta">Öğrencinin bekleyen talebi olduğu için bu saat öneri olarak gider; öğrenci onaylayınca kesinleşir.</Text> : null}
      <Button label="Kaydet" disabled={!valid || pending || !online} loading={pending} onPress={() => onSubmit(at.toISOString(), urlValue)} testID="coach-session-save" />
    </View>
  );
}

function CompleteForm({ data, pending, online, onSubmit }: { data: MobileCoachSessionDetail; pending: boolean; online: boolean; onSubmit: (input: { focus: string; sharedNote: string; privateNote: string; decisions: { title: string; scheduledFor: string; durationMinutes: number }[] }) => Promise<void> }) {
  const [focus, setFocus] = useState('');
  const [sharedNote, setShared] = useState('');
  const [privateNote, setPrivate] = useState('');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const weekStart = new Date(data.decisionWeekStart);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY - 60_000);
  const clampDay = () => new Date(Math.min(Math.max(Date.now(), weekStart.getTime()), weekEnd.getTime()));
  const parsed = decisions.map((item) => ({ title: item.title.trim(), scheduledFor: item.scheduledFor.toISOString(), durationMinutes: Number(item.durationMinutes) }));
  const decisionsValid = parsed.every((item) => item.title.length >= 2 && Number.isInteger(item.durationMinutes) && item.durationMinutes >= 5 && item.durationMinutes <= 480);
  const update = (index: number, patch: Partial<Decision>) => setDecisions((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <View style={staffStyles.gap}>
      <TextField label="Görüşmenin odağı" value={focus} onChangeText={setFocus} maxLength={300} />
      <TextField label="Öğrenciyle paylaşılan not" hint="Öğrenci bu notu görür." value={sharedNote} onChangeText={setShared} maxLength={4000} multiline />
      {data.canReadPrivate ? <TextField label="Koç özel notu" hint="Öğrenci ve veli görmez." value={privateNote} onChangeText={setPrivate} maxLength={4000} multiline /> : null}
      {data.decisionsEnabled ? (
        <Section title={`Haftalık kararlar (${formatDayMonth(weekStart)} haftası, en çok 3)`}>
          {decisions.map((item, index) => (
            <View key={index} style={staffStyles.card}>
              <TextField label={`Karar ${index + 1}`} value={item.title} onChangeText={(title) => update(index, { title })} maxLength={160} />
              <DateTimeField label="Gün" mode="date" value={item.scheduledFor} minimumDate={weekStart} maximumDate={weekEnd} onChange={(scheduledFor) => update(index, { scheduledFor })} />
              <TextField label="Süre (dakika, 5–480)" value={item.durationMinutes} keyboardType="number-pad" onChangeText={(durationMinutes) => update(index, { durationMinutes })} />
              <Button label="Kararı kaldır" variant="secondary" onPress={() => setDecisions((current) => current.filter((_, i) => i !== index))} />
            </View>
          ))}
          {decisions.length < 3 ? <Button label="Karar ekle" variant="secondary" onPress={() => setDecisions((current) => [...current, { title: '', scheduledFor: clampDay(), durationMinutes: '30' }])} /> : null}
        </Section>
      ) : null}
      <Button label="Görüşmeyi tamamla" disabled={!decisionsValid || pending || !online} loading={pending} onPress={() => void onSubmit({ focus: focus.trim(), sharedNote: sharedNote.trim(), privateNote: data.canReadPrivate ? privateNote.trim() : '', decisions: parsed })} testID="coach-session-complete" />
    </View>
  );
}
