/**
 * Phase 2 / Session 11 — Teacher-facing read-only payroll page.
 * Route: /panel/ogretmen/hakedislerim
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { PageHeader } from "@/components/panel/ui/page-header";
import { getTeacherPayrollReadOnlySummary } from "@/lib/panel/teacher-payroll";
import { TeacherPayrollSummary } from "@/components/panel/teacher/teacher-payroll-summary";

export const dynamic = "force-dynamic";

export default async function TeacherPayrollPage() {
  const ctx = await requirePanelRole("ogretmen");
  // Locate Teacher record by user.
  const teacher = await prisma.teacher.findFirst({
    where: { userId: ctx.userId },
    select: { id: true },
  });
  if (!teacher) {
    // Admin viewing-as without a teacher record.
    redirect("/panel/ogretmen");
  }
  const data = await getTeacherPayrollReadOnlySummary(teacher.id);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hakedişlerim"
        subtitle="Bu sayfa yalnızca okunur bir özettir. Tutarlar yönetim onayından sonra kesinleşir; eksik yoklama veya tanımsız saatlik ücret olduğunda ilgili satırlar incelemededir."
        breadcrumbs={[
          { label: "Öğretmen", href: "/panel/ogretmen" },
          { label: "Hakedişlerim" },
        ]}
      />
      <TeacherPayrollSummary data={data} />
    </div>
  );
}
