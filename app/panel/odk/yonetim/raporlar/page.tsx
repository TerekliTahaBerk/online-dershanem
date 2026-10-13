import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPermission } from "@/lib/auth/guards";
import { loadOdkManagementReports } from "@/lib/odk/report-table-server";
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
  const query = await searchParams;
  const { students, selected, report } = await loadOdkManagementReports(session.userId, query);
  const requested = query.ogrenci;
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
