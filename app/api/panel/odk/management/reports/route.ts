import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiStaffPermission } from "@/lib/auth/api-guards";
import { staffJson, PRIVATE_NO_STORE, staffNotFound } from "@/lib/panel/staff-api";
import { loadOdkManagementReports, loadOdkReportTable } from "@/lib/odk/report-table-server";
import { reportSummarySentences, WEAK_ACCURACY, previousComparable, netChange } from "@/lib/odk/parent-report";
export async function GET(request: Request) {
  const auth = await requireApiStaffPermission("odk:report:read_all"); if (!auth.ok) return auth.response;
  const parsed = z.object({ q: z.string().max(80).optional(), grup: z.string().max(120).optional(), ogrenci: z.string().regex(/^[\w-]{1,191}$/).optional() }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Rapor seçimi geçerli görünmüyor." }, { status: 400, headers: PRIVATE_NO_STORE });
  // The explicit read_all permission delegates the same full-report audience as web.
  // Related-teacher endpoint continues to use TEACHER/relationship/contract scope.
  const { students, report, selected } = await loadOdkManagementReports(auth.session.userId, parsed.data);
  if (selected && !report) return staffNotFound();
  const table = await loadOdkReportTable({ userId: auth.session.userId, role: "ADMIN" }, students, parsed.data);
  const pair = report ? previousComparable(report.exams) : null;
  return staffJson({ contractVersion: 1, query: table.search, group: table.group, groups: table.groups, total: table.filtered.length, rowLimit: 50,
    rows: table.rows.map(({ student, summary }) => ({ studentId: student.userId, name: student.name, context: student.context, ...summary })),
    report: report ? { studentId: report.student.userId, studentName: report.student.name, available: report.exams.length > 0, latestExamId: pair?.latest.id ?? null, latestNet: pair?.latest.totalNet ?? null, delta: pair ? netChange(pair.latest, pair.previous) : null, weakThreshold: WEAK_ACCURACY, weakCount: report.trends.filter((t) => t.latestAccuracy < WEAK_ACCURACY).length, summary: reportSummarySentences(report.exams, report.trends), exams: [...report.exams].reverse().map((e) => ({ id: e.id, title: e.title, family: e.family, takenAt: e.takenAt.toISOString(), correctCount: e.correctCount, wrongCount: e.wrongCount, blankCount: e.blankCount, totalNet: e.totalNet })), outcomes: report.trends.map((t) => ({ id: t.outcomeId, code: t.code, title: t.title, unitName: t.unitName, latestAccuracy: t.latestAccuracy, previousAccuracy: t.previousAccuracy, delta: t.delta, evidenceCount: t.evidenceCount, questionCount: t.questionCount })) } : null });
}
