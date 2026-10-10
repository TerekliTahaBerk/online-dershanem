import type { MobileCoachPlanDetail } from '@contracts/staff';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { approvePlan, fetchCoachPlan, rescheduleTask } from '@/lib/api/staff';
import { useSession } from '@/lib/auth/session-provider';
import { formatDayMonth, formatLongDate } from '@/lib/format/istanbul';

import { confirmAction, DateTimeField, OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, usePullToRefresh, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

type Task = MobileCoachPlanDetail['tasks'][number];

/**
 * KOÇ · PLAN — görev taşıma (MEVCUT `kocum/tasks/[id]/reschedule`, plan
 * haftası içinde, `expectedPlanVersion`) ve plan onayı (MEVCUT
 * `adaptive-plan/[id]/approve`, `expectedVersion`). Onay kararı sunucuda.
 */
export function CoachPlanScreen({ planId }: { planId: string }) {
  const query = useStaffQuery('OK', 'coach-plan', (api, signal) => fetchCoachPlan(api, planId, signal), { params: { planId } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="coach-plan">
      <QueryView query={query} disabledTitle="Haftalık planlar şu anda açık değil.">{(data) => <Body key={`${data.id}:${data.version}`} data={data} refetch={() => query.refetch()} />}</QueryView>
    </Screen>
  );
}

function Body({ data, refetch }: { data: MobileCoachPlanDetail; refetch: () => Promise<unknown> }) {
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff('OK');
  const [state, setState] = useState<WriteState>(null);
  const [moving, setMoving] = useState<{ task: Task; at: Date } | null>(null);
  const weekStart = new Date(data.weekStart);
  const weekEnd = new Date(data.weekEnd);
  const move = useMutation({ mutationFn: (input: { taskId: string; scheduledFor: string }) => rescheduleTask(api, input.taskId, { scheduledFor: input.scheduledFor, expectedPlanVersion: data.version }) });
  const approve = useMutation({ mutationFn: () => approvePlan(api, data.id, data.version) });
  const busy = move.isPending || approve.isPending;
  const movable = (task: Task) => data.status !== 'ARCHIVED' && !['DONE', 'SKIPPED'].includes(task.status);

  async function fail(error: unknown) {
    const next = writeError(error, 'Plan başka bir yerde değişti. Son durum yüklendi.');
    setState(next);
    if (next?.tone === 'warning') await refetch();
  }
  async function confirmMove() {
    if (!moving || busy || !online) return;
    const scheduledFor = moving.at.toISOString();
    setState(null);
    try {
      await move.mutateAsync({ taskId: moving.task.id, scheduledFor });
      setMoving(null);
      setState({ tone: 'success', message: 'Görev taşındı.' });
      await invalidate();
    } catch (error) {
      setMoving(null);
      await fail(error);
    }
  }
  async function confirmApprove() {
    if (busy || !online) return;
    const ok = await confirmAction({ title: 'Planı onayla', message: `${data.studentName} için ${formatDayMonth(data.weekStart)} haftasının planı yayınlanır ve öğrenciye görünür.`, confirmLabel: 'Onayla' });
    if (!ok) return;
    setState(null);
    try {
      await approve.mutateAsync();
      setState({ tone: 'success', message: 'Plan onaylandı.' });
      await invalidate();
      await refetch();
    } catch (error) {
      await fail(error);
    }
  }

  return (
    <>
      <PageHeader title={data.studentName} description={`${formatDayMonth(data.weekStart)} haftası`} context={<StatusBadge label={data.statusLabel} tone={data.status === 'APPROVED' ? 'success' : 'warning'} />} />
      <OfflineWriteNotice online={online} />
      <WriteBanner state={state} webPath="/panel/ogretmen/plan" />
      {data.canApprove ? <Button label="Planı onayla" disabled={busy || !online} loading={approve.isPending} onPress={() => void confirmApprove()} testID="coach-plan-approve" /> : null}
      <Section title="Görevler" first>
        {data.tasks.length ? (
          data.tasks.map((task) => (
            <Row
              key={task.id}
              title={task.title}
              subtitle={`${formatLongDate(task.scheduledFor)} · ${task.durationMinutes} dk${task.subject ? ` · ${task.subject}` : ''}`}
              trailing={<StatusBadge label={task.statusLabel} tone="neutral" />}
              onPress={movable(task) && online ? () => setMoving({ task, at: new Date(task.scheduledFor) }) : undefined}
              accessibilityHint={movable(task) ? 'Görevi başka bir güne taşı' : undefined}
            />
          ))
        ) : (
          <EmptyState title="Bu planda görev yok" />
        )}
      </Section>
      <BottomSheet visible={Boolean(moving)} title={moving ? `"${moving.task.title}" görevini taşı` : ''} onClose={() => setMoving(null)}>
        {moving ? (
          <View style={staffStyles.gap}>
            <DateTimeField label="Yeni gün" mode="date" value={moving.at} minimumDate={weekStart} maximumDate={weekEnd} onChange={(at) => setMoving({ ...moving, at })} />
            <Text tone="muted" variant="meta">Yalnız plan haftası içindeki günler seçilebilir.</Text>
            <Button label="Taşı" disabled={busy || !online} loading={move.isPending} onPress={() => void confirmMove()} />
          </View>
        ) : null}
      </BottomSheet>
    </>
  );
}
