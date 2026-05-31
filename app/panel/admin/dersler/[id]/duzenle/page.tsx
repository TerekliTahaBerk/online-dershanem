import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import {
  updateCourseAction,
  archiveCourseAction,
  reactivateCourseAction,
  deleteCourseAction,
} from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const [course, teachers, classrooms] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
      include: { _count: { select: { lessons: true, packageCourses: true, modules: true } } },
    }),
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
  if (!course) notFound();

  const update = updateCourseAction.bind(null, course.id);
  const archive = archiveCourseAction.bind(null, course.id);
  const reactivate = reactivateCourseAction.bind(null, course.id);
  const remove = deleteCourseAction.bind(null, course.id);
  const totalUsage = course._count.lessons + course._count.packageCourses + course._count.modules;

  return (
    <>
      <PageHeader
        title={`Düzenle: ${course.title}`}
        subtitle={course.slug}
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <Link href={`/panel/admin/dersler/${course.id}`} className="od-btn od-btn-ghost od-btn-sm">
              ← Detay
            </Link>
          </div>
        }
      />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        <Card>
          <CardBody>
            <form action={update} className="od-grid g-2" style={{ gap: 12 }}>
              <Field label="Ders adı *"><Input name="title" required maxLength={120} defaultValue={course.title} /></Field>
              <Field label="Branş *"><Input name="subject" required maxLength={80} defaultValue={course.subject} /></Field>
              <Field label="Seviye"><Input name="levelLabel" defaultValue={course.levelLabel ?? ""} maxLength={40} /></Field>
              <Field label="Sınav türü">
                <Select name="examType" defaultValue={course.examType ?? ""}>
                  <option value="">—</option>
                  <option value="LGS">LGS</option>
                  <option value="TYT">TYT</option>
                  <option value="AYT">AYT</option>
                  <option value="YDT">YDT</option>
                  <option value="GENEL">Genel</option>
                </Select>
              </Field>
              <Field label="Default öğretmen">
                <Select name="defaultTeacherId" defaultValue={course.defaultTeacherId ?? ""}>
                  <option value="">— Seçilmedi —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Default sınıf">
                <Select name="defaultClassroomId" defaultValue={course.defaultClassroomId ?? ""}>
                  <option value="">— Seçilmedi —</option>
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.branch ? ` · ${c.branch}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tahmini süre (dk)">
                <Input name="estimatedMinutes" type="number" min={0} defaultValue={course.estimatedMinutes ?? ""} />
              </Field>
              <Field label="Durum">
                <Select name="status" defaultValue={course.status}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </Select>
              </Field>
              <Field label="Slug">
                <Input name="slug" defaultValue={course.slug} />
              </Field>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Açıklama">
                  <Textarea name="description" rows={4} maxLength={2000} defaultValue={course.description ?? ""} />
                </Field>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="isActive" defaultChecked={course.isActive} id="isActive" />
                <label htmlFor="isActive">Aktif</label>
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="allowDuplicate" value="1" id="allowDuplicate" />
                <label htmlFor="allowDuplicate" className="od-muted" style={{ fontSize: 12 }}>
                  Aynı başlık &amp; branşa sahip başka bir ders olsa bile yine de kaydet (uyarı sonrası işaretleyin)
                </label>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormActions>
                  <Link href={`/panel/admin/dersler/${course.id}`} className="od-btn od-btn-ghost">İptal</Link>
                  <button type="submit" className="od-btn od-btn-primary">Kaydet</button>
                </FormActions>
              </div>
            </form>
          </CardBody>
        </Card>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card>
            <CardHeader title="Tehlikeli bölge" />
            <CardBody>
              <div style={{ display: "grid", gap: 10 }}>
                {course.isActive ? (
                  <form action={archive}>
                    <button type="submit" className="od-btn" style={{ width: "100%" }}>
                      Arşivle (pasifleştir)
                    </button>
                  </form>
                ) : (
                  <form action={reactivate}>
                    <button type="submit" className="od-btn" style={{ width: "100%" }}>
                      Yeniden yayınla
                    </button>
                  </form>
                )}
                <form action={remove}>
                  <button type="submit" className="od-btn" style={{ width: "100%", color: "var(--pd-bad, #b91c1c)" }}>
                    {totalUsage > 0 ? "Pasifleştirerek arşivle" : "Sil"}
                  </button>
                  <div className="od-muted" style={{ fontSize: 11, marginTop: 6 }}>
                    {totalUsage > 0
                      ? `${totalUsage} bağlı kayıt var. Silmek yerine arşivlenecek.`
                      : "Bağlı kayıt yok, kalıcı silinecek."}
                  </div>
                </form>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
