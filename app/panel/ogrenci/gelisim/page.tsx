import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentWeeklyGoal } from "@/components/panel/student-weekly-goal";
import { PanelHeading, PanelStatCard, PanelEmpty } from "@/components/panel/ui";
import { SubjectTrendCard, type SubjectSeries } from "@/components/panel/student/subject-trend";
import { buildTrendCaption } from "@/lib/student-progress-trend";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · GELİŞİMİN — onaylı tasarım (Panel.dc.html → sProgress).
 *
 * Tasarımın işlev tanımı: ders bazında net grafiği (son denemeler), ders
 * katılımı ve çalışma tamamlama kartları. Hepsi gerçek veriden hesaplanır;
 * veri yoksa kart uydurma sayı göstermez.
 */

/* Tasarımdaki iki seri rengi; daha fazla ders olursa döngüyle devam eder. */
const SERIES_COLORS = ["#14976B", "#E0A34A", "#5C7BA6", "#9C5340", "#6B7A73"];

const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

function netFromSection(section: { correctCount: number; incorrectCount: number }) {
  return Number((section.correctCount - section.incorrectCount / 4).toFixed(2));
}

export default async function StudentProgressPage() {
  const session = await requireRole("STUDENT");
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Gelişim"
    >
      <div className="max-w-[1000px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Gelişimin" />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında gelişim özetin burada açılır."
        />
      </>,
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [recentExamsDesc, attendance, assignments] = await Promise.all([
    prisma.mockExam.findMany({
      where: { studentId: profile.id },
      orderBy: { takenAt: "desc" },
      take: 6,
      include: { sections: { orderBy: { position: "asc" } } },
    }),
    prisma.attendance.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { lesson: { select: { startsAt: true } } },
    }),
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          include: { progress: { where: { studentId: profile.id }, select: { status: true } } },
        })
      : Promise.resolve([]),
  ]);

  const exams = [...recentExamsDesc].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());

  /* ── Ders bazında net serileri ── */
  const labels = exams.map((_, i) => `D${i + 1}`);
  const subjectNames = [...new Set(exams.flatMap((e) => e.sections.map((s) => s.subjectName)))];
  const series: SubjectSeries[] = subjectNames.map((name, idx) => ({
    name,
    color: SERIES_COLORS[idx % SERIES_COLORS.length],
    nets: exams.map((exam) => {
      const s = exam.sections.find((x) => x.subjectName === name);
      return s ? netFromSection(s) : null;
    }),
  }));

  const trendCaption = buildTrendCaption(series);

  /* ── Katılım ── */
  const attended = attendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE",
  ).length;
  const missedLesson = attendance.find((a) => a.status === "ABSENT");

  /* ── Çalışma tamamlama ── */
  const totalAssignments = assignments.length;
  const doneAssignments = assignments.filter((a) => a.progress[0]?.status === "DONE").length;
  const completionPct =
    totalAssignments > 0 ? Math.round((doneAssignments / totalAssignments) * 100) : null;

  const nothingYet = exams.length === 0 && attendance.length === 0 && totalAssignments === 0;

  return shell(
    <>
      <PanelHeading
        title="Gelişimin"
        description="Ders katılımı, çalışma tamamlama ve deneme netleri bir arada."
      />

      {/*
        Haftalık hedef düzenleme tasarım geçişinde ekrandan düşmüştü:
        `/api/panel/student/weekly-goal` ucu ve bileşen duruyor, ama hiçbir
        sayfa render etmiyordu — öğrenci kendi hedefini yazamıyordu.
      */}
      <div className="mt-6">
        <StudentWeeklyGoal
          initial={profile.weeklyGoal || "Bu hafta en az üç odaklı çalışma tamamlayacağım."}
        />
      </div>

      {nothingYet ? (
        <PanelEmpty
          title="Henüz gösterilecek veri yok."
          body="Derslerin işlendikçe, çalışmaların tamamlandıkça ve denemelerin girildikçe gelişimin burada birikir."
        />
      ) : (
        <>
          <SubjectTrendCard series={series} labels={labels} caption={trendCaption} />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {attendance.length ? (
              <PanelStatCard
                title="Ders katılımı"
                value={`${attended} / ${attendance.length}`}
                note={
                  missedLesson?.lesson?.startsAt
                    ? `Son ${attendance.length} ders · ${DAY.format(missedLesson.lesson.startsAt)} dersine katılmadın`
                    : `Son ${attendance.length} ders`
                }
              />
            ) : null}

            {completionPct !== null ? (
              <PanelStatCard
                title="Çalışma tamamlama"
                value={`%${completionPct}`}
                progressPct={completionPct}
                note={`${doneAssignments} / ${totalAssignments} çalışma tamamlandı.`}
              />
            ) : null}
          </div>
        </>
      )}
    </>,
  );
}
