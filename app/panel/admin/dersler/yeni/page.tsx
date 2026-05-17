import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import Link from "next/link";
import { createCourseAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function NewCoursePage() {
  await requirePanelRole("admin");
  const [teachers, classrooms] = await Promise.all([
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branch: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Yeni ders tanımı"
        subtitle="Curriculum şablonu (programlama yapmaz)"
        right={
          <Link href="/panel/admin/dersler" className="od-btn od-btn-ghost od-btn-sm">
            ← Listeye dön
          </Link>
        }
      />
      <Card>
        <CardBody>
          <form action={createCourseAction} className="od-grid g-2" style={{ gap: 12 }}>
            <Field label="Ders adı *">
              <Input name="title" required maxLength={120} placeholder="Örn. Matematik 12 — Limit" />
            </Field>
            <Field label="Branş *">
              <Input name="subject" required maxLength={80} placeholder="Matematik / Türkçe / Fizik…" />
            </Field>
            <Field label="Seviye">
              <Input name="levelLabel" maxLength={40} placeholder="12. Sınıf / TYT / AYT" />
            </Field>
            <Field label="Sınav türü">
              <Select name="examType" defaultValue="">
                <option value="">—</option>
                <option value="LGS">LGS</option>
                <option value="TYT">TYT</option>
                <option value="AYT">AYT</option>
                <option value="YDT">YDT</option>
                <option value="GENEL">Genel</option>
              </Select>
            </Field>
            <Field label="Default öğretmen">
              <Select name="defaultTeacherId" defaultValue="">
                <option value="">— Seçilmedi —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </Select>
            </Field>
            <Field label="Default sınıf">
              <Select name="defaultClassroomId" defaultValue="">
                <option value="">— Seçilmedi —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.branch ? ` · ${c.branch}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tahmini süre (dk)">
              <Input name="estimatedMinutes" type="number" min={0} placeholder="60" />
            </Field>
            <Field label="Durum">
              <Select name="status" defaultValue="PUBLISHED">
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </Select>
            </Field>
            <Field label="Slug (opsiyonel)">
              <Input name="slug" placeholder="başlıktan otomatik" />
            </Field>
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Açıklama">
                <Textarea name="description" rows={4} maxLength={2000} />
              </Field>
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="isActive" defaultChecked id="isActive" />
              <label htmlFor="isActive">Aktif</label>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <Link href="/panel/admin/dersler" className="od-btn od-btn-ghost">İptal</Link>
                <button type="submit" className="od-btn od-btn-primary">Dersi oluştur</button>
              </FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
