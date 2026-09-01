import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import { PanelHeading, PanelCard, PanelCardTitle, PanelEmpty } from "@/components/panel/ui";
import {
  addIstanbulCalendarDays,
  formatIstanbulDateInput,
  ISTANBUL_TIME_ZONE,
  istanbulWeekStart,
} from "@/lib/istanbul-time";
import { buildParentKocumSummary, buildWeeklyKocumMetrics } from "@/lib/kocum";
import { getStudentGoals } from "@/lib/panel/goals";

export const dynamic = "force-dynamic";

/**
 * VELİ · KOÇLUK — sakin sonuç görünümü.
 *
 * Operasyonel mikro görev listesi, internal koç notları, ham check-in ve
 * risk metadata gösterilmez. Yalnız plan tamamlanma, çalışma düzeni,
 * hedeflere ilerleme özeti ve koçun yayınladığı veli metni.
 */

const RANGE = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
});

export default async function ParentCoachingPage({
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
      pageTitle="Koçluk"
      topbarSlot={
        <ChildSwitcher
          options={children}
          selectedId={selected?.id ?? null}
          basePath="/panel/veli/kocluk"
        />
      }
    >
      <div className="max-w-[1000px]">{body}</div>
    </PanelShell>
  );

  if (!selected) {
    return shell(
      <>
        <PanelHeading title="Koçluk" />
        <PanelEmpty
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde koçluk özeti burada açılır."
        />
      </>,
    );
  }

  if (!selected.products.includes("OK")) {
    return shell(
      <>
        <PanelHeading title="Koçluk" description={selected.name} />
        <PanelEmpty
          title="Bu hesapta Online Koçum bulunmuyor."
          body="Koçluk eklendiğinde haftalık plan, tamamlanma oranı ve koç özeti burada görünür."
        />
      </>,
    );
  }

  const [plan, coaching, publishedSummary, goals] = await Promise.all([
    prisma.weeklyPlan.findFirst({
      where: { studentId: selected.id },
      orderBy: { weekStart: "desc" },
      include: { tasks: true },
    }),
    getStudentCoaching(selected.id),
    prisma.weeklyCoachSummary.findFirst({
      where: { studentId: selected.id, status: "PUBLISHED" },
      orderBy: { weekStart: "desc" },
      select: {
        planCompletionPct: true,
        strengths: true,
        focusAreas: true,
        nextWeekFocus: true,
        parentVisibleText: true,
      },
    }),
    getStudentGoals(selected.id),
  ]);

  const coachCard = coaching ? (
    <PanelCard className="mt-5">
      <PanelCardTitle>Koç</PanelCardTitle>
      <dl className="mt-3 flex flex-col gap-2.5 text-[14px] font-medium text-dc-ink-body">
        <div className="flex justify-between gap-3">
          <dt>Koçu</dt>
          <dd className="text-dc-ink-muted">{coaching.coachName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Sonraki görüşme</dt>
          <dd className={coaching.overdue ? "text-[#C2493D]" : "text-dc-ink-muted"}>
            {coaching.nextScheduledAt ? RANGE.format(coaching.nextScheduledAt) : "Planlanmadı"}
            {coaching.overdue && coaching.overdueDays !== null
              ? ` · ${coaching.overdueDays} gün gecikti`
              : ""}
          </dd>
        </div>
        {coaching.focus ? (
          <div className="flex justify-between gap-3">
            <dt>Haftanın odağı</dt>
            <dd className="text-dc-ink-muted">{coaching.focus}</dd>
          </div>
        ) : null}
      </dl>
      {coaching.sharedNote ? (
        <p className="mt-3.5 rounded-[10px] border border-dc-line-soft bg-[#FCFDFC] px-3.5 py-3 text-[14px] leading-[1.6] text-dc-ink-body">
          {coaching.sharedNote}
        </p>
      ) : null}
    </PanelCard>
  ) : null;

  if (!plan) {
    return shell(
      <>
        <PanelHeading title="Koçluk" description={selected.name} />
        {coachCard}
        <PanelEmpty
          title="Bu hafta için plan yayınlanmadı."
          body="Koç haftalık planı yayınladığında tamamlanma özeti burada görünür."
        />
      </>,
    );
  }

  const start = istanbulWeekStart(plan.weekStart);
  const end = addIstanbulCalendarDays(start, 6);
  const todayKey = formatIstanbulDateInput(new Date());
  const metrics = buildWeeklyKocumMetrics(
    plan.tasks.map((task) => ({
      id: task.id,
      status: task.status,
      scheduledFor: task.scheduledFor,
      durationMinutes: task.durationMinutes,
      actualMinutes: task.actualMinutes,
      targetType: task.targetType,
      targetValue: task.targetValue,
      actualQuestions: task.actualQuestions,
      subject: task.subject,
    })),
    todayKey,
    formatIstanbulDateInput,
  );

  const primaryGoal = goals.find((goal) => goal.percent != null) ?? goals[0] ?? null;

  const parentSummary = buildParentKocumSummary({
    planCompletionPct: publishedSummary?.planCompletionPct ?? metrics.planCompletionPct,
    completedMinutes: metrics.completedMinutes,
    plannedMinutes: metrics.plannedMinutes,
    overdueCount: metrics.taskOverdue,
    previousOverdueCount: null,
    goalLabel: primaryGoal?.label ?? null,
    goalPercent: primaryGoal?.percent ?? null,
    publishedParentText: publishedSummary?.parentVisibleText ?? null,
    strengths: publishedSummary?.strengths ?? null,
    focusAreas: publishedSummary?.focusAreas ?? null,
    nextWeekFocus: publishedSummary?.nextWeekFocus ?? coaching?.focus ?? null,
  });

  return shell(
    <>
      <PanelHeading
        title="Koçluk"
        description={`${selected.name} · ${RANGE.format(start)} – ${RANGE.format(end)}`}
      />

      {coachCard}

      <PanelCard className="mt-5">
        <PanelCardTitle>Bu hafta</PanelCardTitle>
        <p className="mt-3 text-[15px] font-semibold text-dc-ink">
          Planın %{parentSummary.planCompletionPct ?? 0}&apos;ü tamamlandı.
        </p>
        {parentSummary.studyRhythm ? (
          <p className="mt-2 text-[14px] text-dc-ink-muted">{parentSummary.studyRhythm}</p>
        ) : null}
        {parentSummary.goalProgressLine ? (
          <p className="mt-2 text-[14px] text-dc-ink-muted">{parentSummary.goalProgressLine}</p>
        ) : null}
        {parentSummary.overdueTrend ? (
          <p className="mt-1 text-[13.5px] text-dc-ink-muted">{parentSummary.overdueTrend}</p>
        ) : null}
      </PanelCard>

      {(parentSummary.strengths || parentSummary.focusAreas || parentSummary.nextWeekFocus) && (
        <PanelCard className="mt-5">
          <PanelCardTitle>Koç özeti</PanelCardTitle>
          {parentSummary.coachSummary ? (
            <p className="mt-3 text-[14px] leading-[1.6] text-dc-ink-body">{parentSummary.coachSummary}</p>
          ) : null}
          {parentSummary.strengths ? (
            <p className="mt-3 text-[14px]">
              <span className="font-bold">Güçlü: </span>
              {parentSummary.strengths}
            </p>
          ) : null}
          {parentSummary.focusAreas ? (
            <p className="mt-2 text-[14px]">
              <span className="font-bold">Odak: </span>
              {parentSummary.focusAreas}
            </p>
          ) : null}
          {parentSummary.nextWeekFocus ? (
            <p className="mt-2 text-[14px]">
              <span className="font-bold">Gelecek hafta: </span>
              {parentSummary.nextWeekFocus}
            </p>
          ) : null}
        </PanelCard>
      )}

      <p className="mt-5 text-[12.5px] leading-[1.6] text-dc-ink-faint">
        Bu ekran sakin bir özet sunar. İç koç notları, ham check-in ayrıntıları ve diğer
        öğrencilerin verisi paylaşılmaz.
      </p>
    </>,
  );
}
