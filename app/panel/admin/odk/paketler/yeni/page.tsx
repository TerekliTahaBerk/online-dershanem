import type { Metadata } from "next";
import Link from "next/link";
import { requireOdkPanel } from "@/lib/access/odk-panel";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { createOdkPackageAction } from "../_actions";

export const metadata: Metadata = {
  title: "Yeni ODK Paketi · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewOdkPackagePage() {
  await requireOdkPanel("admin");

  return (
    <>
      <PageHeader
        title="Yeni ODK Paketi"
        subtitle="Paket bilgilerini girin · oluşturduktan sonra deneme ve erişim taglarını bağlayabilirsiniz."
        right={
          <Link href="/panel/admin/odk/paketler" className="od-btn od-btn-ghost od-btn-sm">
            ← Geri
          </Link>
        }
      />

      <Card>
        <CardBody>
          <form action={createOdkPackageAction} className="od-form">
            <div className="od-grid g-2">
              <Field label="Paket adı *">
                <Input name="title" required placeholder="ODK Klasik TYT Paketi" />
              </Field>
              <Field label="Slug (opsiyonel)" hint="Boş bırakırsanız paket adından üretilir">
                <Input name="slug" placeholder="odk-klasik-tyt" />
              </Field>
            </div>
            <Field label="Açıklama">
              <Textarea name="description" rows={3} placeholder="Bu paket neyi içerir?" />
            </Field>
            <div className="od-grid g-3">
              <Field label="Fiyat (₺) *">
                <Input name="priceTry" type="number" step="1" min="0" required defaultValue="0" />
              </Field>
              <Field label="Eski fiyat (₺)" hint="Üzeri çizili indirim göstermek için">
                <Input name="originalPriceTry" type="number" step="1" min="0" />
              </Field>
              <Field label="Süre (gün)" hint="Boş = süresiz">
                <Input name="durationDays" type="number" step="1" min="0" />
              </Field>
            </div>
            <div className="od-grid g-2">
              <Field label="Satın alma CTA metni" hint="Boş = varsayılan">
                <Input name="ctaText" placeholder="Hemen satın al" />
              </Field>
              <Field label="Öne çıkan paket?">
                <Select name="isFeatured" defaultValue="false">
                  <option value="false">Hayır</option>
                  <option value="true">Evet</option>
                </Select>
              </Field>
            </div>
            <FormActions>
              <Link href="/panel/admin/odk/paketler" className="od-btn od-btn-ghost">
                Vazgeç
              </Link>
              <button type="submit" className="od-btn od-btn-primary">
                Paketi oluştur
              </button>
            </FormActions>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
