import { notFound } from "next/navigation";
import { requireProductRole } from "@/lib/auth/guards";
import { getOdkAudienceStudentReport, listOdkReportStudents } from "@/lib/odk/reporting-server";
import { PanelShell } from "@/components/panel/panel-shell";
import { OdkAudienceReports } from "@/components/odk/audience-reports";

export const dynamic = "force-dynamic";
export default async function OdkAdminReportsPage({ searchParams }: { searchParams: Promise<{ ogrenci?: string }> }) {
  const session = await requireProductRole("ODK", "ADMIN"); const students = await listOdkReportStudents({ userId: session.userId, role: "ADMIN" }); const requested = (await searchParams).ogrenci; const selected = requested || students[0]?.userId || null;
  const report = selected ? await getOdkAudienceStudentReport({ userId: session.userId, role: "ADMIN" }, selected) : null; if (requested && !report) notFound();
  return <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK"><OdkAudienceReports role="ADMIN" basePath="/panel/odk/yonetim/raporlar" students={students} selectedUserId={selected} report={report} /></PanelShell>;
}
