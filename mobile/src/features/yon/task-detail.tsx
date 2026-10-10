import type { MobileYonTask, YonCompletionField, YonCompleteStatus } from '@contracts/yon';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { fetchYonPlan, type TaskCompletionPayload } from '@/lib/api/yon';
import { formatLongDate, formatTime } from '@/lib/format/istanbul';

import { useTaskCompletion } from './hooks';
import { COMPLETE_LABEL, FIELD_LABEL, isOpenTask, parseCompletionDraft, TASK_STATUS_LABEL, taskTone } from './model';
import { QueryView, usePullToRefresh, useYonQuery } from './shared';

/**
 * YÖN · GÖREV — web Planım görev paneli (`TaskCard`). Görev, Planım ile AYNI
 * sorgudan okunur (tek önbellek kaydı); durum yazması web ile aynı uçla
 * (`/api/panel/kocum/tasks/[id]/complete`) ve aynı alanlarla. "Gerçekleşen"
 * alanları görev türüne göre sunucudan gelir (`completionFields`); doğrulama
 * sunucudadır, hata metni olduğu gibi gösterilir. İstemci tarafında ilerleme
 * kaydı tutulmaz.
 */
export default function YonTaskDetailScreen({ taskId }: { taskId: string }) {
  const query = useYonQuery('yon-plan', (api, signal) => fetchYonPlan(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="yon-task">
      <QueryView query={query} disabledTitle="Haftalık plan şu anda açık değil.">
        {(data) => {
          const plan = data.state === 'READY' ? data.plan : null;
          const task = plan?.tasks.find((item) => item.id === taskId);
          if (!plan || !task) return <EmptyState title="Görev bulunamadı." body="Görev planından kaldırılmış veya plan değişmiş olabilir. Planım ekranından güncel görevlerine bakabilirsin." />;
          return <TaskBody key={`${task.id}:${task.status}`} task={task} canComplete={plan.canComplete} />;
        }}
      </QueryView>
    </Screen>
  );
}

function TaskBody({ task, canComplete }: { task: MobileYonTask; canComplete: boolean }) {
  const completion = useTaskCompletion(task);
  const [mode, setMode] = useState<Exclude<YonCompleteStatus, 'IN_PROGRESS'> | null>(null);
  const [draft, setDraft] = useState<Partial<Record<YonCompletionField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const open = isOpenTask(task);

  function startForm(status: Exclude<YonCompleteStatus, 'IN_PROGRESS'>) {
    setMode(status);
    setFormError(null);
    // Web `emptyDraft` ile aynı ön doldurma: soru hedefi ve planlanan süre.
    setDraft({
      actualQuestions: task.targetType === 'QUESTIONS' && task.targetValue ? String(task.targetValue) : '',
      actualMinutes: task.durationMinutes > 0 ? String(task.durationMinutes) : '',
    });
  }

  async function submit() {
    if (!mode) return;
    // Web `TaskCard` ile aynı: her durumda görev türünün alanları gösterilir.
    const parsed = parseCompletionDraft(task.completionFields, draft);
    if (parsed.error) {
      setFormError(parsed.error);
      return;
    }
    setFormError(null);
    const payload: TaskCompletionPayload = { status: mode, ...parsed.values } as TaskCompletionPayload;
    if (await completion.submit(payload)) setMode(null);
  }

  return (
    <>
      <PageHeader title={task.title} description={[task.kindLabel, task.sourceLabel].filter(Boolean).join(' · ')} />
      {completion.feedback ? <Banner tone={completion.feedback.tone}>{completion.feedback.message}</Banner> : null}
      <Section title="Görev" first>
        <Row title="Durum" trailing={<StatusBadge label={TASK_STATUS_LABEL[task.status]} tone={taskTone(task.status)} />} />
        <Row title="Gün" meta={`${formatLongDate(task.scheduledFor)}${task.isFlexible ? ' · Esnek' : ` · ${formatTime(task.scheduledFor)}`}`} />
        <Row title="Süre" meta={`${task.durationMinutes} dk`} />
        {task.subject || task.topic ? <Row title="Ders / konu" subtitle={[task.subject, task.topic].filter(Boolean).join(' · ')} /> : null}
        {task.targetLabel ? <Row title="Hedef" meta={task.targetLabel} /> : null}
        {task.actualMinutes !== null || task.actualQuestions !== null ? (
          <Row title="Gerçekleşen" meta={[task.actualQuestions !== null ? `${task.actualQuestions} soru` : null, task.actualMinutes !== null ? `${task.actualMinutes} dk` : null].filter(Boolean).join(' · ')} />
        ) : null}
        {task.studentNote ? <Row title="Notun" subtitle={task.studentNote} /> : null}
        {task.linkedAssignment ? <Text tone="muted" variant="meta">Bu görev bir onlinedershanem. ödevine bağlı; ilerlemesi ödevinle birlikte tek kayıtta tutulur.</Text> : null}
      </Section>
      {!canComplete ? (
        <Text tone="secondary">Görevleri plan onaylandığında işaretleyebilirsin.</Text>
      ) : open ? (
        <Section title="Durumunu bildir">
          {mode ? (
            <View style={styles.form}>
              <Text variant="subsection">{COMPLETE_LABEL[mode]}</Text>
              {task.completionFields.map((field) => (
                <TextField
                  key={field}
                  label={FIELD_LABEL[field]}
                  value={draft[field] ?? ''}
                  onChangeText={(value) => setDraft((current) => ({ ...current, [field]: value }))}
                  keyboardType={field === 'studentNote' ? 'default' : 'number-pad'}
                  multiline={field === 'studentNote'}
                  maxLength={field === 'studentNote' ? 500 : 3}
                  testID={`yon-field-${field}`}
                />
              ))}
              {formError ? <Banner tone="critical">{formError}</Banner> : null}
              <View style={styles.actions}>
                <Button label="Kaydet" loading={completion.pending === mode} testID="yon-complete-submit" onPress={() => void submit()} />
                <Button label="Vazgeç" variant="quiet" disabled={completion.pending !== null} onPress={() => setMode(null)} />
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              {task.status === 'PLANNED' ? (
                <Button label="Başladım" variant="secondary" loading={completion.pending === 'IN_PROGRESS'} disabled={completion.pending !== null} testID="yon-start" onPress={() => void completion.submit({ status: 'IN_PROGRESS' })} />
              ) : null}
              {(Object.keys(COMPLETE_LABEL) as (keyof typeof COMPLETE_LABEL)[]).map((status) => (
                <Button key={status} label={COMPLETE_LABEL[status]} variant={status === 'DONE' ? 'primary' : 'secondary'} disabled={completion.pending !== null} testID={`yon-open-${status}`} onPress={() => startForm(status)} />
              ))}
            </View>
          )}
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[3] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
});
