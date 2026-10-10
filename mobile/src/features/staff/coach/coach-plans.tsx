import type { MobileCoachPlans } from '@contracts/staff';
import { useMutation } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchCoachPlans, reviewSuggestion } from '@/lib/api/staff';
import { useSession } from '@/lib/auth/session-provider';
import { formatDayMonth } from '@/lib/format/istanbul';

import { confirmAction, OfflineWriteNotice, QueryView, staffStyles, useInvalidateStaff, useOnline, usePullToRefresh, useStaffQuery, WriteBanner, writeError, type WriteState } from '../shared';

const PLAN_TONE = { DRAFT: 'warning', CHANGE_REQUESTED: 'warning', APPROVED: 'success', ARCHIVED: 'neutral' } as const;

/** KOÇ · PLANLAR — planlama haftası + bekleyen öneriler (MEVCUT inceleme ucu). */
export default function CoachPlansScreen() {
  const query = useStaffQuery('OK', 'coach-plans', (api, signal) => fetchCoachPlans(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="coach-plans">
      <PageHeader title="Planlar" description="Planı yeniden oluşturma ve kapasite ayarı web panelinden yapılır." />
      <QueryView query={query} disabledTitle="Haftalık planlar şu anda açık değil.">{(data) => <Body data={data} refetch={() => query.refetch()} />}</QueryView>
    </Screen>
  );
}

function Body({ data, refetch }: { data: MobileCoachPlans; refetch: () => Promise<unknown> }) {
  const router = useRouter();
  const { api } = useSession();
  const online = useOnline();
  const invalidate = useInvalidateStaff('OK');
  const [state, setState] = useState<WriteState>(null);
  const mutation = useMutation({ mutationFn: (input: { id: string; decision: 'ACCEPTED' | 'REJECTED' }) => reviewSuggestion(api, input.id, input.decision) });

  async function review(id: string, title: string, decision: 'ACCEPTED' | 'REJECTED') {
    if (mutation.isPending || !online) return;
    const ok = await confirmAction({ title: decision === 'ACCEPTED' ? 'Öneriyi kabul et' : 'Öneriyi reddet', message: decision === 'ACCEPTED' ? `"${title}" plana uygulanır; plan yeniden onay bekler.` : `"${title}" reddedilir.`, confirmLabel: decision === 'ACCEPTED' ? 'Kabul et' : 'Reddet', destructive: decision === 'REJECTED' });
    if (!ok) return;
    setState(null);
    try {
      await mutation.mutateAsync({ id, decision });
      setState({ tone: 'success', message: decision === 'ACCEPTED' ? 'Öneri kabul edildi.' : 'Öneri reddedildi.' });
      await invalidate();
    } catch (error) {
      const next = writeError(error, 'Bu öneri zaten incelenmiş. Liste yenilendi.');
      setState(next);
      await refetch();
    }
  }

  return (
    <>
      <OfflineWriteNotice online={online} />
      <WriteBanner state={state} webPath="/panel/ogretmen/plan" />
      <Section title={`${formatDayMonth(data.weekStart)} haftası`} first>
        {data.plans.length ? (
          data.plans.map((plan) => <Row key={plan.id} testID={`coach-plan-${plan.id}`} title={plan.studentName} subtitle={`${plan.doneCount}/${plan.taskCount} görev`} trailing={<StatusBadge label={plan.statusLabel} tone={PLAN_TONE[plan.status]} />} onPress={() => router.push(`/coach/plan/${encodeURIComponent(plan.id)}` as Href)} />)
        ) : (
          <EmptyState title="Bu hafta için plan yok" />
        )}
      </Section>
      {data.suggestions.length ? (
        <Section title="Bekleyen öneriler">
          {data.suggestions.map((item) => (
            <View key={item.id} style={staffStyles.card}>
              <Text variant="bodyStrong">{`${item.studentName} · ${item.title}`}</Text>
              <Text tone="secondary" variant="meta">{`${item.kindLabel} — ${item.rationale}`}</Text>
              <View style={staffStyles.row}>
                <Button label="Kabul et" disabled={mutation.isPending || !online} onPress={() => void review(item.id, item.title, 'ACCEPTED')} testID={`suggestion-accept-${item.id}`} />
                <Button label="Reddet" variant="secondary" disabled={mutation.isPending || !online} onPress={() => void review(item.id, item.title, 'REJECTED')} />
              </View>
            </View>
          ))}
        </Section>
      ) : null}
    </>
  );
}
