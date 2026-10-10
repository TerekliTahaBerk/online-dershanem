import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { EmptyState, PageHeader, Row, Screen, SegmentedTabs, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchSubmissionQueue, fetchTeacherAssignments } from '@/lib/api/staff';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

/**
 * ÖĞRETMEN · ÇALIŞMALAR — grup ödev özeti (salt okunur) + `assignmentEvidence`
 * açıksa değerlendirme kuyruğu. Ödev oluşturma / düzenleme web devam yolu.
 */
export default function TeacherAssignmentsScreen() {
  const [tab, setTab] = useState<'queue' | 'list'>('queue');
  const assignments = useStaffQuery('OD', 'teacher-assignments', (api, signal) => fetchTeacherAssignments(api, signal));
  const evidence = assignments.data?.evidenceEnabled ?? false;
  const queue = useStaffQuery('OD', 'teacher-submissions', (api, signal) => fetchSubmissionQueue(api, signal), { enabled: evidence });
  const refresh = usePullToRefresh(() => Promise.all([assignments.refetch(), evidence ? queue.refetch() : Promise.resolve()]));
  const router = useRouter();
  const showQueue = evidence && tab === 'queue';
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-assignments">
      <PageHeader title="Çalışmalar" description="Ödev oluşturma ve düzenleme web panelinden yapılır." />
      {evidence ? <SegmentedTabs label="Görünüm" value={tab} onChange={setTab} options={[{ value: 'queue', label: 'Değerlendirme', count: queue.data?.items.length }, { value: 'list', label: 'Ödevler' }]} /> : null}
      {showQueue ? (
        <QueryView query={queue} disabledTitle="Kanıtlı teslim şu anda açık değil.">
          {(data) =>
            data.items.length ? (
              <Section first>
                {data.items.map((item) => (
                  <Row
                    key={item.id}
                    testID={`submission-${item.id}`}
                    title={`${item.studentName} · ${item.assignmentTitle}`}
                    subtitle={`${item.groupName} · ${item.attemptNumber}. deneme`}
                    meta={formatShortDateTime(item.submittedAt)}
                    onPress={() => router.push(`/teacher/submission/${encodeURIComponent(item.id)}` as Href)}
                  />
                ))}
              </Section>
            ) : (
              <EmptyState title="Değerlendirme bekleyen teslim yok" />
            )
          }
        </QueryView>
      ) : (
        <QueryView query={assignments}>
          {(data) =>
            data.assignments.length ? (
              <Section first>
                {data.assignments.map((item) => (
                  <Row
                    key={item.id}
                    title={item.title}
                    subtitle={`${item.groupName} · son ${formatShortDateTime(item.dueAt)}`}
                    meta={`${item.submitted}/${item.total} tamamlandı${item.late ? ` · ${item.late} geç` : ''}${item.pendingReview ? ` · ${item.pendingReview} değerlendirme bekliyor` : ''}`}
                    trailing={item.isActive ? undefined : <StatusBadge label="Pasif" tone="neutral" />}
                  />
                ))}
              </Section>
            ) : (
              <EmptyState title="Henüz ödev yok" />
            )
          }
        </QueryView>
      )}
      {!evidence && assignments.data ? <Text tone="muted" variant="meta">Kanıtlı teslim değerlendirmesi bu ortamda kapalı.</Text> : null}
    </Screen>
  );
}
