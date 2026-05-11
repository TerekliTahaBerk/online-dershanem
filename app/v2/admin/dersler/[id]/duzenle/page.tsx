import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { updateLessonAction } from "@/lib/services/lessons/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("lessons.write");
  const { id } = await params;

  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) return notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader title="Dersi Düzenle" description={lesson.title ?? lesson.subject ?? "—"} />
      <AutoForm
        title="Ders Bilgileri"
        action={updateLessonAction as any}
        extra={{ id: lesson.id }}
        successMessage="Güncellendi"
        redirectTo={() => "/v2/admin/dersler"}
        initial={{
          studentId: lesson.studentId,
          teacherId: lesson.teacherId,
          packageId: lesson.packageId ?? "",
          classroomId: lesson.classroomId ?? "",
          title: lesson.title ?? "",
          subject: lesson.subject ?? "",
          scheduledAt: toLocalInput(lesson.scheduledAt),
          duration: lesson.duration,
          googleMeetLink: lesson.googleMeetLink ?? "",
          status: lesson.status,
          notes: lesson.notes ?? "",
        }}
        fields={[
          {
            name: "studentId",
            label: "Öğrenci",
            type: "async-select",
            required: true,
            endpoint: "/api/v1/search/students",
          },
          {
            name: "teacherId",
            label: "Öğretmen",
            type: "async-select",
            required: true,
            endpoint: "/api/v1/search/teachers",
          },
          {
            name: "classroomId",
            label: "Sınıf",
            type: "async-select",
            endpoint: "/api/v1/search/classrooms",
          },
          {
            name: "packageId",
            label: "Paket",
            type: "async-select",
            endpoint: "/api/v1/search/packages",
          },
          { name: "title", label: "Başlık" },
          { name: "subject", label: "Konu" },
          { name: "scheduledAt", label: "Tarih / Saat", type: "datetime-local", required: true },
          { name: "duration", label: "Süre (dk)", type: "number" },
          { name: "googleMeetLink", label: "Google Meet Link", type: "url" },
          {
            name: "status",
            label: "Durum",
            type: "select",
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
