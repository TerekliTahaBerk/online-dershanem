import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import {
  getOdkAudienceStudentReport,
  listOdkReportStudents,
} from "@/lib/odk/reporting-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { OdkAudienceReports } from "@/components/odk/audience-reports";
import { OdkReportTable } from "@/components/odk/odk-report-table";
import { buttonClass } from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function OdkTeacherReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ ogrenci?: string; q?: string; grup?: string; onizle?: string }>;
}) {
  const session = await requireTeacherStaffPermission("odk:report:read_related");
  const students = await listOdkReportStudents({
    userId: session.userId,
    role: "TEACHER",
  });
  const query = await searchParams;
  const requested = query.ogrenci;
  // Varsayılan görünüm tablo + yan panel (§11.7); `?ogrenci=` eski ayrıntılı raporu açar.
  const selected = requested || null;
  const report = selected
    ? await getOdkAudienceStudentReport(
        { userId: session.userId, role: "TEACHER" },
        selected,
      )
    : null;
  if (requested && !report) notFound();
  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      product="ODK"
    >
      {selected ? (
        <>
          <Link href="/panel/odk/ogretmen/raporlar" className={buttonClass("ghost", "sm", "-ml-2.5")}>
            Tüm öğrenciler
          </Link>
          <OdkAudienceReports
            role="TEACHER"
            basePath="/panel/odk/ogretmen/raporlar"
            students={students}
            selectedUserId={selected}
            report={report}
          />
        </>
      ) : (
        <OdkReportTable viewer={{ userId: session.userId, role: "TEACHER" }} basePath="/panel/odk/ogretmen/raporlar" students={students} query={query} />
      )}
    </PanelShell>
  );
}
