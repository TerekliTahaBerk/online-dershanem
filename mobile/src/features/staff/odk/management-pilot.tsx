import { parseOdkManagementPilot, parseOdkPilotWrite, type OdkManagementPilot, type OdkPilotCommand, type OdkPilotAction } from '@contracts/odk-management-pilot';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button, EmptyState, PageHeader, Row, Screen, Section, SegmentedTabs, StatusBadge, Text, TextField } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { newUuid } from '@/lib/ids';
import { confirmAction, OfflineWriteNotice, QueryView, useOnline, usePullToRefresh, WriteBanner, writeError, type WriteState } from '../shared';
import { useOdkManagementQuery } from './management-shared';
const path = '/api/panel/odk/management/pilot';
const roleLabels = { ADMIN: 'Admin', TEACHER: 'Öğretmen', STUDENT: 'Öğrenci', PARENT: 'Veli' };
const statusLabels = { DRAFT: 'Taslak', ACTIVE: 'Aktif', PAUSED: 'Duraklatıldı', COMPLETED: 'Tamamlandı', ROLLED_BACK: 'Geri alındı' };
const actions: Record<OdkPilotAction, string> = { ACTIVATE: 'Pilotu etkinleştir', PAUSE: 'Pilotu duraklat', RESUME: 'Pilotu sürdür', COMPLETE: 'Pilotu tamamla', ROLLBACK: 'Pilotu geri al' };
const reasons = [{ value: 'GUARDRAIL_BREACH', label: 'Koruma sınırı aşıldı' }, { value: 'SECURITY_INCIDENT', label: 'Güvenlik olayı' }, { value: 'DATA_QUALITY', label: 'Veri kalitesi' }, { value: 'OPERATIONAL', label: 'Operasyon' }] as const;
export default function OdkManagementPilotScreen() {
  const query = useOdkManagementQuery('pilot', async (api, signal) => { const parsed = parseOdkManagementPilot(await api.request(path, { signal })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value; }, { gcTime: 0 });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="odk-management-pilot" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Deneme Ligi pilotu" description="Pilot üyeliği ürün erişiminden ayrıdır. Geçişler yayın kapıları ve kabul kanıtlarıyla korunur." /><QueryView query={query}>{(data) => <PilotBody data={data} />}</QueryView></Screen>;
}
function PilotBody({ data }: { data: OdkManagementPilot }) {
  const { api } = useSession(); const online = useOnline(); const client = useQueryClient();
  const [name, setName] = useState('Deneme Ligi kontrollü pilot'); const [selected, setSelected] = useState<string[]>([data.currentAdminId]); const [search, setSearch] = useState(''); const [role, setRole] = useState<keyof typeof roleLabels>('ADMIN');
  const [stopReason, setReason] = useState<(typeof reasons)[number]['value']>('OPERATIONAL'); const [state, setState] = useState<WriteState>(null);
  const pending = useRef<{ fingerprint: string; run: () => Promise<string> } | null>(null);
  const mutation = useMutation({ networkMode: 'always', mutationFn: async ({ command, revision }: { command: OdkPilotCommand; revision: string }) => {
    if (!online) throw new ApiError({ kind: 'network' }); const fingerprint = JSON.stringify(command);
    if (!pending.current || pending.current.fingerprint !== fingerprint) { const key = newUuid(); pending.current = { fingerprint, run: async () => { const parsed = parseOdkPilotWrite(await api.request(path, { method: 'POST', body: command, headers: { 'X-Od-Idempotency-Key': key, 'X-Od-Expected-Revision': revision } })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value.id; } }; }
    return pending.current.run();
  } });
  async function submit(command: OdkPilotCommand, revision: string) {
    if (!online || mutation.isPending) return;
    if (command.operation === 'transition' && !await confirmAction({ title: actions[command.input.action], message: ['ACTIVATE', 'RESUME'].includes(command.input.action) ? 'Seçili katılımcıların pilot erişimi açılır. Sunucu tüm aktivasyon kapılarını yeniden kontrol eder.' : command.input.action === 'COMPLETE' ? 'Koşu kapanır. İki gerçek deneme ve kabul kanıtları tamamlanmış olmalıdır.' : 'Seçili koşunun pilot erişimi kesilir. Sınav verisi silinmez; admin kurtarma erişimi korunur.', confirmLabel: actions[command.input.action] })) return;
    setState(null);
    try { await mutation.mutateAsync({ command, revision }); pending.current = null; await client.invalidateQueries({ queryKey: ['user'] }); setState({ tone: 'success', message: command.operation === 'create' ? 'Pilot taslağı oluşturuldu. Erişim henüz açılmadı.' : 'Pilot durumu güncellendi ✅' }); }
    catch (error) { if (!(error instanceof ApiError) || !error.transient && error.kind !== 'invalid_response') pending.current = null; setState(writeError(error, 'Pilot veya adaylar değişti. Güncel görünümü kontrol edin.')); if (error instanceof ApiError && error.kind === 'conflict') await client.invalidateQueries({ queryKey: ['user'] }); }
  }
  const counts = Object.fromEntries(Object.keys(roleLabels).map((r) => [r, data.candidates.filter((c) => c.role === r && selected.includes(c.id)).length]));
  const open = data.runs.some((r) => ['DRAFT', 'ACTIVE', 'PAUSED'].includes(r.status)); const valid = name.trim().length >= 3 && counts.ADMIN >= 1 && counts.TEACHER >= 1 && counts.STUDENT >= 2 && counts.PARENT >= 1 && selected.length <= 100;
  const candidates = data.candidates.filter((c) => c.role === role && c.label.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));
  return <><OfflineWriteNotice online={online} /><WriteBanner state={state} />
    <Section title="Yayın kapıları" first><Text>{data.readiness.canActivate ? 'Aktivasyon için bloke kapı kalmadı.' : 'Bloke kapılar tamamlanmadan pilot erişimi açılamaz.'} {data.readiness.canExpand ? 'Genişleme kapıları hazır.' : 'Genel yayın için tüm kapılar hazır olmalıdır.'}</Text>
      {data.readiness.checks.map((c) => <Row key={c.key} title={c.label} subtitle={c.detail} meta={({ BLOCK: 'Bloke', WAIT: 'Bekliyor', PASS: 'Hazır' })[c.status]} />)}
    </Section>
    <Section title="Yeni pilot koşusu"><TextField label="Pilot adı" value={name} onChangeText={setName} maxLength={80} testID="odk-pilot-name" />
      <Text>{Object.entries(roleLabels).map(([r, label]) => `${label}: ${counts[r]}`).join(' · ')}</Text><Text>En az 1 admin, 1 öğretmen, 2 öğrenci ve 1 veli seçin.</Text>
      <SegmentedTabs label="Katılımcı rolü" value={role} onChange={setRole} options={Object.entries(roleLabels).map(([value, label]) => ({ value: value as keyof typeof roleLabels, label }))} />
      <TextField label="Katılımcı ara" value={search} onChangeText={setSearch} maxLength={80} />
      {candidates.map((c) => <Row key={c.id} testID={`odk-pilot-candidate-${c.id}`} title={`${selected.includes(c.id) ? '✓ ' : ''}${c.label}`} subtitle={roleLabels[c.role]} onPress={() => setSelected((ids) => ids.includes(c.id) ? ids.filter((id) => id !== c.id) : ids.length < 100 ? [...ids, c.id] : ids)} />)}
      {!candidates.length && <EmptyState title="Bu rolde aday yok" />}{open && <Text>Yeni koşu için açık pilotu tamamlayın veya geri alın.</Text>}
      <Button mutation label="Pilot taslağı oluştur" disabled={!online || !valid || open || mutation.isPending} loading={mutation.isPending} onPress={() => void submit({ operation: 'create', name: name.trim(), userIds: selected }, data.revision)} testID="odk-pilot-create" />
    </Section>
    <Section title="Pilot koşuları"><SegmentedTabs label="Durdurma nedeni" value={stopReason} onChange={setReason} options={[...reasons]} />
      {!data.runs.length && <EmptyState title="Henüz pilot koşusu yok" />}{data.runs.map((r) => <Section key={r.id} title={r.name}>
        <StatusBadge label={statusLabels[r.status]} /><Text>{r.memberCount} katılımcı · v{r.version} · {formatShortDateTime(r.createdAt)}</Text>
        <Text>{Object.entries(roleLabels).map(([role, label]) => `${label}: ${r.coverage[role as keyof typeof roleLabels]}`).join(' · ')}</Text>
        {r.startedAt && <Text>Başlangıç: {formatShortDateTime(r.startedAt)}</Text>}{r.stoppedAt && <Text>Durdurma: {formatShortDateTime(r.stoppedAt)}</Text>}{r.stopReason && <Text>Neden: {reasons.find((v) => v.value === r.stopReason)?.label || (r.stopReason === 'MANUAL_COMPLETION' ? 'Manuel tamamlama' : 'Diğer')}</Text>}
        {((r.status === 'DRAFT' ? ['ACTIVATE'] : r.status === 'ACTIVE' ? ['PAUSE', 'COMPLETE', 'ROLLBACK'] : r.status === 'PAUSED' ? ['RESUME', 'ROLLBACK'] : []) as OdkPilotAction[]).map((action) => <Button key={action} mutation label={actions[action]} variant={action === 'ROLLBACK' ? 'secondary' : 'primary'} disabled={!online || mutation.isPending || (['ACTIVATE', 'RESUME'].includes(action) && !data.readiness.canActivate) || (action === 'COMPLETE' && !data.readiness.canExpand)} onPress={() => void submit({ operation: 'transition', id: r.id, input: { action, expectedVersion: r.version, ...(['PAUSE', 'ROLLBACK'].includes(action) ? { stopReason } : {}) } }, r.revision)} testID={`odk-pilot-${r.id}-${action}`} />)}
      </Section>)}
    </Section>
  </>;
}
