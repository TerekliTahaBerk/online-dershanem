import { parseMockExamsAdmin, type MobileMockExams } from '@contracts/admin-rollout';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, Text } from '@/design/primitives';
import { MockExamEntryForm, MockExamReasonSheet } from '@/features/admin/rollout';
import { createMockExam, reviseMockExam, type MockExamEntry } from '@/lib/api/admin-rollout';
import { ApiError } from '@/lib/api/errors';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatDayMonth } from '@/lib/format/istanbul';
import { queryKeys } from '@/lib/query/keys';
import { useStableKey, useOnline } from '../staff/shared';
import { QueryView, usePullToRefresh } from '../od/shared';

/** Öğrencinin kendi dış denemeleri; Deneme Ligi kaynakları burada kullanılmaz. */
export default function ExternalMockExamEditor() {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const workspace = bootstrap.workspace?.activeProduct ?? null;
  const allowed = bootstrap.user.role === 'STUDENT' && (workspace === 'OD' || workspace === 'OK');
  const online = useOnline();
  const client = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<MobileMockExams['exams'][number] | null>(null);
  const query = useQuery({
    queryKey: queryKeys.workspaceResource(bootstrap.user.id, workspace, 'mock-exam-workspace'),
    queryFn: async ({ signal }) => {
      const parsed = parseMockExamsAdmin(await api.request<unknown>('/api/panel/mock-exams/workspace', { signal }));
      if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
      return parsed.value;
    },
    enabled: allowed,
  });
  const refresh = usePullToRefresh(() => query.refetch());
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.user(bootstrap.user.id) });
  const createKey = useStableKey<MockExamEntry>((a, b) => {
    // Entry telemetry changes while retrying; the server also excludes it from the operation digest.
    const { entryDurationMs: leftDuration, ...left } = a;
    const { entryDurationMs: rightDuration, ...right } = b;
    void leftDuration; void rightDuration;
    return JSON.stringify(left) === JSON.stringify(right);
  });
  const reviseKey = useStableKey<{ examId: string; body: Parameters<typeof reviseMockExam>[2] }>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const save = useMutation({ mutationFn: async (input: MockExamEntry) => {
    if (!online) throw new ApiError({ kind: 'network' });
    try { await createMockExam(api, input, createKey.keyFor(input)); createKey.settle(); }
    catch (error) { createKey.settle(error); throw error; }
  }, onSuccess: invalidate });
  const revision = useMutation({ mutationFn: async (body: Parameters<typeof reviseMockExam>[2]) => {
    if (!editing || !online) throw new ApiError({ kind: 'network' });
    const input = { examId: editing.id, body };
    try { await reviseMockExam(api, editing.id, body, reviseKey.keyFor(input)); reviseKey.settle(); }
    catch (error) { reviseKey.settle(error); throw error; }
  }, onSuccess: invalidate, onError: (error) => { if (error instanceof ApiError && error.kind === 'conflict') void invalidate(); } });

  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="external-mock-exam-editor">
    <PageHeader title="Dış denemelerim" description="Okulda, kursta veya başka bir platformda çözdüğün deneme sonuçları." />
    {!allowed ? <EmptyState title="Bu bölüm bu çalışma alanında yok" /> : <QueryView query={query} disabledTitle="Deneme analizi şu anda açık değil.">{(data) => <>
      {notice ? <Banner tone="success">{notice}</Banner> : null}
      {!online ? <Banner tone="warning">Kaydetmek için bağlantı gerekiyor. Yazdıkların bu ekranda kalır.</Banner> : null}
      {data.studentId ? <MockExamEntryForm key={data.studentId} data={data} studentId={data.studentId} onSaved={setNotice} save={save} staff={false} /> : <EmptyState title="Profilin hazırlanıyor" />}
      <Section title="Kişisel hata eğilimi">
        {data.trend.heatmap.map((item) => <Row key={item.key} title={item.subject} subtitle={item.counts.map((count, index) => count ? `${data.errorCategories[index].label}: ${count}` : null).filter(Boolean).join(' · ') || 'İşaret yok'} />)}
        {data.trend.recurring ? <Banner tone="info">{data.trend.recurring.action}</Banner> : null}
        <Text tone="muted" variant="meta">Karşılaştırma yalnızca kendi geçmiş denemelerinle yapılır.</Text>
      </Section>
      <Section title="Tüm denemeler">
        {data.exams.length ? data.exams.map((exam) => <Section key={exam.id} title={exam.title || exam.exam}>
          <Row title="Toplam net" meta={`${exam.net} net`} subtitle={`${formatDayMonth(exam.takenAt)} · ${exam.correct} doğru · ${exam.incorrect} yanlış · ${exam.blank} boş`} />
          {exam.sections.map((section) => <Row key={section.id} title={section.subjectName} meta={`${section.net} net`} subtitle={`${section.correct} doğru · ${section.incorrect} yanlış · ${section.blank} boş`} />)}
          {exam.nextAction ? <Banner tone="info" title="Öğretmen onaylı adım">{exam.nextAction}</Banner> : null}
          <Button label="Hata nedenlerini gözden geçir" variant="secondary" onPress={() => setEditing(exam)} testID={`mock-reasons-${exam.id}`} />
        </Section>) : <EmptyState title="Henüz dış deneme sonucun yok" />}
      </Section>
      {editing ? <MockExamReasonSheet key={editing.id} exam={editing} categories={data.errorCategories} revise={revision} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice('Hata nedenleri kaydedildi.'); }} /> : null}
    </>}</QueryView>}
  </Screen>;
}
