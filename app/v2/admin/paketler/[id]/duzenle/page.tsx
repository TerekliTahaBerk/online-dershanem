import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { updatePackageAction } from "@/lib/services/packages/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("packages.write");
  const { id } = await params;
  const p = await prisma.package.findUnique({ where: { id } });
  if (!p) return notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader title={`Düzenle · ${p.name}`} description="Paket bilgilerini güncelle" />
      <AutoForm
        title="Paket Bilgileri"
        action={updatePackageAction as any}
        extra={{ id: p.id }}
        successMessage="Güncellendi"
        redirectTo={() => "/v2/admin/paketler"}
        initial={{
          name: p.name,
          type: p.type,
          price: p.price,
          lessonCount: p.lessonCount,
          subjects: p.subjects,
          paytrLink: p.paytrLink ?? "",
          isActive: p.isActive,
          description: p.description ?? "",
        }}
        fields={[
          { name: "name", label: "Paket Adı", required: true },
          {
            name: "type",
            label: "Tür",
            type: "select",
            options: [
              { value: "COURSE", label: "Kurs" },
              { value: "EXAM", label: "Sınav / Deneme" },
            ],
          },
          { name: "price", label: "Fiyat (kuruş)", type: "number", required: true },
          { name: "lessonCount", label: "Ders Sayısı", type: "number", required: true },
          { name: "subjects", label: "Konular", required: true },
          { name: "paytrLink", label: "PayTR Link", type: "url" },
          { name: "isActive", label: "Aktif", type: "checkbox" },
          { name: "description", label: "Açıklama", type: "textarea", cols: 2 },
        ]}
      />
    </div>
  );
}
