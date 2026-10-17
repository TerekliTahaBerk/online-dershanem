import { parseTeacherRecovery, type TeacherRecovery } from '@contracts/teacher-recovery';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { confirmAction, OfflineWriteNotice, QueryView, useInvalidateStaff, useOnline, usePullToRefresh, useStableKey, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

type Command = { attendanceId: string; action: 'generate' | 'publish'; revision: string };
export default function TeacherRecoveryScreen() {
  const query = useStaffQuery('OD', 'teacher-recovery', async (api, signal) => {
    const parsed = parseTeacherRecovery(await api.request('/api/panel/staff/teacher/recovery', { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="teacher-recovery" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Telafi paketleri" description="Kaçırılan ders için taslağı kontrol et, ardından öğrenciye yayımla." /><QueryView query={query}>{(data) => <RecoveryBody data={data} />}</QueryView></Screen>;
}
function RecoveryBody({ data }: { data: TeacherRecovery }) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff('OD');
  const [state, setState] = useState<WriteState>(null);
  const stable = useStableKey<Command>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const mutation = useMutation({ mutationFn: async (input: Command) => {
    if (!online) throw new ApiError({ kind: 'network' });
    return api.request('/api/panel/staff/teacher/recovery', { method: 'POST', body: { attendanceId: input.attendanceId, action: input.action }, headers: { 'X-Od-Idempotency-Key': stable.keyFor(input), 'X-Od-Expected-Revision': input.revision } });
  } });
  async function submit(input: Command) {
    if (input.action === 'publish' && !await confirmAction({ title: 'Telafi paketini yayımla', message: 'Önizlemedeki özet ve kaynaklar öğrenciye açılacak; bildirim gönderilecek.', confirmLabel: 'Yayımla' })) return;
    setState(null);
    try { await mutation.mutateAsync(input); stable.settle(); setState({ tone: 'success', message: input.action === 'generate' ? 'Telafi taslağı hazır ✨ Yayımlamadan önce kontrol etmenizi rica ederiz.' : 'Telafi paketi yayımlandı 🧩 Öğrenciniz artık kaldığı yerden yetişebilir.' }); await invalidate(); }
    catch (error) { stable.settle(error); setState(writeError(error, 'Telafi kaydı değişti. Liste yenilendi; tekrar göndermeden önce kontrol edin.')); if (error instanceof ApiError && error.kind === 'conflict') await invalidate(); }
  }
  return <><OfflineWriteNotice online={online} /><WriteBanner state={state} />
    {!data.rows.length && <EmptyState title="Telafi bekleyen ders yok ✅" body="Son 30 gündeki devamsızlık ve izin kayıtları burada görünecek." />}
    {data.rows.map((row) => <Section key={row.attendanceId} title={row.studentName}>
      <Row title={row.lessonTitle} subtitle={formatShortDateTime(row.lessonDate)} trailing={<StatusBadge label={row.status === 'ABSENT' ? 'Katılmadı' : 'İzinli'} tone="warning" />} />
      {row.package && <>
        <StatusBadge label={row.package.status === 'DRAFT' ? 'Taslak' : row.package.status === 'PUBLISHED' ? 'Yayımlandı' : 'Tamamlandı'} />
        <Text>{row.package.summaryTopic}</Text><Text>{row.package.summaryNextStep}</Text>
        {row.package.items.map((item) => <Row key={item.id} title={item.title} subtitle={item.kind === 'MATERIAL' ? 'Materyal' : 'Ödev'} />)}
        <Text>{row.package.checkpointPrompt}</Text><Text tone="secondary">Hedef tarih: {formatShortDateTime(row.package.dueAt)}</Text>
      </>}
      {(!row.package || row.package.status === 'DRAFT') && <Button mutation label={row.package ? 'Taslağı yenile' : 'Taslak hazırla'} disabled={!online || mutation.isPending} onPress={() => void submit({ attendanceId: row.attendanceId, action: 'generate', revision: row.revision })} testID={`recovery-generate-${row.attendanceId}`} />}
      {row.package?.status === 'DRAFT' && <Button mutation label="Öğrenciye yayımla" disabled={!online || mutation.isPending} onPress={() => void submit({ attendanceId: row.attendanceId, action: 'publish', revision: row.revision })} testID={`recovery-publish-${row.attendanceId}`} />}
    </Section>)}
  </>;
}
