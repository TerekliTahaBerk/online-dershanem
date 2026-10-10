import type { MobileCoachSessionRow } from '@contracts/staff';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { EmptyState, PageHeader, Row, Screen, SegmentedTabs, Section, StatusBadge } from '@/design/primitives';
import { fetchCoachSessions } from '@/lib/api/staff';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

export const SESSION_STATUS_LABEL = { PLANNED: 'Planlı', COMPLETED: 'Tamamlandı', MISSED: 'Katılım yok', CANCELLED: 'İptal' } as const;

/** KOÇ · GÖRÜŞMELER — web görüşme listesiyle aynı kapsam; liste notsuz ve bağlantısız. */
export default function CoachSessionsScreen() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const query = useStaffQuery('OK', 'coach-sessions', (api, signal) => fetchCoachSessions(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  const router = useRouter();
  const row = (item: MobileCoachSessionRow) => (
    <Row
      key={item.id}
      testID={`coach-session-${item.id}`}
      title={item.studentName}
      subtitle={[formatShortDateTime(item.scheduledAt), item.focus].filter(Boolean).join(' · ')}
      meta={item.proposedAt ? `Önerilen: ${formatShortDateTime(item.proposedAt)}` : undefined}
      trailing={item.rescheduleRequested ? <StatusBadge label="Saat talebi" tone="warning" /> : <StatusBadge label={SESSION_STATUS_LABEL[item.status]} tone="neutral" />}
      onPress={() => router.push(`/coach/session/${encodeURIComponent(item.id)}` as Href)}
    />
  );
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="coach-sessions">
      <PageHeader title="Görüşmeler" description="Yeni görüşmeyi öğrencinin sayfasından planlayın." />
      <SegmentedTabs label="Görüşmeler" value={tab} onChange={setTab} options={[{ value: 'upcoming', label: 'Yaklaşan', count: query.data?.upcoming.length }, { value: 'past', label: 'Son 30 gün' }]} />
      <QueryView query={query}>
        {(data) => {
          const list = tab === 'upcoming' ? data.upcoming : data.past;
          return list.length ? <Section first>{list.map(row)}</Section> : <EmptyState title={tab === 'upcoming' ? 'Planlı görüşme yok' : 'Son 30 günde görüşme yok'} />;
        }}
      </QueryView>
    </Screen>
  );
}
