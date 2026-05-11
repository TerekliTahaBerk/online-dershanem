import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { createClassroomAction } from "@/lib/services/classrooms/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function NewClassroomPage() {
  await requirePagePermission("classrooms.write");
  return (
    <div className="space-y-od-5">
      <PageHeader title="Yeni Sınıf" description="Sınıf/şube ekleyin" />
      <AutoForm
        title="Sınıf Bilgileri"
        action={createClassroomAction as any}
        successMessage="Sınıf eklendi"
        redirectTo={() => "/v2/admin/siniflar"}
        fields={[
          { name: "name", label: "Sınıf Adı", required: true, placeholder: "12-A, Hafta sonu grubu…" },
          { name: "branch", label: "Şube" },
          {
            name: "level",
            label: "Seviye",
            type: "select",
            defaultValue: "MIXED",
            options: [
              { value: "MIXED", label: "Karma" },
              { value: "TYT", label: "TYT" },
              { value: "AYT", label: "AYT" },
              { value: "LGS", label: "LGS" },
              { value: "YDT", label: "YDT" },
            ],
          },
          { name: "capacity", label: "Kapasite", type: "number", defaultValue: 30 },
          { name: "isActive", label: "Aktif", type: "checkbox", defaultValue: true },
          { name: "description", label: "Açıklama", type: "textarea", cols: 2 },
        ]}
      />
    </div>
  );
}
