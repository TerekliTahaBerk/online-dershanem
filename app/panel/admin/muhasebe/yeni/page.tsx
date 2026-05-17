import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { createEntryAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewEntry({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; type?: string }>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const defaultService = sp.service === "ODK" ? "ODK" : "OD";
  const defaultType = sp.type === "EXPENSE" ? "EXPENSE" : "INCOME";

  const [students, teachers, packages] = await Promise.all([
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
      take: 1000,
    }),
    prisma.teacher.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    prisma.package.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Yeni muhasebe kaydı"
        subtitle={"Ürün: " + (defaultService === "ODK" ? "OnlineDenemeKulübü" : "OnlineDershanem")}
        right={
          <Link
            href={`/panel/admin/muhasebe?service=${defaultService}`}
            className="od-btn od-btn-ghost od-btn-sm"
          >
            ← Muhasebeye dön
          </Link>
        }
      />
      <Card>
        <CardBody>
          <form action={createEntryAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ürün *">
              <Select name="service" defaultValue={defaultService} required>
                <option value="OD">OnlineDershanem (OD)</option>
                <option value="ODK">OnlineDenemeKulübü (ODK)</option>
              </Select>
            </Field>
            <Field label="Tip *">
              <Select name="type" defaultValue={defaultType} required>
                <option value="INCOME">Gelir</option>
                <option value="EXPENSE">Gider</option>
              </Select>
            </Field>
            <Field label="Kategori *">
              <Select name="category" defaultValue="OTHER_INCOME" required>
                <optgroup label="Gelir kategorileri">
                  <option value="PACKAGE_SALE">Paket satışı</option>
                  <option value="CAMP_SALE">Kamp satışı</option>
                  <option value="SERVICE_FEE">Hizmet bedeli</option>
                  <option value="OTHER_INCOME">Diğer gelir</option>
                </optgroup>
                <optgroup label="Gider kategorileri">
                  <option value="TEACHER_PAYROLL">Öğretmen ücreti / maaş</option>
                  <option value="MARKETING">Pazarlama</option>
                  <option value="RENT">Kira</option>
                  <option value="TAX">Vergi</option>
                  <option value="OPERATIONAL">Operasyonel</option>
                </optgroup>
              </Select>
            </Field>
            <Field label="Tutar (₺) *" hint="Otomatik kuruşa çevrilir">
              <Input name="amount" type="number" step="0.01" min={0.01} required />
            </Field>
            <Field label="Tarih">
              <Input name="occurredAt" type="datetime-local" />
            </Field>

            <Field label="İlgili öğrenci">
              <Select name="studentId" defaultValue="">
                <option value="">— Yok —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </Select>
            </Field>
            <Field label="İlgili öğretmen">
              <Select name="teacherId" defaultValue="">
                <option value="">— Yok —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </Select>
            </Field>
            <Field label="İlgili paket (OD)">
              <Select name="packageId" defaultValue="">
                <option value="">— Yok —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="refType (opsiyonel)" hint="Örn. PurchaseIntent, OdkPayment">
              <Input name="refType" maxLength={64} />
            </Field>
            <Field label="refId (opsiyonel)">
              <Input name="refId" maxLength={64} />
            </Field>

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Açıklama">
                <Textarea name="description" rows={3} maxLength={500} />
              </Field>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <Link
                  href={`/panel/admin/muhasebe?service=${defaultService}`}
                  className="od-btn od-btn-ghost"
                >
                  İptal
                </Link>
                <button className="od-btn od-btn-primary" type="submit">Kaydet</button>
              </FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
