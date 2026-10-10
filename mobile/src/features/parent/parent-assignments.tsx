import type { MobileParentAssignments } from '@contracts/parent';
import { useState } from 'react';

import { EmptyState, Row, SegmentedTabs, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchParentAssignments } from '@/lib/api/parent';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, usePullToRefresh } from './parent-shared';

type Group = MobileParentAssignments['assignments'][number]['group'];

/**
 * VELİ · ÖDEVLER — SALT OKUNUR (web `app/panel/veli/odevler`, aynı yükleyici).
 * Durum sunucunun kanonik türetimi; gruplama yalnız sunum. Veli ödevi
 * tamamlayamaz, teslim edemez, değiştiremez — bu ekranda yazma eylemi yoktur.
 */
export default function ParentAssignmentsScreen() {
  const query = useParentQuery('assignments', fetchParentAssignments);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Ödevler" description="Ödevleri öğrenci ve öğretmen yönetir; burada yalnız izlenir." testID="parent-assignments" refresh={refresh}>
      {(child) => <ParentQueryView query={query} child={child}>{(data) => <AssignmentsBody data={data} />}</ParentQueryView>}
    </ParentScreen>
  );
}

function AssignmentsBody({ data }: { data: MobileParentAssignments }) {
  const [group, setGroup] = useState<Group>('active');
  if (!data.available) return <EmptyState title="Bu öğrencide ödev ürünü yok" body="onlinedershanem. eklendiğinde öğretmen ödevleri burada görünür." />;
  if (!data.assignments.length) return <EmptyState title="Aktif ödev yok" body="Öğretmenden ödev geldiğinde burada görünür." />;
  const rows = data.assignments.filter((row) => row.group === group);
  return (
    <Section first>
      <SegmentedTabs
        label="Ödev grubu"
        value={group}
        onChange={setGroup}
        options={[
          { value: 'active', label: 'Aktif', count: data.counts.active },
          { value: 'late', label: 'Geciken', count: data.counts.late },
          { value: 'done', label: 'Tamamlanan', count: data.counts.done },
        ]}
      />
      {rows.length ? (
        rows.map((row) => (
          <Row
            key={row.id}
            testID={`parent-assignment-${row.id}`}
            title={row.title}
            subtitle={[row.description, row.teacherName].filter(Boolean).join(' · ') || null}
            meta={`Son tarih ${formatShortDateTime(row.dueAt)}`}
            trailing={<StatusBadge label={row.status.label} tone={row.status.tone} />}
          />
        ))
      ) : (
        <Text tone="secondary">Bu grupta ödev yok.</Text>
      )}
    </Section>
  );
}
