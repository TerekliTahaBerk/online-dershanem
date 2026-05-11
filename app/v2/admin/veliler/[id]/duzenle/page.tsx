import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { updateParentAction } from "@/lib/services/parents/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function EditParentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("parents.write");
  const { id } = await params;
  const p = await prisma.parent.findUnique({ where: { id } });
  if (!p) return notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader title={`Düzenle · ${p.fullName}`} description="Veli bilgilerini güncelle" />
      <AutoForm
        title="Veli Bilgileri"
        action={updateParentAction as any}
        extra={{ id: p.id }}
        successMessage="Güncellendi"
        redirectTo={() => `/v2/admin/veliler/${p.id}`}
        initial={{
          fullName: p.fullName,
          phone: p.phone ?? "",
          email: p.email ?? "",
          notes: p.notes ?? "",
        }}
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
