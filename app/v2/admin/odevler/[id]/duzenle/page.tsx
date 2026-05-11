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

  const [a, teachers, classrooms, students] = await Promise.all([
    prisma.assignment.findUnique({ where: { id } }),
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
    prisma.student.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" }, take: 500 }),
  ]);
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
            type: "select",
            required: true,
            options: teachers.map((t) => ({ value: t.id, label: t.fullName })),
          },
          {
            name: "classroomId",
            label: "Sınıf",
            type: "select",
            options: classrooms.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            name: "studentId",
            label: "Öğrenci",
            type: "select",
            options: students.map((s) => ({ value: s.id, label: s.fullName })),
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
