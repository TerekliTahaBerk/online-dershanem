import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { updateTeacherAction } from "@/lib/services/teachers/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function EditTeacherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("teachers.write");
  const { id } = await params;
  const t = await prisma.teacher.findUnique({ where: { id } });
  if (!t) return notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader title={`Düzenle · ${t.fullName}`} description="Öğretmen bilgilerini güncelle" />
      <AutoForm
        title="Öğretmen Bilgileri"
        action={updateTeacherAction as any}
        extra={{ id: t.id }}
        successMessage="Güncellendi"
        redirectTo={() => "/v2/admin/ogretmenler"}
        initial={{
          fullName: t.fullName,
          email: t.email ?? "",
          phone: t.phone ?? "",
          subjects: t.subjects,
          bio: t.bio ?? "",
          status: t.status,
        }}
        fields={[
          { name: "fullName", label: "Ad Soyad", required: true },
          { name: "email", label: "E-posta", type: "email" },
          { name: "phone", label: "Telefon", type: "tel" },
          { name: "subjects", label: "Branş(lar)", required: true },
          {
            name: "status",
            label: "Durum",
            type: "select",
            required: true,
            options: [
              { value: "ACTIVE", label: "Aktif" },
              { value: "INACTIVE", label: "Pasif" },
            ],
          },
          { name: "bio", label: "Biyografi", type: "textarea", cols: 2 },
        ]}
      />
    </div>
  );
}
