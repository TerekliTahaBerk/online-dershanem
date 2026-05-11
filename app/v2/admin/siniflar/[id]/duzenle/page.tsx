import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { updateClassroomAction } from "@/lib/services/classrooms/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function EditClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("classrooms.write");
  const { id } = await params;
  const c = await prisma.classroom.findUnique({ where: { id } });
  if (!c) return notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader title={`Düzenle · ${c.name}`} description="Sınıf bilgilerini güncelle" />
      <AutoForm
        title="Sınıf Bilgileri"
        action={updateClassroomAction as any}
        extra={{ id: c.id }}
        successMessage="Güncellendi"
        redirectTo={() => "/v2/admin/siniflar"}
        initial={{
          name: c.name,
          branch: c.branch ?? "",
          level: c.level,
          capacity: c.capacity,
          description: c.description ?? "",
          isActive: c.isActive,
        }}
        fields={[
          { name: "name", label: "Sınıf Adı", required: true },
          { name: "branch", label: "Şube" },
          {
            name: "level",
            label: "Seviye",
            type: "select",
            options: [
              { value: "MIXED", label: "Karma" },
              { value: "TYT", label: "TYT" },
              { value: "AYT", label: "AYT" },
              { value: "LGS", label: "LGS" },
              { value: "YDT", label: "YDT" },
            ],
          },
          { name: "capacity", label: "Kapasite", type: "number" },
          { name: "isActive", label: "Aktif", type: "checkbox" },
          { name: "description", label: "Açıklama", type: "textarea", cols: 2 },
        ]}
      />
    </div>
  );
}
