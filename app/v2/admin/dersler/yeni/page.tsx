import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { createLessonAction } from "@/lib/services/lessons/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function NewLessonPage() {
  await requirePagePermission("lessons.write");

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
            label: "Sınıf (opsiyonel)",
            type: "async-select",
            endpoint: "/api/v1/search/classrooms",
          },
          {
            name: "packageId",
            label: "Paket (opsiyonel)",
            type: "async-select",
            endpoint: "/api/v1/search/packages",
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
