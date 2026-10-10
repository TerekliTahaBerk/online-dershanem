import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOdkAudienceStudentReport, listOdkReportStudents } from "@/lib/odk/reporting-server";
import { reportSummarySentences, WEAK_ACCURACY } from "@/lib/odk/parent-report";
import { MOBILE_STAFF_CONTRACT_VERSION } from "@/lib/mobile-contracts/staff";
import { PRIVATE_NO_STORE, requireStaffApi, staffJson, staffNotFound } from "@/lib/panel/staff-api";

/**
 * Deneme Ligi · ilişkili öğrenci raporları — SALT OKUNUR (web
 * `app/panel/odk/ogretmen/raporlar` ile aynı yükleyiciler, gerçek TEACHER
 * izleyici). Kapı: ODK ürün rolü + `odk:report:read_related`. Yönetim izinleri
 * (`odk:exam:edit`, `odk:result:release` …) bu uçla HİÇBİR şey açmaz.
 *
 * Öğrenci listesi `listOdkReportStudents` (öğretmenin aktif grubundaki,
 * sözleşmesi `teacherReports` veren öğrenciler). Rapor yalnız yayınlanmış
 * sonuç + PUBLISHED skor + sözleşme yayın koşuluyla. İstemci
 * `StudentProfile.id` gönderir; `User.id` yalnız sunucuda, ilişkili listede
 * çözülür. Bütünlük etiketi mobile alınmaz.
 */
const query = z.object({ studentId: z.string().trim().regex(/^[\w-]{1,191}$/).optional() }).strict();

export async function GET(request: Request) {
  const auth = await requireStaffApi("ODK", "odk:report:read_related");
  if (!auth.ok) return auth.response;
  const viewer = { userId: auth.session.userId, role: "TEACHER" as const };
  const related = await listOdkReportStudents(viewer);
  const profiles = related.length
    ? await prisma.studentProfile.findMany({ where: { userId: { in: related.map((item) => item.userId) } }, select: { id: true, userId: true } })
    : [];
  const profileByUser = new Map(profiles.map((profile) => [profile.userId, profile.id]));
  const parsed = query.safeParse({ studentId: new URL(request.url).searchParams.get("studentId") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Öğrenci seçimi geçersiz." }, { status: 400, headers: PRIVATE_NO_STORE });
  const requested = parsed.data.studentId;

  if (!requested) {
    return staffJson({
      contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
      students: related.flatMap((item) => {
        const studentId = profileByUser.get(item.userId);
        return studentId ? [{ studentId, name: item.name, context: item.context }] : [];
      }),
    });
  }
  const userId = profiles.find((profile) => profile.id === requested)?.userId;
  if (!userId) return staffNotFound("Öğrenci bulunamadı.");
  const report = await getOdkAudienceStudentReport(viewer, userId);
  const name = related.find((item) => item.userId === userId)?.name ?? "";
  if (!report) {
    return staffJson({ contractVersion: MOBILE_STAFF_CONTRACT_VERSION, studentId: requested, studentName: name, available: false, summary: [], exams: [], outcomes: [], weakThreshold: WEAK_ACCURACY });
  }
  return staffJson({
    contractVersion: MOBILE_STAFF_CONTRACT_VERSION,
    studentId: requested,
    studentName: report.student.name,
    available: true,
    summary: reportSummarySentences(report.exams, report.trends),
    exams: [...report.exams]
      .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())
      .map((exam) => ({ id: exam.id, title: exam.title, family: exam.family, takenAt: exam.takenAt.toISOString(), correctCount: exam.correctCount, wrongCount: exam.wrongCount, blankCount: exam.blankCount, totalNet: exam.totalNet })),
    outcomes: report.trends.map((trend) => ({ id: trend.outcomeId, code: trend.code, title: trend.title, unitName: trend.unitName, latestAccuracy: trend.latestAccuracy, delta: trend.delta, questionCount: trend.questionCount })),
    weakThreshold: WEAK_ACCURACY,
  });
}
