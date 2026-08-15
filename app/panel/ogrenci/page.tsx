import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { getAccessibleProducts } from "@/lib/auth/products";
import { PanelShell } from "@/components/panel/panel-shell";
import { PanelEmptyState } from "@/components/panel/empty-state";
import { NoProductAccess } from "@/components/panel/no-product-access";
import { TodayCard, type TodayRow } from "@/components/panel/student/today-card";
import {
  WeeklyPlanCard,
  LatestExamCard,
  NetTrendCard,
  DinoInsightCard,
  type PlanTaskRow,
  type ExamSubjectRow,
  type TrendPoint,
} from "@/components/panel/student/home-cards";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ ANA SAYFASI — onaylı tasarım (Panel.dc.html → scStudentHome).
 *
 * TEK PANEL: sayfa `requirePanelRole` ile korunur (rol yeter, ürün şart
 * değil). Ürün bölümleri satın alıma göre açılır:
 *   OD  → Bugün'deki canlı ders satırı
 *   OK  → Bugün'deki plan görevleri, haftalık plan kartı
 *   ODK → son deneme kartı, net gelişimi
 * Erişimi olmayan ürünün bölümü HİÇ render edilmez (§16).
 *
 * Hiç ürünü olmayan (yeni kayıt olmuş) kullanıcı `NoProductAccess` görür.
 */

const TR_DATE = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const TR_TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const TR_SHORT = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 11) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
}

/** Bir denemenin toplam neti: doğru − yanlış/4, bölüm bölüm toplanır. */
function examNet(sections: { correctCount: number; incorrectCount: number }[]): number {
  return sections.reduce((sum, s) => sum + (s.correctCount - s.incorrectCount / 4), 0);
}

