import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { updateOdkPackageAction } from "../../_actions";

export const metadata: Metadata = {
  title: "ODK Paketi Düzenle · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditOdkPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOdkPanel("admin");
  const { id } = await params;
  const pkg = await prisma.odkPackage.findUnique({ where: { id } });
  if (!pkg) notFound();

  const action = updateOdkPackageAction.bind(null, pkg.id);

  return (
    <>
      <PageHeader
        title={"Düzenle · " + pkg.title}
        subtitle="Paket bilgilerini güncelleyin"
        right={
          <Link
            href={`/panel/admin/odk/paketler/${pkg.id}`}
            className="od-btn od-btn-ghost od-btn-sm"
          >
            ← Detay
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={action} className="od-form">
            <div className="od-grid g-2">
              <Field label="Paket adı *">
                <Input name="title" required defaultValue={pkg.title} />
              </Field>
              <Field label="Slug *">
                <Input name="slug" required defaultValue={pkg.slug} />
              </Field>
            </div>
            <Field label="Açıklama">
              <Textarea name="description" rows={3} defaultValue={pkg.description ?? ""} />
            </Field>
            <div className="od-grid g-3">
              <Field label="Fiyat (₺) *">
                <Input
                  name="priceTry"
                  type="number"
                  step="1"
                  min="0"
                  required
                  defaultValue={(pkg.priceCents / 100).toString()}
                />
              </Field>
              <Field label="Eski fiyat (₺)">
                <Input
                  name="originalPriceTry"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={
                    pkg.originalPriceCents ? (pkg.originalPriceCents / 100).toString() : ""
                  }
                />
              </Field>
              <Field label="Süre (gün)">
                <Input
                  name="durationDays"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={pkg.durationDays?.toString() ?? ""}
                />
              </Field>
            </div>
            <div className="od-grid g-3">
              <Field label="Satın alma CTA metni">
                <Input name="ctaText" defaultValue={pkg.ctaText ?? ""} />
              </Field>
              <Field label="Aktif?">
                <Select name="isActive" defaultValue={pkg.isActive ? "on" : "false"}>
                  <option value="on">Aktif</option>
                  <option value="false">Pasif</option>
                </Select>
              </Field>
              <Field label="Öne çıkan?">
                <Select name="isFeatured" defaultValue={pkg.isFeatured ? "true" : "false"}>
                  <option value="false">Hayır</option>
                  <option value="true">Evet</option>
                </Select>
              </Field>
            </div>
            <FormActions>
              <Link
                href={`/panel/admin/odk/paketler/${pkg.id}`}
                className="od-btn od-btn-ghost"
              >
                Vazgeç
              </Link>
              <button type="submit" className="od-btn od-btn-primary">
                Kaydet
              </button>
            </FormActions>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
