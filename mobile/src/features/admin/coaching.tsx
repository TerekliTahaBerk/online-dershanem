import type { AdminCoaching, AdminCoachingStudent } from '@contracts/admin-coaching';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, Text, TextField } from '@/design/primitives';
import { assignCoach } from '@/lib/api/admin';
import { fetchAdminCoaching, fetchAdminCoachingSession } from '@/lib/api/admin-coaching';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips, MetricGrid, MetricTile, SearchPicker } from './ui';

const statusLabels = { PLANNED: 'Planlandı', COMPLETED: 'Tamamlandı', MISSED: 'Katılmadı', CANCELLED: 'İptal' };
const reasonLabels: Record<string, string> = { SCHOOL_SCHEDULE: 'Ders veya okul saati değişti', FAMILY_SCHEDULE: 'Aile programıyla çakışıyor', TECH_ACCESS: 'Teknik destek gerekiyor' };

export default function AdminCoachingScreen() {
  const query = useAdminQuery('coaching', fetchAdminCoaching);
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-coaching"><QueryView query={query}>{(data) => <Body data={data} />}</QueryView></Screen>;
}
function Body({ data }: { data: AdminCoaching }) {
  const router = useRouter();
  const [queueId, setQueueId] = useState(data.queues.find((q) => q.count > 0)?.id ?? 'koc-bekleyen');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const queue = data.queues.find((q) => q.id === queueId) ?? data.queues[0];
  const selected = data.students.find((s) => s.id === studentId);
  const sessions = studentId ? data.sessions.filter((s) => s.studentId === studentId) : data.sessions;
  const rows = queue?.rows.filter((row) => `${row.title} ${row.detail}`.toLocaleLowerCase('tr-TR').includes(search.trim().toLocaleLowerCase('tr-TR'))) ?? [];
  return <>
    <PageHeader title="Koçluk operasyonu" description="Atama, kapasite ve öğrenci takibi" />
    <MetricGrid>{data.queues.filter((q) => ['koc-bekleyen', 'geciken', 'kapasite'].includes(q.id)).map((q) => <MetricTile key={q.id} label={q.label} value={String(q.count)} onPress={() => setQueueId(q.id)} />)}</MetricGrid>
    <FilterChips label="Koçluk kuyrukları" value={queue?.id ?? 'koc-bekleyen'} onChange={setQueueId} options={data.queues.map((q) => ({ value: q.id, label: q.label, count: q.count }))} />
    <TextField label="Öğrenci veya koç ara" value={search} onChangeText={setSearch} testID="coaching-search" />
    <Section title={queue?.label ?? 'Kuyruk'} first>{rows.length ? rows.map((row) => <Row key={row.id} title={row.title} subtitle={row.detail} onPress={row.studentId ? () => setStudentId(row.studentId) : undefined} testID={`coaching-row-${row.id}`} />) : <EmptyState title="Bu kuyrukta kayıt yok" />}</Section>
    {selected ? <Section title={selected.name}>
      <Text tone="secondary">{selected.coachName ?? 'Koç atanmadı'} · Sıklık: {selected.cadenceDays ? `${selected.cadenceDays} gün` : 'Belirlenmedi'}</Text>
      <Text tone="secondary">Son görüşme: {selected.lastCompletedAt ? formatShortDateTime(selected.lastCompletedAt) : 'Yok'} · Sonraki: {selected.nextAt ? formatShortDateTime(selected.nextAt) : 'Yok'}</Text>
      <Button label="Öğrenci 360'ı aç" variant="secondary" onPress={() => router.push(`/admin/student/${encodeURIComponent(selected.id)}` as Href)} />
      <CoachForm key={selected.id} student={selected} coaches={data.coaches} />
      <Button label="Öğrenci seçimini kapat" variant="secondary" onPress={() => setStudentId(null)} />
    </Section> : null}
    <Section title="Koç dizini">{data.coaches.map((coach) => <Row key={coach.id} title={coach.name} subtitle={`${coach.load} / ${coach.capacity ?? 'Sınırsız'} öğrenci${coach.assignable ? '' : ' · Aktif değil'}`} meta={`Bugün ${coach.today} · Geciken ${coach.overdue}`} />)}{!data.coaches.length ? <EmptyState title="Koç olarak işaretli personel yok" /> : null}</Section>
    <Section title={selected ? `${selected.name} · Görüşmeler` : 'Görüşmeler'}>{sessions.map((session) => <Row key={session.id} title={`${session.studentName} · ${session.coachName}`} subtitle={`${formatShortDateTime(session.scheduledAt)} · ${statusLabels[session.status]}`} meta={session.focus ?? undefined} onPress={() => router.push(`/admin/coaching-session/${encodeURIComponent(session.id)}` as Href)} testID={`coaching-session-${session.id}`} />)}{!sessions.length ? <EmptyState title="Görüşme kaydı yok" /> : null}</Section>
  </>;
}
function CoachForm({ student, coaches }: { student: AdminCoachingStudent; coaches: AdminCoaching['coaches'] }) {
  const [coachId, setCoachId] = useState<string | null>(student.coachId);
  const [cadenceDays, setCadence] = useState(student.cadenceDays ? String(student.cadenceDays) : '');
  const [overrideReason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useAdminMutation((api, input: { coachId: string; cadenceDays: string; overrideReason: string }, { idempotencyKey }) => assignCoach(api, { ...input, studentId: student.id, expectedRevision: student.revision }, idempotencyKey));
  const selected = coaches.find((c) => c.id === coachId && c.assignable);
  const full = selected?.capacity !== null && selected?.capacity !== undefined && selected.load - (student.coachId === coachId ? 1 : 0) >= selected.capacity;
  const valid = Boolean(selected) && (!cadenceDays || /^[1-9][0-9]{0,3}$/.test(cadenceDays)) && (!full || overrideReason.trim().length >= 3);
  async function save() {
    setNotice(null);
    try { await mutation.mutateAsync({ coachId: coachId!, cadenceDays, overrideReason }); setNotice('Koç ataması kaydedildi.'); }
    catch { /* Ortak mutasyon hatası aşağıda gösterilir. */ }
  }
  return <>
    <SearchPicker label="Koç" options={coaches.filter((c) => c.assignable).map((c) => ({ id: c.id, name: `${c.name} · ${c.load} / ${c.capacity ?? 'Sınırsız'}` }))} value={coachId} onChange={setCoachId} testID="coaching-coach" />
    <TextField label="Görüşme sıklığı (gün)" value={cadenceDays} onChangeText={setCadence} keyboardType="number-pad" maxLength={4} testID="coaching-cadence" />
    <TextField label="Kapasite aşımı gerekçesi" value={overrideReason} onChangeText={setReason} maxLength={500} hint={full ? 'Kapasite dolu; en az 3 karakter gerekli.' : 'Kapasite aşımı varsa denetim kaydına yazılır.'} testID="coaching-reason" />
    {notice ? <Banner tone="info">{notice}</Banner> : null}
    {mutation.error ? <Banner tone="critical">{adminErrorText(mutation.error)}</Banner> : null}
    <Button label={student.coachId ? 'Devret' : 'Koç ata'} testID="coaching-assign" disabled={!valid || mutation.isPending} loading={mutation.isPending} onPress={() => Alert.alert('Koç atamasını onayla', `${student.name} → ${selected?.name}`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', onPress: () => void save() }])} />
  </>;
}

export function AdminCoachingSessionScreen({ id }: { id: string }) {
  const router = useRouter();
  const query = useAdminQuery('coaching-session', (api, signal) => fetchAdminCoachingSession(api, id, signal), { params: { id } });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><QueryView query={query}>{(data) => <>
    <PageHeader title="Görüşme detayı" description={`${data.session.studentName} · ${data.session.coachName}`} />
    <Row title={formatShortDateTime(data.session.scheduledAt)} subtitle={statusLabels[data.session.status]} />
    <Row title="Odak" subtitle={data.session.focus ?? 'Belirlenmedi'} />
    <Row title="Paylaşılan not" subtitle={data.sharedNote ?? 'Not yok'} />
    <Row title="Katılım bağlantısı" subtitle={data.meetingUrl ?? 'Bağlantı yok'} />
    {data.session.completedAt ? <Row title="Tamamlanma" subtitle={formatShortDateTime(data.session.completedAt)} /> : null}
    {data.rescheduleRequestedAt ? <Row title="Saat değişikliği talebi" subtitle={`${formatShortDateTime(data.rescheduleRequestedAt)} · ${reasonLabels[data.rescheduleReason ?? ''] ?? 'Saat değişikliği istendi'}`} /> : null}
    {data.proposedAt ? <Row title="Önerilen saat" subtitle={formatShortDateTime(data.proposedAt)} /> : null}
    <Button label="Öğrenci 360'ı aç" onPress={() => router.push(`/admin/student/${encodeURIComponent(data.session.studentId)}` as Href)} />
  </>}</QueryView></Screen>;
}
