import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { EmptyState } from "@/components/panel/ui/empty-state";
import { MaterialsList } from "./materials-list";
import { getMaterialsForClassroom } from "@/lib/panel/materials";

type Props = {
  teacherId: string;
  classroomId: string;
  classroomName?: string | null;
};

/**
 * Sınıf detayında "Materyaller" bölümü.
 * Sadece o sınıfa bağlı en yeni 5 materyali listeler.
 * "Materyal paylaş" CTA'sı, formu pre-fill etmek için classroomId'yi search-param ile gönderir.
 */
export async function ClassroomMaterialsSection({ teacherId, classroomId, classroomName }: Props) {
  const materials = await getMaterialsForClassroom(teacherId, classroomId, 5);

  return (
    <Card>
      <CardHeader
        title="Materyaller"
        subtitle={classroomName ? `${classroomName} için son paylaşımlar` : "Bu sınıfa paylaşılan son materyaller"}
        right={
          <div style={{ display: "flex", gap: 6 }}>
            <Link
              href={`/panel/ogretmen/materyaller?classroomId=${classroomId}`}
              className="od-btn od-btn-ghost od-btn-sm"
            >
              Tümü →
            </Link>
            <Link
              href={`/panel/ogretmen/materyaller/yeni?classroomId=${classroomId}`}
              className="od-btn od-btn-primary od-btn-sm"
            >
              + Materyal paylaş
            </Link>
          </div>
        }
      />
      <CardBody>
        {materials.length === 0 ? (
          <EmptyState
            icon="folder"
            title="Bu sınıfa henüz materyal paylaşılmadı"
            description="İlk materyali paylaşarak öğrencilerinize kaynak ekleyebilirsiniz."
            action={
              <Link
                href={`/panel/ogretmen/materyaller/yeni?classroomId=${classroomId}`}
                className="od-btn od-btn-primary od-btn-sm"
              >
                + Materyal paylaş
              </Link>
            }
          />
        ) : (
          <MaterialsList
            materials={materials}
            hideContext
            editHrefBuilder={(id) => `/panel/ogretmen/materyaller?focus=${id}`}
          />
        )}
      </CardBody>
    </Card>
  );
}
