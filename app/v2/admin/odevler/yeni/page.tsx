import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/od/page-header";
import { AutoForm } from "@/components/od/forms/auto-form";
import { createAssignmentAction } from "@/lib/services/assignments/actions";
import { requirePagePermission } from "@/lib/rbac/define-action";

export const dynamic = "force-dynamic";

export default async function NewAssignmentPage() {
  await requirePagePermission("assignments.write");

  const [teachers, classrooms, students] = await Promise.all([
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

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Yeni Ödev"
        description="Sınıfa veya tek öğrenciye ödev atayın (boş bırakırsanız genel)"
      />
      <AutoForm
        title="Ödev Bilgileri"
        action={createAssignmentAction as any}
        successMessage="Ödev eklendi"
        redirectTo={() => "/v2/admin/odevler"}
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
            helpText: "Doluysa öğrenci alanını boş bırakın.",
          },
          {
            name: "studentId",
            label: "Öğrenci",
            type: "select",
            options: students.map((s) => ({ value: s.id, label: s.fullName })),
            helpText: "Doluysa sınıf alanını boş bırakın.",
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
            defaultValue: "PUBLISHED",
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
