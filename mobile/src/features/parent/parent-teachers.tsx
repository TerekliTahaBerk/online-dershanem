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
    <ParentScreen title="Öğretmenler" description="Aktif öğretmenler ve branşları. İletişim bilgisi ve iç notlar paylaşılmaz." testID="parent-teachers" refresh={refresh}>
      {(child) => (
        <ParentQueryView query={query} child={child}>
          {(data) =>
            !data.available ? (
              <EmptyState title="Bu öğrencide canlı ders ürünü yok" />
            ) : !data.teachers.length ? (
              <EmptyState title="Henüz öğretmen bağlantısı yok" body="Öğretmen atandığında branş bilgisi burada listelenir." />
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
