import { EmptyState, Row, Section, Text } from '@/design/primitives';
import { fetchParentTeachers } from '@/lib/api/parent';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, usePullToRefresh } from './parent-shared';

/**
 * VELİ · ÖĞRETMENLER — `listParentVisibleTeachers`. Yalnız branş, ad ve
 * biyografi; iletişim bilgisi ve iç not yok. Mesajlaşma yok (yetkili bir veli
 * iletişim sözleşmesi bulunmuyor).
 */
export default function ParentTeachersScreen() {
  const query = useParentQuery('teachers', fetchParentTeachers);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Öğretmenler" description="Çocuğunuzla çalışan öğretmenler ve branşları 👩‍🏫 Gizlilik gereği iletişim bilgileri ve iç notlar paylaşılmaz." testID="parent-teachers" refresh={refresh}>
      {(child) => (
        <ParentQueryView query={query} child={child}>
          {(data) =>
            !data.available ? (
              <EmptyState title="Bu öğrencinin canlı dersleri henüz açık değil" />
            ) : !data.teachers.length ? (
              <EmptyState title="Henüz bir öğretmen ataması yok" body="Öğretmen atandığında branş bilgisi burada listelenecek." />
            ) : (
              <Section first>
                {data.teachers.map((teacher) => (
                  <Row key={teacher.id} title={teacher.name} subtitle={teacher.subject} meta={teacher.bio ?? undefined} />
                ))}
                <Text tone="muted" variant="meta">Öğretmenlerle iletişim için eğitim koordinatörünüzle görüşebilirsiniz.</Text>
              </Section>
            )
          }
        </ParentQueryView>
      )}
    </ParentScreen>
  );
}
