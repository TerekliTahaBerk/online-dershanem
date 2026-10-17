import { parseTeacherReview, type TeacherReview } from '@contracts/teacher-review';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { SearchPicker } from '@/features/admin/ui';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { OfflineWriteNotice, QueryView, useInvalidateStaff, useOnline, usePullToRefresh, useStableKey, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

export default function TeacherReviewScreen() {
  const query = useStaffQuery('OD', 'teacher-review', async (api, signal) => {
    const parsed = parseTeacherReview(await api.request('/api/panel/staff/teacher/review', { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="teacher-review" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Kalıcılık gözetimi" description="Biriken çalışma ve tekrarlayan zorlanma sinyallerini izle." /><QueryView query={query}>{(data) => <ReviewBody data={data} />}</QueryView></Screen>;
}
function ReviewBody({ data }: { data: TeacherReview }) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff('OD');
  const [studentId, setStudentId] = useState<string | null>(data.students[0]?.id ?? null);
  const [title, setTitle] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [state, setState] = useState<WriteState>(null);
  const stable = useStableKey<{ studentId: string; title: string; sourceReference: string; revision: string }>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const mutation = useMutation({ mutationFn: async () => {
    const student = data.students.find((item) => item.id === studentId);
    if (!student || !online) throw new ApiError({ kind: 'network' });
    const input = { studentId: student.id, title: title.trim(), sourceReference: sourceReference.trim(), revision: student.revision };
    return api.request('/api/panel/review-queue', { method: 'POST', body: { studentId: input.studentId, title: input.title, sourceReference: input.sourceReference }, headers: { 'X-Od-Idempotency-Key': stable.keyFor(input), 'X-Od-Expected-Revision': input.revision } });
  } });
  async function create() {
    setState(null);
    try { await mutation.mutateAsync(); stable.settle(); setTitle(''); setSourceReference(''); setState({ tone: 'success', message: 'Kaynak yarının küçük tekrarlarına eklendi 🔁' }); await invalidate(); }
    catch (error) { stable.settle(error); setState(writeError(error, 'Öğrencinin kaydı değişti. Liste yenilendi; tekrar göndermeden önce kontrol edin.')); if (error instanceof ApiError && error.kind === 'conflict') await invalidate(); }
  }
  return <>
    <OfflineWriteNotice online={online} /><WriteBanner state={state} />
    {!data.students.length ? <EmptyState title="Şu an aktif bir öğrenciniz görünmüyor" /> : <Section title="Kendi materyalimden tekrar ekle">
      <Text tone="secondary">Kitap veya föy ve soru numarası gibi erişilebilir bir kaynak referansı verin.</Text>
      <SearchPicker label="Öğrenci" options={data.students.map((student) => ({ id: student.id, name: student.name }))} value={studentId} onChange={setStudentId} testID="review-student" />
      <TextField label="Kısa çalışma başlığı" value={title} onChangeText={setTitle} maxLength={140} testID="review-title" />
      <TextField label="Kaynak referansı" value={sourceReference} onChangeText={setSourceReference} maxLength={240} testID="review-source" />
      <Button mutation label="Tekrar ekle" disabled={!online || mutation.isPending || !data.students.some((item) => item.id === studentId) || title.trim().length < 3 || sourceReference.trim().length < 2} loading={mutation.isPending} onPress={() => void create()} testID="review-create" />
    </Section>}
    <Section title="Kuyruk gözetimi">{data.students.map((student) => <Row key={student.id} title={student.name} subtitle={`${student.activeCount} aktif · bugün ${student.dueCount} · kalıcı zorlanma ${student.persistentCount}`} meta={student.lastReviewedAt ? `Son dönüş ${formatShortDateTime(student.lastReviewedAt)}` : 'Henüz yeniden çözüm yok'} trailing={student.activeCount > 20 || student.dueCount > 5 || student.persistentCount > 0 ? <StatusBadge label="İnsan bakışı gerekli" tone="warning" /> : undefined} />)}</Section>
  </>;
}
