import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { createTeacherAction } from "@/lib/services/teachers/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function NewTeacherPage() {
  await requirePagePermission("teachers.write");
  return (
    <div className="space-y-od-5">
      <PageHeader title="Yeni Öğretmen" description="Sisteme öğretmen ekleyin" />
      <AutoForm
        title="Öğretmen Bilgileri"
        action={createTeacherAction as any}
        successMessage="Öğretmen eklendi"
        redirectTo={() => "/v2/admin/ogretmenler"}
        fields={[
          { name: "fullName", label: "Ad Soyad", required: true },
          { name: "email", label: "E-posta", type: "email" },
          { name: "phone", label: "Telefon" },
          { name: "subjects", label: "Branş(lar)", required: true, placeholder: "Matematik, Fizik" },
          {
            name: "status",
            label: "Durum",
            type: "select",
            required: true,
            defaultValue: "ACTIVE",
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