export default async function StudentHomePage() {
  const session = await requirePanelRole("STUDENT");
  const products = await getAccessibleProducts(session.userId, session.role);
  const hasOD = products.includes("OD");
  const hasOK = products.includes("OK");
  const hasODK = products.includes("ODK");

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Ana Sayfa"
    >
      {children}
    </PanelShell>
  );

  // Hiç ürün yok → dürüst durum, uydurma içerik yok.
  if (products.length === 0) {
    return shell(<NoProductAccess role="STUDENT" />);
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) {
    return shell(
      <PanelEmptyState
        title="Profiliniz hazırlanıyor."
        body="Yönetim ekibi öğrenci profilinizi tamamladığında dersleriniz burada görünecek."
      />,
    );
  }

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const enrollments = hasOD
    ? await prisma.enrollment.findMany({
        where: { studentId: profile.id, endedAt: null },
        select: { groupId: true },
      })
    : [];
  const groupIds = enrollments.map((e) => e.groupId);

  const todayLessons =
    hasOD && groupIds.length
      ? await prisma.lesson.findMany({
          where: {
            groupId: { in: groupIds },
            startsAt: { gte: dayStart, lt: dayEnd },
            status: "PLANNED",
          },
          orderBy: { startsAt: "asc" },
          include: { group: true, teacher: { select: { fullName: true } } },
        })
      : [];

  const [weeklyPlan, recentExams] = await Promise.all([

    // Koçluk — bu haftanın planı (Online Koçum kapsamı)
    hasOK
      ? prisma.weeklyPlan.findFirst({
          where: { studentId: profile.id },
          orderBy: { weekStart: "desc" },
          include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
        })
      : Promise.resolve(null),

    // Deneme geçmişi — son deneme kartı ve net gelişimi
    prisma.mockExam.findMany({
      where: { studentId: profile.id },
      orderBy: { takenAt: "desc" },
      take: 6,
      include: { sections: { orderBy: { position: "asc" } } },
    }),
  ]);

  /* ── Bugün akışı ── */
  const rows: TodayRow[] = [];

  for (const lesson of todayLessons) {
    rows.push({
      id: `lesson-${lesson.id}`,
      when: TR_TIME.format(lesson.startsAt),
      title: `${lesson.title} · Canlı ders`,
      meta: [lesson.teacher.fullName, lesson.group.name].filter(Boolean).join(" · "),
      action: { label: "Derse katıl", href: "/panel/ogrenci/takvim", primary: true },
    });
  }

  const todayTasks = (weeklyPlan?.tasks ?? []).filter(
    (t) => t.scheduledFor >= dayStart && t.scheduledFor < dayEnd,
  );
  for (const task of todayTasks) {
    rows.push({
      id: `task-${task.id}`,
      when: TR_TIME.format(task.scheduledFor),
      title: `${task.title} · ${task.durationMinutes} dk`,
      meta: "Haftalık plan görevi",
      action: { label: "Görevi aç", href: "/panel/ogrenci/plan" },
    });
  }

  /* ── Haftalık plan özeti ── */
  const planTasks: PlanTaskRow[] = (weeklyPlan?.tasks ?? []).slice(0, 3).map((t) => ({
    id: t.id,
    title: `${t.title} · ${t.durationMinutes} dk`,
    meta: TR_SHORT.format(t.scheduledFor),
    done: t.status === "DONE",
  }));
  const planDone = (weeklyPlan?.tasks ?? []).filter((t) => t.status === "DONE").length;
  const planTotal = weeklyPlan?.tasks.length ?? 0;

  /* ── Deneme kartı ve gelişim ── */
  const latest = recentExams[0];
  const previous = recentExams[1];
  const latestNet = latest ? examNet(latest.sections) : 0;
  const delta = latest && previous ? latestNet - examNet(previous.sections) : null;

  const subjects: ExamSubjectRow[] = (latest?.sections ?? []).map((s) => ({
    name: s.subjectName,
    correct: s.correctCount,
    incorrect: s.incorrectCount,
    net: s.correctCount - s.incorrectCount / 4,
  }));

  const trend: TrendPoint[] = [...recentExams]
    .reverse()
    .map((exam, i) => ({ label: `D${i + 1}`, net: Number(examNet(exam.sections).toFixed(2)) }));

  const trendCaption =
    trend.length >= 2
      ? `Toplam netin ${trend[0].net.toLocaleString("tr-TR")}'ten ${trend[trend.length - 1].net.toLocaleString("tr-TR")}'e ${
          trend[trend.length - 1].net >= trend[0].net ? "çıktı" : "indi"
        }. Karşılaştırma yalnızca kendi geçmiş denemelerinle yapılır.`
      : "";

  const summaryParts = [
    todayLessons.length ? `bugün ${todayLessons.length} dersin var` : null,
    planTotal ? `haftalık planında ${planTotal - planDone} görev kaldı` : null,
    latest ? `son denemen ${TR_SHORT.format(latest.takenAt)}` : null,
  ].filter(Boolean);

  return shell(
    <div className="max-w-[1040px]">
      <h1 className="text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em] text-dc-ink sm:text-[28px]">
        {greeting(now)}, {session.fullName?.split(" ")[0] || "hoş geldin"}.
      </h1>
      {summaryParts.length ? (
        <p className="mt-2 text-[15.5px] leading-[1.6] text-dc-ink-muted">
          {summaryParts.join(" · ")}.
        </p>
      ) : null}

      <TodayCard rows={rows} dateLabel={TR_DATE.format(now)} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {hasOK && weeklyPlan ? (
          <WeeklyPlanCard
            done={planDone}
            total={planTotal}
            tasks={planTasks}
            href="/panel/ogrenci/plan"
          />
        ) : null}

        {latest ? (
          <LatestExamCard
            net={latestNet}
            delta={delta}
            title={latest.title || latest.exam}
            dateLabel={TR_SHORT.format(latest.takenAt)}
            subjects={subjects}
            href="/panel/ogrenci/denemeler"
          />
        ) : null}
      </div>

      {trend.length >= 2 ? <NetTrendCard points={trend} caption={trendCaption} /> : null}

      {/* Dino AI arka ucu yok — bileşen dürüst durumu kendisi gösterir (§22). */}
      <DinoInsightCard insight={null} basis={null} />

      {hasODK && !latest ? (
        <p className="mt-5 text-[14px] text-dc-ink-muted">
          Deneme Kulübü sonuçların girildiğinde net gelişimin ve analiz burada açılır.
        </p>
      ) : null}
    </div>,
  );
}
