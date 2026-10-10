import { RUBRIC_LEVELS, type MobileSubmissionDetail } from '@contracts/staff';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, PageHeader, Row, Screen, SegmentedTabs, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { fetchSubmission, reviewSubmission } from '@/lib/api/staff';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { confirmAction, OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, usePullToRefresh, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

const LEVEL_LABEL = { NEEDS_WORK: 'Geliştirilmeli', DEVELOPING: 'Gelişiyor', MEETS: 'Karşılıyor' } as const;
type Level = (typeof RUBRIC_LEVELS)[number];

/**
 * TESLİM DEĞERLENDİRME — MEVCUT `POST /api/panel/assignment-submissions/[id]/review`.
 * Rubric ölçütleri sunucudan; her ölçüt TAM bir kez puanlanmadan gönderim yok.
 * 409 / 404 (kuyruktan çıkmış) → teslim yeniden yüklenir.
 */
export function TeacherSubmissionScreen({ submissionId }: { submissionId: string }) {
  const query = useStaffQuery('OD', 'teacher-submission', (api, signal) => fetchSubmission(api, submissionId, signal), { params: { submissionId } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-submission">
      <QueryView query={query} disabledTitle="Kanıtlı teslim şu anda açık değil.">{(data) => <Review key={`${data.id}:${data.version}`} data={data} refetch={() => query.refetch()} />}</QueryView>
    </Screen>
  );
}

function Review({ data, refetch }: { data: MobileSubmissionDetail; refetch: () => Promise<unknown> }) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff('OD');
  const opened = useRef(Date.now());
  const [scores, setScores] = useState<Record<string, Level>>({});
  const [feedback, setFeedback] = useState('');
  const [state, setState] = useState<WriteState>(null);
  const mutation = useMutation({ mutationFn: (decision: 'APPROVE' | 'REQUEST_CHANGES') => reviewSubmission(api, data.id, { expectedVersion: data.version, decision, feedback: feedback.trim(), interactionDurationMs: Math.min(30 * 60_000, Date.now() - opened.current), scores: data.criteria.map((criterion) => ({ criterionId: criterion.id, level: scores[criterion.id] })) }) });
  const complete = data.criteria.length >= 2 && data.criteria.every((criterion) => scores[criterion.id]);
  const ready = complete && feedback.trim().length >= 2;
  const reviewable = data.status === 'SUBMITTED';

  async function decide(decision: 'APPROVE' | 'REQUEST_CHANGES') {
    if (!ready || mutation.isPending || !online) return;
    const ok = await confirmAction({ title: decision === 'APPROVE' ? 'Teslimi onayla' : 'Yeniden deneme iste', message: 'Öğrenciye geri bildirim bildirimi gider. Bu işlem geri alınamaz.', confirmLabel: decision === 'APPROVE' ? 'Onayla' : 'Gönder' });
    if (!ok) return;
    setState(null);
    try {
      const result = await mutation.mutateAsync(decision);
      setState({ tone: 'success', message: result.status === 'APPROVED' ? 'Teslim onaylandı.' : 'Yeniden deneme isteği gönderildi.' });
      await invalidate();
    } catch (error) {
      // Değerlendirilmiş teslim kuyruktan çıkar: mevcut uç ikinci denemede 404 döner.
      const gone = error instanceof ApiError && error.kind === 'not_found';
      const next = gone ? { tone: 'warning' as const, message: 'Bu teslim artık değerlendirme kuyruğunda değil; başka bir yerde değerlendirilmiş olabilir.' } : writeError(error, 'Bu teslim başka bir yerde değerlendirildi. Son durum yüklendi.');
      setState(next);
      if (next?.tone === 'warning') {
        await invalidate();
        await refetch();
      }
    }
  }

  return (
    <>
      <PageHeader title={data.assignment.title} description={`${data.studentName} · ${data.assignment.groupName}`} context={<Text tone="muted" variant="meta">{`${data.attemptNumber}. deneme · ${formatShortDateTime(data.submittedAt)}`}</Text>} />
      <OfflineWriteNotice online={online} />
      <WriteBanner state={state} webPath="/panel/ogretmen/odevler" />
      <Section title="Öğrencinin kanıtı" first>
        <View style={staffStyles.card}><Text>{data.textEvidence || '—'}</Text></View>
        {data.assignment.description ? <Text tone="muted" variant="meta">{data.assignment.description}</Text> : null}
      </Section>
      {data.previous.length ? (
        <Section title="Önceki denemeler">
          {data.previous.map((item) => <Row key={item.attemptNumber} title={`${item.attemptNumber}. deneme`} subtitle={item.feedback ?? undefined} trailing={<StatusBadge label={item.status === 'APPROVED' ? 'Onaylandı' : item.status === 'CHANGES_REQUESTED' ? 'Yeniden deneme' : 'Bekliyor'} tone="neutral" />} />)}
        </Section>
      ) : null}
      {!reviewable ? (
        <EmptyState title={data.status === 'APPROVED' ? 'Bu teslim onaylandı' : 'Bu teslim için yeniden deneme istendi'} body="Değerlendirilmiş teslim tekrar değerlendirilemez." />
      ) : data.criteria.length < 2 ? (
        <EmptyState title="Bu ödevin rubric ölçütleri eksik" body="Değerlendirme için web panelini kullanın." />
      ) : (
        <>
          <Section title="Rubric">
            {data.criteria.map((criterion) => (
              <View key={criterion.id} style={staffStyles.gap}>
                <Text variant="bodyStrong">{criterion.label}</Text>
                <SegmentedTabs label={criterion.label} value={scores[criterion.id] ?? ('' as Level)} onChange={(level) => setScores((current) => ({ ...current, [criterion.id]: level }))} options={RUBRIC_LEVELS.map((level) => ({ value: level, label: LEVEL_LABEL[level] }))} />
              </View>
            ))}
          </Section>
          <Section title="Geri bildirim (öğrenci görür)">
            <TextField label="Geri bildirim" value={feedback} maxLength={1000} multiline onChangeText={setFeedback} hint="En az 2 karakter." />
          </Section>
          {!complete ? <Text tone="muted" variant="meta">Her ölçütü bir kez değerlendirin.</Text> : null}
          <View style={staffStyles.row}>
            <Button label="Onayla" disabled={!ready || mutation.isPending || !online} loading={mutation.isPending && mutation.variables === 'APPROVE'} onPress={() => void decide('APPROVE')} testID="review-approve" />
            <Button label="Yeniden deneme iste" variant="secondary" disabled={!ready || mutation.isPending || !online} onPress={() => void decide('REQUEST_CHANGES')} testID="review-changes" />
          </View>
        </>
      )}
    </>
  );
}
