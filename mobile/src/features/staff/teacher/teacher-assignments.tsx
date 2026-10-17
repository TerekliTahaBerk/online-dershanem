import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { Button, EmptyState, PageHeader, Row, Screen, SegmentedTabs, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchSubmissionQueue, fetchTeacherAssignments } from '@/lib/api/staff';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

/**
 * ÖĞRETMEN · ÇALIŞMALAR — grup ödev özeti (salt okunur) + `assignmentEvidence`
 * açıksa değerlendirme kuyruğu. Oluşturma ve düzenleme ortak native editörde.
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
      <PageHeader title="Çalışmalar" />
      <Button label="Ödev oluştur" onPress={() => router.push('/teacher/education-editor?kind=assignment' as Href)} />
      {evidence ? <SegmentedTabs label="Görünüm" value={tab} onChange={setTab} options={[{ value: 'queue', label: 'Değerlendirme', count: queue.data?.items.length }, { value: 'list', label: 'Ödevler' }]} /> : null}
      {showQueue ? (
        <QueryView query={queue} disabledTitle="Kanıtlı teslim şu an kullanıma kapalı.">
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
              <EmptyState title="Değerlendirme bekleyen teslim yok, her şey güncel ✅" />
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
                    onPress={() => router.push(`/teacher/education-editor?kind=assignment&id=${encodeURIComponent(item.id)}` as Href)}
                    subtitle={`${item.groupName} · son ${formatShortDateTime(item.dueAt)}`}
                    meta={`${item.submitted}/${item.total} tamamlandı${item.late ? ` · ${item.late} geç` : ''}${item.pendingReview ? ` · ${item.pendingReview} değerlendirme bekliyor` : ''}`}
                    trailing={item.isActive ? undefined : <StatusBadge label="Pasif" tone="neutral" />}
                  />
                ))}
              </Section>
            ) : (
              <EmptyState title="Henüz bir ödev yok" />
            )
          }
        </QueryView>
      )}
      {!evidence && assignments.data ? <Text tone="muted" variant="meta">Kanıtlı teslim değerlendirmesi bu ortamda kapalı.</Text> : null}
    </Screen>
  );
}
