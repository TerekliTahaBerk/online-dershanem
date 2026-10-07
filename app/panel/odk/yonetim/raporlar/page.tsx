import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPermission } from "@/lib/auth/guards";
import {
  getOdkAudienceStudentReport,
  listOdkReportStudents,
} from "@/lib/odk/reporting-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { OdkAudienceReports } from "@/components/odk/audience-reports";
import { OdkReportTable } from "@/components/odk/odk-report-table";
import { buttonClass } from "@/components/panel/ui";

export const dynamic = "force-dynamic";
export default async function OdkAdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ ogrenci?: string; q?: string; grup?: string; onizle?: string }>;
}) {
  // Deneme Ligi personel izni (ADMIN her izinde geçer); global rol tek başına yetmez.
  const session = await requireStaffPermission("odk:report:read_all");
  const students = await listOdkReportStudents({
    userId: session.userId,
    role: "ADMIN",
  });
  const query = await searchParams;
  const requested = query.ogrenci;
  // Varsayılan görünüm tablo + yan panel (§11.7); `?ogrenci=` eski ayrıntılı raporu açar.
  const selected = requested || null;
  const report = selected
    ? await getOdkAudienceStudentReport(
        { userId: session.userId, role: "ADMIN" },
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
          <Link href="/panel/odk/yonetim/raporlar" className={buttonClass("ghost", "sm", "-ml-2.5")}>
            Tüm öğrenciler
          </Link>
          <OdkAudienceReports
            role="ADMIN"
            basePath="/panel/odk/yonetim/raporlar"
            students={students}
            selectedUserId={selected}
            report={report}
          />
        </>
      ) : (
        <OdkReportTable viewer={{ userId: session.userId, role: "ADMIN" }} basePath="/panel/odk/yonetim/raporlar" students={students} query={query} />
      )}
    </PanelShell>
  );
}
