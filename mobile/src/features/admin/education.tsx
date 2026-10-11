import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import type { EducationRow, EducationTab } from '@contracts/admin-education';

import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, TextField } from '@/design/primitives';
import { fetchEducation } from '@/lib/api/admin-education';

import { QueryView, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips } from './ui';

export function EducationRows({ rows, testID }: { rows: EducationRow[]; testID: string }) {
  const router = useRouter();
  return rows.length ? rows.map((row) => (
    <Row key={row.id} testID={`${testID}-${row.id}`} title={row.title} subtitle={row.detail || null}
      meta={row.at ? new Date(row.at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' }) : null}
      onPress={row.groupId ? () => router.push(`/admin/group/${encodeURIComponent(row.groupId!)}` as Href) : row.studentId ? () => router.push(`/admin/student/${encodeURIComponent(row.studentId!)}` as Href) : undefined} />
  )) : <EmptyState title="Bu bölümde kayıt yok" />;
}

/** P2.3 okuma teslimatı; yazma akışları tamamlanana kadar açıkça belirtilir. */
export default function EducationScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<EducationTab>('gruplar');
  const [filter, setFilter] = useState<'aktif' | 'arsiv' | 'tumu'>('aktif');
  const [search, setSearch] = useState('');
  const query = useAdminQuery('education', fetchEducation);
  const refresh = usePullToRefresh(() => query.refetch());
  const needle = search.trim().toLocaleLowerCase('tr-TR');
  return (
    <Screen testID="admin-education" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <PageHeader title="Eğitim" description="Gruplar, dersler, ödevler ve materyaller." />
      <Banner tone="info" title="Eğitim yönetimi">Grup oluşturma ve üye yönetimi uygulamada. Ders planlama, ödev ve dosya düzenleme işlemleri web panelinde.</Banner>
      <Button mutation label="Grup oluştur" testID="education-create" onPress={() => router.push('/admin/group-create' as Href)} />
      <FilterChips value={tab} onChange={setTab} label="Eğitim bölümleri" options={[{ value: 'gruplar', label: 'Gruplar' }, { value: 'dersler', label: 'Dersler' }, { value: 'odevler', label: 'Ödevler' }, { value: 'materyaller', label: 'Materyaller' }]} />
      <QueryView query={query}>{(data) => {
        if (tab !== 'gruplar') {
          const section = data.sections.find((item) => item.id === tab);
          return <Section title={section?.title ?? ''} first><EducationRows rows={section?.rows ?? []} testID={`education-${tab}`} /></Section>;
        }
        const groups = data.groups.filter((group) => (filter === 'tumu' || group.active === (filter === 'aktif')) && [group.name, group.subject, group.level, group.teacherName].join(' ').toLocaleLowerCase('tr-TR').includes(needle));
        return <>
          <FilterChips value={filter} onChange={setFilter} label="Grup durumu" options={[{ value: 'aktif', label: 'Aktif' }, { value: 'arsiv', label: 'Arşiv' }, { value: 'tumu', label: 'Tümü' }]} />
          <TextField label="Grup, ders veya öğretmen ara" value={search} onChangeText={setSearch} testID="education-search" />
          <Section title={`${groups.length} grup`} first>
            {groups.length ? groups.map((group) => <Row key={group.id} testID={`education-group-${group.id}`} title={group.name}
              subtitle={[group.subject, group.level, group.teacherName].filter(Boolean).join(' · ')} meta={`Doluluk: ${group.filled}/${group.capacity}${group.nextLessonAt ? ` · Sonraki ders: ${new Date(group.nextLessonAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' })}` : ''}`}
              trailing={<StatusBadge label={!group.active ? 'Arşiv' : group.filled >= group.capacity ? 'Dolu' : 'Kontenjan var'} tone={!group.active ? 'neutral' : group.filled >= group.capacity ? 'warning' : 'success'} />}
              onPress={() => router.push(`/admin/group/${encodeURIComponent(group.id)}` as Href)} />) : <EmptyState title="Eşleşen grup yok" />}
          </Section>
        </>;
      }}</QueryView>
    </Screen>
  );
}
