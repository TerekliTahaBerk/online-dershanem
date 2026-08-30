import { notFound } from "next/navigation";
import { requireProductRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { getOdkAudienceStudentReport, listOdkReportStudents } from "@/lib/odk/reporting-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { OdkAudienceReports } from "@/components/odk/audience-reports";

export const dynamic = "force-dynamic";
export default async function OdkParentReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ ogrenci?: string; studentId?: string }>;
}) {
  const session = await requireProductRole("ODK", "PARENT");
  const students = await listOdkReportStudents({ userId: session.userId, role: "PARENT" });
  const { ogrenci, studentId } = await searchParams;

  const scopedStudentUserId = studentId
    ? (await resolveParentScope(session.userId, studentId)).selected?.userId ?? null
    : null;
  const requested = ogrenci || scopedStudentUserId;
  let selected = requested || students[0]?.userId || null;
  let report = selected
    ? await getOdkAudienceStudentReport({ userId: session.userId, role: "PARENT" }, selected)
    : null;

  if (!ogrenci && !report && students.length > 0 && selected !== students[0].userId) {
    selected = students[0].userId;
    report = await getOdkAudienceStudentReport({ userId: session.userId, role: "PARENT" }, selected);
  }
  if (ogrenci && !report) notFound();

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK">
      <OdkAudienceReports
        role="PARENT"
        basePath="/panel/odk/veli/raporlar"
        students={students}
        selectedUserId={selected}
        report={report}
      />
    </PanelShell>
  );
}
