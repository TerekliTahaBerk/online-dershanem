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
    <ParentScreen title="Öğretmenler" description="Öğrencinizin derslerine giren öğretmenler ve branşları. Gizlilik gereği iletişim bilgileri ve iç notlar burada yer almaz." testID="parent-teachers" refresh={refresh}>
      {(child) => (
        <ParentQueryView query={query} child={child}>
          {(data) =>
            !data.available ? (
              <EmptyState title="Bu öğrencinin canlı ders üyeliği yok" />
            ) : !data.teachers.length ? (
              <EmptyState title="Henüz atanmış bir öğretmen yok" body="Öğretmen atandığında adı ve branşı burada yer alacak." />
            ) : (
              <Section first>
                {data.teachers.map((teacher) => (
                  <Row key={teacher.id} title={teacher.name} subtitle={teacher.subject} meta={teacher.bio ?? undefined} />
                ))}
                <Text tone="muted" variant="meta">Öğretmenlerle görüşmek isterseniz eğitim koordinatörünüz size memnuniyetle yardımcı olur.</Text>
              </Section>
            )
          }
        </ParentQueryView>
      )}
    </ParentScreen>
  );
}
