import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { MaterialCard } from "./material-card";
import { getStudentMaterialsByCourse } from "@/lib/panel/materials";

type Props = {
  studentId: string;
  courseId: string | null | undefined;
  courseTitle?: string | null;
};

/**
 * Study Room — "Bu derse ait materyaller". Aktif oturumun courseId'si
 * varsa o derse ait yayında materyalleri gösterir; yoksa hiç render etmez.
 */
export async function StudyRoomRelatedMaterials({ studentId, courseId, courseTitle }: Props) {
  if (!courseId) return null;
  const materials = await getStudentMaterialsByCourse(studentId, courseId, 5);
  if (materials.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Bu derse ait materyaller"
        subtitle={courseTitle ?? undefined}
        right={
          <Link href="/panel/ogrenci/kutuphane" className="od-btn ghost sm">
            Kütüphane →
          </Link>
        }
      />
      <CardBody>
        <div className="od-stack" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {materials.map((m) => (
            <MaterialCard key={m.id} material={m} hideContext />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
