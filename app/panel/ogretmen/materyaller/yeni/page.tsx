import { redirect } from "next/navigation";

import { PageHeader } from "@/components/panel/ui/page-header";
import { Card, CardBody } from "@/components/panel/ui/card";
import { MaterialForm } from "@/components/panel/materials/material-form";
import { requireTeacher } from "@/lib/panel-teacher";
import {
  getTeacherClassroomOptions,
  getTeacherCourseOptions,
} from "@/lib/panel/materials";

export const dynamic = "force-dynamic";

export default async function NewMaterialPage() {
  const { teacher } = await requireTeacher();
  if (!teacher) redirect("/panel");

  const [classrooms, courses] = await Promise.all([
    getTeacherClassroomOptions(teacher.id),
    getTeacherCourseOptions(teacher.id),
  ]);

  return (
    <>
      <PageHeader
        title="Yeni materyal"
        subtitle="URL ile bağlantı, video veya not paylaşın"
      />
      <Card>
        <CardBody>
          <MaterialForm classrooms={classrooms} courses={courses} />
        </CardBody>
      </Card>
    </>
  );
}
