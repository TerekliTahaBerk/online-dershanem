import { parseTeacherDigests, parseTeacherDigestWrite, type TeacherDigests } from '@contracts/teacher-digests';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, EmptyState, PageHeader, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { confirmAction, OfflineWriteNotice, QueryView, useInvalidateStaff, useOnline, usePullToRefresh, useStableKey, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

type Command = { studentId: string; action: 'generate' | 'publish'; revision: string };
const path = '/api/panel/staff/teacher/digests';
export default function TeacherDigestsScreen() {
  const query = useStaffQuery('OD', 'teacher-digests', async (api, signal) => {
    const parsed = parseTeacherDigests(await api.request(path, { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="teacher-digests" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
    <PageHeader title="Haftalık özetler" description="Taslağı kontrol et; öğrenci ve veli aynı yayımlanan metni görür. Özel öğrenci notları ve tekil kötü günler özete alınmaz." />
    <QueryView query={query}>{(data) => <DigestBody data={data} />}</QueryView>
  </Screen>;
}
function DigestBody({ data }: { data: TeacherDigests }) {
  const { api } = useSession(); const online = useOnline(); const invalidate = useInvalidateStaff('OD');
  const [state, setState] = useState<WriteState>(null);
  const stable = useStableKey<Command>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const mutation = useMutation({ networkMode: 'always', mutationFn: async (input: Command) => {
    if (!online) throw new ApiError({ kind: 'network' });
    const response = await api.request(path, { method: 'POST', body: { studentId: input.studentId, action: input.action }, headers: { 'X-Od-Idempotency-Key': stable.keyFor(input), 'X-Od-Expected-Revision': input.revision } });
    const parsed = parseTeacherDigestWrite(response, input.action);
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  } });
  async function submit(input: Command) {
    if (input.action === 'publish' && !await confirmAction({ title: 'Haftalık özeti yayımla', message: 'Önizlemedeki aynı metin öğrenciye ve bağlı aktif velilere açılacak; bildirim gönderilecek.', confirmLabel: 'Yayımla' })) return;
    setState(null);
    try { await mutation.mutateAsync(input); stable.settle(); setState({ tone: 'success', message: input.action === 'generate' ? 'Özet taslağı hazır ✨ Yayımlamadan önce kontrol etmenizi rica ederiz.' : 'Haftalık özet öğrenci ve veliyle paylaşıldı 🌟' }); await invalidate(); }
    catch (error) { stable.settle(error); setState(writeError(error, 'Özet veya alıcılar değişti. Liste yenilendi; yayımlamadan önce kontrol edin.')); if (error instanceof ApiError && error.kind === 'conflict') await invalidate(); }
  }
  return <><OfflineWriteNotice online={online} /><WriteBanner state={state} />
    {!data.rows.length && <EmptyState title="Bu hafta için öğrenci görünmüyor" body="Aktif gruplarınızdaki öğrenciler burada görünecek." />}
    {data.rows.map((row) => <Section key={row.studentId} title={row.name}>
      <StatusBadge label={!row.digest ? 'Bu hafta taslak yok' : row.digest.status === 'DRAFT' ? 'Önizleme hazır' : 'Yayımlandı'} />
      {row.digest && <><Text variant="label">Öğrenci ve velinin göreceği aynı metin</Text>
        <Text>{row.digest.goodThingOne}</Text><Text>{row.digest.goodThingTwo}</Text><Text>{row.digest.supportArea}</Text><Text>{row.digest.homeQuestion}</Text>
        <Text tone="muted" variant="meta">Veri tarihi: {formatShortDateTime(row.digest.dataThrough)}</Text></>}
      {row.digest?.status !== 'PUBLISHED' && <Button mutation label={row.digest ? 'Taslağı yenile' : 'Sakin özet hazırla'} disabled={!online || mutation.isPending} onPress={() => void submit({ studentId: row.studentId, action: 'generate', revision: row.revision })} testID={`digest-generate-${row.studentId}`} />}
      {row.digest?.status === 'DRAFT' && <Button mutation label="Öğrenci ve veliye yayımla" disabled={!online || mutation.isPending} onPress={() => void submit({ studentId: row.studentId, action: 'publish', revision: row.revision })} testID={`digest-publish-${row.studentId}`} />}
    </Section>)}
  </>;
}
