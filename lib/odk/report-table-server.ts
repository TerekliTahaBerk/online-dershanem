import "server-only";
import { getOdkAudienceStudentReport, listOdkReportStudents } from "./reporting-server";
import { summarizeAudienceReport } from "./staff-workspace";
type Viewer = { userId: string; role: "ADMIN" | "TEACHER" };
type Student = { userId: string; name: string; context: string };
const ROW_LIMIT = 50;
export async function loadOdkReportTable(viewer: Viewer, students: Student[], query: { q?: string; grup?: string }) {
  const search = query.q?.trim().toLocaleLowerCase("tr-TR").slice(0, 80) || "";
  const groups = [...new Set(students.flatMap((student) => student.context.split(" · ").filter(Boolean)))].sort((a, b) => a.localeCompare(b, "tr"));
  const group = groups.includes(query.grup ?? "") ? query.grup! : "";
  const filtered = students.filter(
    (student) =>
      (!search || student.name.toLocaleLowerCase("tr-TR").includes(search)) && (!group || student.context.split(" · ").includes(group)),
  );
  const visible = filtered.slice(0, ROW_LIMIT);
  const reports = await Promise.all(visible.map((student) => getOdkAudienceStudentReport(viewer, student.userId)));
  const rows = visible.map((student, index) => ({ student, report: reports[index], summary: summarizeAudienceReport(reports[index]) }));

  return { search, groups, group, filtered, rows };
}

export async function loadOdkManagementReports(actorId: string, query: { q?: string; grup?: string; ogrenci?: string }) {
  const viewer = { userId: actorId, role: "ADMIN" as const };
  const students = await listOdkReportStudents(viewer);
  const selected = query.ogrenci || null;
  const report = selected ? await getOdkAudienceStudentReport(viewer, selected) : null;
  return { students, selected, report };
}
