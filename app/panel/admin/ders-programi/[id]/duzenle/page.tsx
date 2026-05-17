import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { Field, Input, Select, Textarea, FormActions } from "@/components/panel/ui/form";
import { updateLessonAction } from "../../_actions";

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePanelRole("admin");
  const { id } = await params;
  const [lesson, teachers, courses] = await Promise.all([
    prisma.lesson.findUnique({
      where: { id },
      include: {
        student: { select: { fullName: true } },
        classroom: { select: { name: true, branch: true } },
      },
    }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    prisma.course.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, subject: true },
    }),
  ]);
  if (!lesson) notFound();

  const update = updateLessonAction.bind(null, lesson.id);
  const d = lesson.scheduledAt;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  return (
    <>
      <PageHeader
        title={`Düzenle: ${lesson.title ?? "Ders"}`}
        subtitle={`Öğrenci: ${lesson.student.fullName}${lesson.classroom ? ` · Sınıf: ${lesson.classroom.name}` : ""}`}
        right={
          <Link href={`/panel/admin/ders-programi/${lesson.id}`} className="od-btn od-btn-ghost od-btn-sm">
            ← Detay
          </Link>
        }
      />
      <Card>
        <CardBody>
          <form action={update} className="od-grid g-2" style={{ gap: 16 }}>
            <Field label="Ders tanımı (Course)">
              <Select name="courseId" defaultValue={lesson.courseId ?? ""}>
                <option value="">— Yok —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} · {c.subject}</option>
                ))}
              </Select>
            </Field>

            <Field label="Öğretmen *">
              <Select name="teacherId" required defaultValue={lesson.teacherId}>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.fullName}</option>
                ))}
              </Select>
            </Field>

            <Field label="Başlık"><Input name="title" defaultValue={lesson.title ?? ""} maxLength={120} /></Field>
            <Field label="Branş"><Input name="subject" defaultValue={lesson.subject ?? ""} maxLength={80} /></Field>

            <Field label="Tarih *">
              <Input name="scheduledDate" type="date" required defaultValue={`${yyyy}-${mm}-${dd}`} />
            </Field>
            <Field label="Saat">
              <Input name="scheduledTime" type="time" defaultValue={`${hh}:${mi}`} />
            </Field>

            <Field label="Süre (dk)"><Input name="duration" type="number" min={15} max={300} defaultValue={lesson.duration} /></Field>
            <Field label="Durum">
              <Select name="status" defaultValue={lesson.status}>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </Select>
            </Field>

            <Field label="Online link">
              <Input name="googleMeetLink" type="url" defaultValue={lesson.googleMeetLink ?? ""} />
            </Field>
            <Field label="Lokasyon">
              <Input name="location" defaultValue={lesson.location ?? ""} />
            </Field>

            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Notlar"><Textarea name="notes" rows={3} maxLength={1000} defaultValue={lesson.notes ?? ""} /></Field>
            </div>

            {lesson.sessionGroupId ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <input type="checkbox" name="applyAll" />
                  Bu değişiklikleri aynı seanstaki tüm öğrenci satırlarına da uygula
                </label>
              </div>
            ) : null}

            <div style={{ gridColumn: "1 / -1" }}>
              <FormActions>
                <Link href={`/panel/admin/ders-programi/${lesson.id}`} className="od-btn od-btn-ghost">İptal</Link>
                <button type="submit" className="od-btn od-btn-primary">Kaydet</button>
              </FormActions>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
