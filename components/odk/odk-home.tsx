import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentDenemeLigiHome } from "@/components/odk/student-dl-home";
import { EmptyState, PageHeader, PropertyList, PropertyRow, Section, buttonClass } from "@/components/panel/ui";
import { prisma } from "@/lib/prisma";
import { getOdkAudienceStudentReport, listOdkReportStudents } from "@/lib/odk/reporting-server";
import { netChange, previousComparable, reportSummarySentences, WEAK_ACCURACY } from "@/lib/odk/parent-report";

const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });

/**
 * Öğretmen (rapor okuyucu) Deneme Ligi ana sayfası: son açıklanan sonuç ve
 * sayılar düz satırlarda; ayrıntı rapor tablosunda (§11.7).
 */
async function TeacherHome({ userId }: { userId: string }) {
  const students = await listOdkReportStudents({ userId, role: "TEACHER" });
  const studentIds = students.map((student) => student.userId);
  const [releasedResults, attentionAreas, latest] = studentIds.length
    ? await Promise.all([
        prisma.odkExamAttempt.count({
          where: { studentUserId: { in: studentIds }, exam: { status: "RELEASED" }, score: { isNot: null } },
        }),
        prisma.odkAttemptOutcomeScore.count({
          where: {
            accuracyRate: { lt: WEAK_ACCURACY },
            score: { attempt: { studentUserId: { in: studentIds }, exam: { status: "RELEASED" } } },
          },
        }),
        prisma.odkExamAttempt.findFirst({
          where: { studentUserId: { in: studentIds }, exam: { status: "RELEASED" }, score: { isNot: null } },
          orderBy: { exam: { resultsReleasedAt: "desc" } },
          select: {
            student: { select: { fullName: true, email: true } },
            exam: { select: { title: true } },
            score: { select: { totalNet: true } },
          },
        }),
      ])
    : [0, 0, null];
  return (
    <>
      <PageHeader
        title="Deneme Ligi"
        description="Sorumlu olduğunuz öğrencilerin açıklanmış sonuçları ve tekrar eden gelişim alanları."
        actions={
          <Link href="/panel/odk/ogretmen/raporlar" className={buttonClass("primary", "md")}>
            Sonuç raporları
          </Link>
        }
      />
      <Section title="Son açıklanan sonuç" divider={false}>
        {latest ? (
          <p className="text-[14.5px] text-pn-text">
            <span className="font-medium">{latest.student.fullName || latest.student.email}</span> · {latest.exam.title} ·{" "}
            <span className="tabular-nums">{Number(latest.score?.totalNet || 0).toFixed(2)} net</span>
            <span className="block text-[13px] text-pn-text-muted">Sonucu öğrencinin önceki kanıtlarıyla birlikte yorumlayın.</span>
          </p>
        ) : (
          <p className="text-[14px] text-pn-text-muted">İncelenecek sonuç henüz yok; sonuçlar açıklandığında burada görünür.</p>
        )}
      </Section>
      <Section title="Özet">
        <PropertyList>
          <PropertyRow label="Sorumlu öğrenci">{String(students.length)}</PropertyRow>
          <PropertyRow label="Açıklanan sonuç">{String(releasedResults)}</PropertyRow>
          <PropertyRow label={`%${WEAK_ACCURACY} altındaki kazanım ölçümü`}>{String(attentionAreas)}</PropertyRow>
        </PropertyList>
      </Section>
    </>
  );
}

/**
 * VELİ Deneme Ligi ana sayfası (Design Phase 7, §11.7): son açıklanan sonuç,
 * kendi önceki denemesine göre değişim ve düz dil özet; ayrıntı raporda.
 */
async function ParentHome({ userId }: { userId: string }) {
  const students = await listOdkReportStudents({ userId, role: "PARENT" });
  const report = students[0] ? await getOdkAudienceStudentReport({ userId, role: "PARENT" }, students[0].userId) : null;
  const pair = report ? previousComparable(report.exams) : null;
  const latest = pair ? report!.exams.find((exam) => exam.id === pair.latest.id)! : null;
  const change = pair ? netChange(pair.latest, pair.previous) : null;
  const summary = report ? reportSummarySentences(report.exams, report.trends) : [];
  return (
    <>
      <PageHeader
        title="Deneme Ligi"
        description="Açıklanmış sonuçlar yalnız öğrencinin kendi önceki denemeleriyle karşılaştırılır."
        metadata={
          report ? (
            <span className="text-[13.5px] text-pn-text-secondary">
              Öğrenci: <strong className="font-semibold text-pn-text">{report.student.name}</strong>
              {students.length > 1 ? <span className="text-pn-text-muted"> · diğer öğrenciler raporda</span> : null}
            </span>
          ) : undefined
        }
        actions={
          students.length ? (
            <Link href="/panel/odk/veli/raporlar" className={buttonClass("primary", "md")}>
              Gelişim raporu
            </Link>
          ) : undefined
        }
      />
      {!students.length ? (
        <EmptyState className="mt-6" title="Bağlı öğrenci bulunmuyor." body="Öğrenci hesabı bağlandığında sonuçlar burada görünür." />
      ) : !latest ? (
        <EmptyState className="mt-6" title="Açıklanmış sonuç henüz yok." body="Sonuçlar kontrol edilip açıklandıktan sonra burada görünür." />
      ) : (
        <Section title="Son açıklanan sonuç" divider={false}>
          <p className="text-[15px] font-semibold text-pn-text">
            {latest.title}
            <span className="ml-2 text-[13px] font-normal text-pn-text-muted">{DATE.format(latest.takenAt)}</span>
          </p>
          <PropertyList className="mt-3">
            <PropertyRow label="Net">{latest.totalNet.toFixed(2)}</PropertyRow>
            <PropertyRow label="Doğru · yanlış · boş">
              {latest.correctCount} · {latest.wrongCount} · {latest.blankCount}
            </PropertyRow>
            <PropertyRow label="Kendi önceki denemesine göre">
              {change === null ? "İlk deneme" : `${change > 0 ? "+" : ""}${change.toFixed(2)} net`}
            </PropertyRow>
          </PropertyList>
          {summary.length ? (
            <div className="mt-4 space-y-1 text-[14.5px] leading-[1.65] text-pn-text">
              {summary.map((sentence) => (
                <p key={sentence}>{sentence}</p>
              ))}
            </div>
          ) : null}
        </Section>
      )}
    </>
  );
}

export async function OdkHome({ session }: { session: SessionUser }) {
  // Öğrenci Bugün'ü kendi düzeninde (§11.1).
  if (session.role === "STUDENT") return <StudentDenemeLigiHome session={session} />;
  // ADMIN tek personel ana sayfasını kullanır (§11.8).
  if (session.role === "ADMIN") redirect("/panel/odk/yonetim");
  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} product="ODK" pageTitle="Deneme Ligi">
      <div className="max-w-[900px]">
        {session.role === "TEACHER" ? <TeacherHome userId={session.userId} /> : <ParentHome userId={session.userId} />}
      </div>
    </PanelShell>
  );
}
