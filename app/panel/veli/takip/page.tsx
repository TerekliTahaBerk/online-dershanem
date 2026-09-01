import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { netScore } from "@/lib/goals";
import { buildTrendCaption, selectLatestSixChronological } from "@/lib/student-progress-trend";
import {
  buildSubjectTrendSentence,
  type ParentSubjectTrend,
} from "@/lib/panel/parent-calm";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelCard, PanelCardTitle, PanelEmpty, PanelHeading, PanelStatCard } from "@/components/panel/ui";
import { NetTrendCard, type TrendPoint } from "@/components/panel/student/home-cards";
import { SubjectTrendCard, type SubjectSeries } from "@/components/panel/student/subject-trend";

export const dynamic = "force-dynamic";

/**
 * VELİ · AKADEMİK GELİŞİM
 *
 * Ders bazlı basit eğilim, deneme trendi, güçlü / destek alanları.
 * Risk skoru, akran karşılaştırması ve özel not yok.
 */

const SERIES_COLORS = ["#14976B", "#E0A34A", "#5C7BA6", "#9C5340", "#6B7A73"];
const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });

export default async function ParentProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const session = await requirePanelRole("PARENT");
  const { studentId } = await searchParams;
  const { children, selected } = await resolveParentScope(session.userId, studentId);

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Gelişim"
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/takip"
        />
      }
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Gelişim" />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde gelişim özeti burada açılır."
        />
      </>,
    );
  }

  const hasODK = selected.products.includes("ODK");
  const hasExamAccess = selected.products.includes("OD") || hasODK;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: selected.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [attendance, assignments, exams, plan] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: selected.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          include: { progress: { where: { studentId: selected.id }, select: { status: true } } },
        })
      : Promise.resolve([]),
    hasExamAccess
      ? prisma.mockExam.findMany({
          where: { studentId: selected.id },
          orderBy: { takenAt: "desc" },
          take: 8,
          include: { sections: { orderBy: { position: "asc" } } },
        })
      : Promise.resolve([]),
    prisma.weeklyPlan.findFirst({
      where: { studentId: selected.id },
      orderBy: { weekStart: "desc" },
      include: { tasks: { select: { status: true } } },
    }),
  ]);

  const attended = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const doneAssignments = assignments.filter((a) => a.progress[0]?.status === "DONE").length;
  const assignmentPct = assignments.length
    ? Math.round((doneAssignments / assignments.length) * 100)
    : null;
  const planDone = plan?.tasks.filter((t) => t.status === "DONE").length ?? 0;
  const planTotal = plan?.tasks.length ?? 0;
  const planPct = planTotal ? Math.round((planDone / planTotal) * 100) : null;

  const selectedExams = selectLatestSixChronological(exams);
  const trend: TrendPoint[] = selectedExams.map((exam, i) => ({
    label: `D${i + 1}`,
    net: Number(
      exam.sections
        .reduce((s, x) => s + netScore(x.correctCount, x.incorrectCount), 0)
        .toFixed(2),
    ),
  }));

  const subjects = [
    ...new Set(selectedExams.flatMap((exam) => exam.sections.map((s) => s.subjectName))),
  ];
  const series: SubjectSeries[] = subjects.map((subject, index) => ({
    name: subject,
    color: SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0]!,
    nets: selectedExams.map((exam) => {
      const section = exam.sections.find((row) => row.subjectName === subject);
      return section
        ? Number(netScore(section.correctCount, section.incorrectCount).toFixed(2))
        : null;
    }),
  }));

  const subjectTrends: ParentSubjectTrend[] = series.map((item) =>
    buildSubjectTrendSentence(
      item.name,
      item.nets.filter((n): n is number => n !== null),
    ),
  );
  const strengths = subjectTrends
    .filter((item) => item.direction === "up" || item.direction === "steady")
    .slice(0, 3);
  const supports = subjectTrends.filter((item) => item.direction === "down").slice(0, 3);

  const caption =
    trend.length >= 2
      ? `Toplam net ${trend[0]!.net.toLocaleString("tr-TR")} → ${trend[trend.length - 1]!.net.toLocaleString("tr-TR")}. Karşılaştırma yalnızca öğrencinin kendi geçmiş denemeleriyle yapılır.`
      : undefined;

  const labels = selectedExams.map((exam) => DAY.format(exam.takenAt));

  return shell(
    <>
      <PanelHeading
        title={`${selected.name} · gelişimi`}
        description="Ders eğilimleri ve deneme özeti. Sıralama veya risk skoru gösterilmez."
      />

      {!hasExamAccess ? (
        <div className="mt-6 max-w-[760px] rounded-[14px] border border-dashed border-[#CBD6D0] bg-white p-[22px]">
          <h2 className="text-[16px] font-bold text-dc-ink">Deneme eğilimi için deneme kaydı gerekir</h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-dc-ink-muted">
            Bu hesapta deneme ürünü yok. Aşağıda ders katılımı ve çalışma tamamlama görünüyor.
          </p>
        </div>
      ) : trend.length >= 2 ? (
        <NetTrendCard
          points={trend}
          caption={
            caption ??
            `Toplam net ${trend[0]!.net.toLocaleString("tr-TR")} → ${trend[trend.length - 1]!.net.toLocaleString("tr-TR")}.`
          }
        />
      ) : (
        <PanelEmpty
          title="Grafik için en az iki deneme gerekiyor."
          body="İkinci deneme sonucu girildiğinde gelişim eğrisi burada açılır."
        />
      )}

      {series.length && labels.length >= 2 ? (
        <SubjectTrendCard series={series} labels={labels} caption={buildTrendCaption(series)} />
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <PanelCard>
          <PanelCardTitle>Güçlü alanlar</PanelCardTitle>
          {strengths.length ? (
            <ul className="mt-3 space-y-2 text-[14px] text-dc-ink-body">
              {strengths.map((item) => (
                <li key={item.subject}>{item.sentence}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-dc-ink-muted">Henüz belirgin güçlü alan yok.</p>
          )}
        </PanelCard>
        <PanelCard>
          <PanelCardTitle>Destek gereken alanlar</PanelCardTitle>
          {supports.length ? (
            <ul className="mt-3 space-y-2 text-[14px] text-dc-ink-body">
              {supports.map((item) => (
                <li key={item.subject}>{item.sentence}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-dc-ink-muted">Şu an ek destek alanı görünmüyor.</p>
          )}
        </PanelCard>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {attendance.length ? (
          <PanelStatCard
            title="Ders katılımı"
            value={`${attended} / ${attendance.length}`}
            note={`Son ${attendance.length} ders`}
          />
        ) : null}
        {assignmentPct !== null ? (
          <PanelStatCard
            title="Çalışma tamamlama"
            value={`%${assignmentPct}`}
            progressPct={assignmentPct}
            note={`${doneAssignments} / ${assignments.length} çalışma`}
          />
        ) : null}
        {planPct !== null ? (
          <PanelStatCard
            title="Plan tamamlama"
            value={`%${planPct}`}
            progressPct={planPct}
            note={`${planDone} / ${planTotal} görev`}
          />
        ) : null}
        {hasExamAccess && exams.length ? (
          <PanelStatCard title="Deneme sayısı" value={String(exams.length)} />
        ) : null}
      </div>
    </>,
  );
}
