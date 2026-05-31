/**
 * Phase 3 / Session 5 — `/panel/admin/kayitlar/yeni`
 *
 * Server shell for the enrollment creation wizard. Pre-loads the student
 * snapshot (active enrollments, parents, schedule counts) when a `?student=`
 * query param is supplied — typically from "Kayıt oluştur" CTA on the
 * student 360.
 */

import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { prisma } from "@/lib/prisma";
import {
  getEnrollmentOptions,
  getRecommendedPayerParents,
  getStudentEnrollmentState,
  getAvailablePackagesForEnrollment,
} from "@/lib/panel/enrollment";
import { EnrollmentCreateWizard } from "@/components/panel/enrollment/enrollment-create-wizard";

export const dynamic = "force-dynamic";

export default async function NewEnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  await requirePanelRole("admin");
  const sp = await searchParams;
  const studentId = sp.student?.trim() || null;

  const [{ packages, classrooms, odkAccessTags }, snapshot, payers, packageAvailability, studentRow] =
    await Promise.all([
      getEnrollmentOptions(),
      studentId ? getStudentEnrollmentState(studentId) : Promise.resolve(null),
      studentId ? getRecommendedPayerParents(studentId) : Promise.resolve([]),
      studentId
        ? getAvailablePackagesForEnrollment(studentId)
        : Promise.resolve({ all: [], alreadyActivePackageIds: new Set<string>() }),
      studentId
        ? prisma.student.findUnique({
            where: { id: studentId },
            select: {
              id: true,
              fullName: true,
              classLevel: true,
              examType: true,
              userId: true,
              _count: { select: { classrooms: true, parents: true } },
            },
          })
        : Promise.resolve(null),
    ]);

  const initialStudent = studentRow
    ? {
        id: studentRow.id,
        fullName: studentRow.fullName,
        classLevel: studentRow.classLevel,
        examType: studentRow.examType,
        hasUserAccount: !!studentRow.userId,
        classroomCount: studentRow._count.classrooms,
        parentCount: studentRow._count.parents,
      }
    : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Yönetim", href: "/panel/admin" },
          { label: "Kayıtlar", href: "/panel/admin/kayitlar" },
          { label: "Yeni kayıt" },
        ]}
        title="Yeni kayıt / paket"
        subtitle="Öğrenciyi pakete bağlayın, ödeyici veliyi seçin ve ödeme planını tek akışta oluşturun."
      />

      <EnrollmentCreateWizard
        initialStudent={initialStudent}
        initialSnapshot={snapshot}
        initialPayers={payers}
        initialAlreadyActivePackageIds={Array.from(packageAvailability.alreadyActivePackageIds)}
        packages={packages}
        classrooms={classrooms}
        odkAccessTags={odkAccessTags}
      />
    </>
  );
}
