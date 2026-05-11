import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { createPackageAction } from "@/lib/services/packages/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function NewPackagePage() {
  await requirePagePermission("packages.write");
  return (
    <div className="space-y-od-5">
      <PageHeader title="Yeni Paket" description="Eğitim paketi/program ekleyin" />
      <AutoForm
        title="Paket Bilgileri"
        action={createPackageAction as any}
        successMessage="Paket eklendi"
        redirectTo={() => "/v2/admin/paketler"}
        fields={[
          { name: "name", label: "Paket Adı", required: true },
          {
            name: "type",
            label: "Tür",
            type: "select",
            defaultValue: "COURSE",
            options: [
              { value: "COURSE", label: "Kurs" },
              { value: "EXAM", label: "Sınav / Deneme" },
            ],
          },
          { name: "price", label: "Fiyat (kuruş)", type: "number", required: true, helpText: "Örn. 100000 = 1.000 ₺" },
          { name: "lessonCount", label: "Ders Sayısı", type: "number", required: true },
          { name: "subjects", label: "Konular", required: true, placeholder: "Matematik, Fizik, Kimya" },
          { name: "paytrLink", label: "PayTR Link", type: "url" },
          { name: "isActive", label: "Aktif (yayında)", type: "checkbox", defaultValue: true },
          { name: "description", label: "Açıklama", type: "textarea", cols: 2 },
        ]}
      />
    </div>
  );
}
