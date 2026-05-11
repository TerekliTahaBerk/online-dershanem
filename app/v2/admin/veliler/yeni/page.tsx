import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { createParentAction } from "@/lib/services/parents/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function NewParentPage() {
  await requirePagePermission("parents.write");
  return (
    <div className="space-y-od-5">
      <PageHeader title="Yeni Veli" description="Veli kaydı oluştur" />
      <AutoForm
        title="Veli Bilgileri"
        action={createParentAction as any}
        successMessage="Veli eklendi"
        redirectTo={(d: any) => (d?.id ? `/v2/admin/veliler/${d.id}` : "/v2/admin/veliler")}
        fields={[
          { name: "fullName", label: "Ad Soyad", required: true },
          { name: "phone", label: "Telefon", type: "tel" },
          { name: "email", label: "E-posta", type: "email" },
          { name: "notes", label: "Notlar", type: "textarea", cols: 2 },
        ]}
      />
    </div>
  );
}
