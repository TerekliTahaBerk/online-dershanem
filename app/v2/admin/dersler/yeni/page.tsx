import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { createLessonAction } from "@/lib/services/lessons/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function NewLessonPage() {
  await requirePagePermission("lessons.write");

  const [students, teachers, classrooms, packages] = await Promise.all([
    prisma.student.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" }, take: 500 }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.classroom.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.package.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-od-5">
      <PageHeader title="Yeni Ders" description="Birebir veya sınıf dersi planla" />
      <AutoForm
        title="Ders Bilgileri"
        action={createLessonAction as any}
        successMessage="Ders eklendi"
        redirectTo={() => "/v2/admin/dersler"}
        fields={[
          {
            name: "studentId",
            label: "Öğrenci",
            type: "select",
            required: true,
            options: students.map((s) => ({ value: s.id, label: s.fullName })),
          },
          {
            name: "teacherId",
            label: "Öğretmen",
            type: "select",
            required: true,
            options: teachers.map((t) => ({ value: t.id, label: t.fullName })),
          },
          {
            name: "classroomId",
            label: "Sınıf (opsiyonel)",
            type: "select",
            options: classrooms.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: "packageId",
            label: "Paket (opsiyonel)",
            type: "select",
            options: packages.map((p) => ({ value: p.id, label: p.name })),
          },
          { name: "title", label: "Başlık" },
          { name: "subject", label: "Konu" },
          { name: "scheduledAt", label: "Tarih / Saat", type: "datetime-local", required: true },
          { name: "duration", label: "Süre (dk)", type: "number", defaultValue: 60 },
          { name: "googleMeetLink", label: "Google Meet Link", type: "url" },
          {
            name: "status",
            label: "Durum",
            type: "select",
            defaultValue: "SCHEDULED",
            options: [
              { value: "SCHEDULED", label: "Planlandı" },
              { value: "COMPLETED", label: "Tamamlandı" },
              { value: "CANCELLED", label: "İptal" },
            ],
          },
          { name: "notes", label: "Notlar", type: "textarea", cols: 2 },
        ]}
      />
    </div>
  );
}
