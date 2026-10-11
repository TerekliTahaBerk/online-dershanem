import { useRouter, type Href } from 'expo-router';

import { Banner, EmptyState, PageHeader, Row, Screen, Section, StatusBadge } from '@/design/primitives';
import { fetchEducators } from '@/lib/api/admin';

import { QueryView, useAdminQuery, usePullToRefresh } from './shared';

/**
 * YÖNETİM · ÖĞRETMENLER VE DOLULUK (Faz 2.2) — web
 * `app/panel/yonetim/egitmenler` ile AYNI yükleyici (`loadEducators`):
 * branş, seviye ve grup doluluğu; kapasite aşımı sunucuda hesaplanır.
 * Satır kişi detayına açılır (branş, sorumluluk, devir orada).
 */
export default function EducatorsScreen() {
  const router = useRouter();
  const query = useAdminQuery('educators', (api, signal) => fetchEducators(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-educators">
      <PageHeader title="Öğretmenler" description="Branş, seviye ve grup doluluğu." />
      <QueryView query={query}>
        {(data) => (
          <>
            {data.overCapacity ? <Banner tone="warning" title={`${data.overCapacity} öğretmenin grubu kapasite üstünde`}>Yeni öğrenci atamadan önce doluluğu kontrol et.</Banner> : null}
            <Section title={`${data.teachers.length} öğretmen`} first>
              {data.teachers.length ? (
                data.teachers.map((teacher) => (
                  <Row
                    key={teacher.id}
                    testID={`admin-educator-${teacher.id}`}
                    title={teacher.name}
                    subtitle={[teacher.subjects, teacher.levels].filter(Boolean).join(' · ') || null}
                    meta={`Doluluk: ${teacher.fill}`}
                    trailing={<StatusBadge label={teacher.over ? 'Kapasite üstü' : teacher.statusLabel} tone={teacher.over ? 'warning' : teacher.active ? 'success' : 'neutral'} />}
                    onPress={() => router.push(`/admin/person/${encodeURIComponent(teacher.id)}` as Href)}
                  />
                ))
              ) : (
                <EmptyState title="Öğretmen yok" />
              )}
            </Section>
          </>
        )}
      </QueryView>
    </Screen>
  );
}
