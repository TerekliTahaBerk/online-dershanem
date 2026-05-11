import { PageHeader } from "@/components/od/page-header";
import { StudentForm } from "@/components/od/domain/students/student-form";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function NewStudentPage() {
  await requirePagePermission("students.write");

  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Yeni Öğrenci"
        description="Sisteme yeni öğrenci kaydı ekleyin"
      />
      <StudentForm />
    </div>
  );
}
