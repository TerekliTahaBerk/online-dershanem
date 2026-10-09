import type { MobileAssignment, MobileAssignmentList } from '@contracts/student';
import { useState } from 'react';

import { EmptyState, PageHeader, Row, Screen, SegmentedTabs, StatusBadge } from '@/design/primitives';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { assignmentDetailHref } from '@/navigation/od-targets';

import { useAssignments } from './assignments/hooks';
import { groupAssignments, statusPresentation, TAB_LABEL, usesEvidenceFlow, type AssignmentTab } from './assignments/model';
import { QueryView, useOdNavigation, usePullToRefresh } from './shared';

/**
 * OD · ÇALIŞMALAR — web `app/panel/ogrenci/odevler` karşılığı. Yalnız
 * Dershanem ödevleri: Yön Koçluk plan görevleri bu ekranda YOK (Yön
 * çalışma alanına aittir, M3). Veri `GET /api/panel/assignments?scope=OD`.
 */

const EMPTY: Record<AssignmentTab, { title: string; body: string }> = {
  pending: { title: 'Bekleyen çalışma yok.', body: 'Öğretmenin yeni bir çalışma eklediğinde burada görünecek.' },
  submitted: { title: 'Teslim edilen çalışma yok.', body: 'Tamamladığın veya öğretmenine gönderdiğin çalışmalar burada listelenir.' },
  reviewed: { title: 'Değerlendirilen çalışma yok.', body: 'Öğretmenin onayladığı kanıtlı çalışmalar burada görünür.' },
};

export default function OdAssignmentsScreen() {
  const query = useAssignments();
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="od-assignments">
      <PageHeader title="Çalışmalar" description="Öğretmeninin verdiği ödevler." />
      <QueryView query={query}>
        {(data) => (data.profile ? <AssignmentTabs data={data} /> : <EmptyState title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında çalışmaların burada listelenir." />)}
      </QueryView>
    </Screen>
  );
}

function AssignmentTabs({ data }: { data: MobileAssignmentList }) {
  const [tab, setTab] = useState<AssignmentTab>('pending');
  const groups = groupAssignments(data.assignments, data.evidenceEnabled);
  return (
    <>
      <SegmentedTabs
        label="Çalışma durumu"
        value={tab}
        onChange={setTab}
        options={(['pending', 'submitted', 'reviewed'] as const).map((value) => ({ value, label: TAB_LABEL[value], count: groups[value].length }))}
      />
      {groups[tab].length ? (
        groups[tab].map((assignment) => <AssignmentRow key={assignment.id} assignment={assignment} evidenceEnabled={data.evidenceEnabled} />)
      ) : (
        <EmptyState title={EMPTY[tab].title} body={EMPTY[tab].body} />
      )}
    </>
  );
}

function AssignmentRow({ assignment, evidenceEnabled }: { assignment: MobileAssignment; evidenceEnabled: boolean }) {
  const nav = useOdNavigation();
  const status = statusPresentation(assignment, evidenceEnabled, new Date());
  const href = assignmentDetailHref(assignment.id);
  const evidence = usesEvidenceFlow(assignment, evidenceEnabled) ? ' · Kanıt istenir' : '';
  return (
    <Row
      testID={`assignment-${assignment.id}`}
      title={assignment.title}
      subtitle={`${assignment.subject} · ${assignment.groupName}${evidence}\nTeslim ${formatShortDateTime(assignment.dueAt)}`}
      trailing={<StatusBadge label={status.label} tone={status.tone} />}
      onPress={href ? () => nav.push(href) : undefined}
      accessibilityHint="Çalışma ayrıntılarını açar"
    />
  );
}
