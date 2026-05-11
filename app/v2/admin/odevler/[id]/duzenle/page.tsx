import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { updateAssignmentAction } from "@/lib/services/assignments/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission("assignments.write");
  const { id } = await params;

  const a = await prisma.assignment.findUnique({ where: { id } });
  if (!a) return notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader title={`Düzenle · ${a.title}`} description="Ödev bilgilerini güncelle" />
      <AutoForm
        title="Ödev Bilgileri"
        action={updateAssignmentAction as any}
        extra={{ id: a.id }}
        successMessage="Güncellendi"
        redirectTo={() => "/v2/admin/odevler"}
        initial={{
          teacherId: a.teacherId,
          classroomId: a.classroomId ?? "",
          studentId: a.studentId ?? "",
          title: a.title,
          description: a.description ?? "",
          subject: a.subject ?? "",
          dueAt: toLocalInput(a.dueAt),
          maxScore: a.maxScore ?? "",
          attachmentUrl: a.attachmentUrl ?? "",
          status: a.status,
        }}
        fields={[
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
            name: "studentId",
            label: "Öğrenci",
            type: "async-select",
            endpoint: "/api/v1/search/students",
          },
          { name: "title", label: "Başlık", required: true, cols: 2 },
          { name: "subject", label: "Ders / Konu" },
          { name: "dueAt", label: "Son Teslim", type: "datetime-local" },
          { name: "maxScore", label: "Maks. Puan", type: "number" },
          { name: "attachmentUrl", label: "Dosya / Link URL", type: "url" },
          {
            name: "status",
            label: "Durum",
            type: "select",
            options: [
              { value: "DRAFT", label: "Taslak" },
              { value: "PUBLISHED", label: "Yayında" },
              { value: "CLOSED", label: "Kapalı" },
            ],
          },
          { name: "description", label: "Açıklama", type: "textarea", cols: 2 },
        ]}
      />
    </div>
  );
}
