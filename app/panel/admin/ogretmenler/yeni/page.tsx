/**
 * Phase 3 / Session 4 — D2: Teacher Creation Wizard page.
 * Server shell — fetches classroom + course options, delegates the
 * sectioned form to the client wizard.
 */
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { TeacherCreateWizard } from "@/components/panel/teachers/teacher-create-wizard";

export const dynamic = "force-dynamic";

export default async function NewTeacher() {
  await requirePanelRole("admin");
  const [classrooms, courses] = await Promise.all([
    prisma.classroom.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, branch: true },
    }),
    prisma.course.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);
  return (
    <>
      <PageHeader
        title="Yeni öğretmen"
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Öğretmenler", href: "/panel/admin/ogretmenler" },
          { label: "Yeni" },
        ]}
        subtitle="Kimlik · hesap erişimi · sınıf ataması · hakediş kuralı tek seferde."
      />
      <TeacherCreateWizard classrooms={classrooms} courses={courses} />
    </>
  );
}
