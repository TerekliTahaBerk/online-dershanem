import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { PageHeader } from "@/components/od/page-header";
import { StudentForm } from "@/components/od/domain/students/student-form";
import { requirePagePermission } from "@/lib/rbac/define-action";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");
  await requirePagePermission("students.write");

  const { id } = await params;
  const s = await prisma.student.findUnique({ where: { id } });
  if (!s) notFound();

  return (
    <div className="space-y-od-5">
      <PageHeader title={`${s.fullName} — Düzenle`} description="Öğrenci bilgilerini güncelleyin" />
      <StudentForm
        initial={{
          id: s.id,
          fullName: s.fullName,
          phone: s.phone,
          email: s.email ?? "",
          classLevel: s.classLevel ?? "",
          examType: s.examType ?? "",
          city: s.city ?? "",
          district: s.district ?? "",
          schoolName: s.schoolName ?? "",
          notes: s.notes ?? "",
        }}
      />
    </div>
  );
}
