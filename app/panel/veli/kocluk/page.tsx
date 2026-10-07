import { CoachingSessions } from "@/components/panel/coaching-sessions";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/auth/guards";
import { resolveParentScope } from "@/lib/panel/parent-scope";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { PanelShell } from "@/components/panel/panel-shell";
import { ChildSwitcher } from "@/components/panel/parent/child-switcher";
import {
  EmptyState,
  PageHeader,
  PropertyList,
  PropertyRow,
  Section,
} from "@/components/panel/ui";
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
  const { children, selected } = await resolveParentScope(
    session.userId,
    studentId,
  );

  const shell = (body: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Yön Koçluk"
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
        <PageHeader title="Yön Koçluk" />
        <EmptyState
          className="mt-6"
          title="Henüz bağlı öğrenci yok."
          body="Hesabınız öğrencinizle eşleştirildiğinde koçluk özeti burada açılır."
        />
      </>,
    );
  }

  if (!selected.products.includes("OK")) {
    return shell(
      <>
        <PageHeader title="Yön Koçluk" description={selected.name} />
        <EmptyState
          className="mt-6"
          title="Bu hesapta Yön Koçluk bulunmuyor."
          body="Koçluk eklendiğinde haftalık plan, tamamlanma oranı ve koç özeti burada görünür."
        />
      </>,
    );
  }

  const [plan, coaching, publishedSummary, goals] = await Promise.all([
    /*
     * VELİYE YALNIZ YAYINLANMIŞ PLAN.
     *
     * Bu sorguda durum süzgeci YOKTU: koçun üzerinde çalıştığı `DRAFT` plan —
     * ve `weekStart` süzgeci de olmadığı için AYLAR ÖNCESİNE ait bir plan —
     * veliye "Bu hafta" başlığı altında tamamlanma yüzdesi olarak
     * gösteriliyordu. Veli, koç daha yayınlamadan yarım bir taslağın %0
     * tamamlandığını görüyordu.
     *
     * Alan seçimi de daraltıldı: `tasks: true` öğrencinin kendi notunu
     * (`studentNote`) ve zorluk/enerji girdilerini de çekiyordu; veli
     * ekranının bu alanlara hiç ihtiyacı yok (§17).
     */
    prisma.weeklyPlan.findFirst({
      where: { studentId: selected.id, status: "APPROVED" },
      orderBy: { weekStart: "desc" },
      select: {
        weekStart: true,
        tasks: {
          select: {
            id: true,
            status: true,
            scheduledFor: true,
            durationMinutes: true,
            actualMinutes: true,
            targetType: true,
            targetValue: true,
            actualQuestions: true,
            subject: true,
          },
        },
      },
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
  // Veli yalnız PARENT_VISIBLE notları görür (`canViewerSeeCoachNote`).
  const parentNotes = await prisma.coachNote.findMany({
    where: { studentId: selected.id, visibility: "PARENT_VISIBLE" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, body: true, createdAt: true },
  });

  const coachCard = coaching ? (
    <Section id="koc" title="Koç" divider={false}>
      <PropertyList>
        <PropertyRow label="Koçu">{coaching.coachName}</PropertyRow>
        <PropertyRow label="Sonraki görüşme">
          {coaching.overdue
            ? "Yeni saat bekleniyor"
            : coaching.nextScheduledAt
              ? RANGE.format(coaching.nextScheduledAt)
              : "Planlanmadı"}
        </PropertyRow>
        {coaching.focus ? <PropertyRow label="Haftanın odağı">{coaching.focus}</PropertyRow> : null}
      </PropertyList>
      {coaching.sharedNote ? (
        <blockquote className="mt-3 border-l-2 border-pn-accent-marker pl-3 text-[14px] leading-[1.6] text-pn-text">
          {coaching.sharedNote}
        </blockquote>
      ) : null}
    </Section>
  ) : null;

  const sessionsBlock = (
    <Section id="gorusmeler" title="Görüşmeler">
      <CoachingSessions actor={{ userId: session.userId, role: "PARENT" }} studentId={selected.id} />
    </Section>
  );

  const notesBlock = parentNotes.length ? (
    <Section id="koc-notlari" title="Koç notları" description="Koçun veliyle paylaştığı notlar.">
      <ul className="border-t border-pn-border">
        {parentNotes.map((note) => (
          <li key={note.id} className="border-b border-pn-border py-3">
            <p className="text-[14px] leading-[1.6] text-pn-text">{note.body}</p>
            <p className="mt-1 text-[12px] text-pn-text-muted">{RANGE.format(note.createdAt)}</p>
          </li>
        ))}
      </ul>
    </Section>
  ) : null;

  const goalsBlock = goals.length ? (
    <Section id="hedefler" title="Hedefler" description="Koçla belirlenen hedefler; yalnız görüntüleme.">
      <PropertyList>
        {goals.slice(0, 5).map((goal) => (
          <PropertyRow key={goal.id} label={goal.label}>
            {goal.percent != null ? `%${goal.percent} ilerleme` : "ölçüm yok"}
          </PropertyRow>
        ))}
      </PropertyList>
    </Section>
  ) : null;

  if (!plan) {
    return shell(
      <>
        <PageHeader title="Yön Koçluk" description={selected.name} />
        {coachCard}
        {sessionsBlock}
        <Section id="bu-hafta" title="Bu hafta">
          <EmptyState
            title="Bu hafta için plan yayınlanmadı."
            body="Koç haftalık planı yayınladığında tamamlanma özeti burada görünür."
          />
        </Section>
        {notesBlock}
        {goalsBlock}
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

  const primaryGoal =
    goals.find((goal) => goal.percent != null) ?? goals[0] ?? null;

  const parentSummary = buildParentKocumSummary({
    planCompletionPct:
      publishedSummary?.planCompletionPct ?? metrics.planCompletionPct,
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
      <PageHeader
        title="Yön Koçluk"
        description={`${selected.name} · ${RANGE.format(start)} – ${RANGE.format(end)}`}
      />

      {coachCard}
      {sessionsBlock}

      <Section id="bu-hafta" title="Bu hafta">
        <p className="text-[15px] font-semibold text-pn-text">
          Planın %{parentSummary.planCompletionPct ?? 0}&apos;ü tamamlandı.
        </p>
        {[parentSummary.studyRhythm, parentSummary.goalProgressLine, parentSummary.overdueTrend]
          .filter(Boolean)
          .map((line) => (
            <p key={line} className="mt-1.5 text-[14px] text-pn-text-secondary">
              {line}
            </p>
          ))}
      </Section>

      {(parentSummary.strengths || parentSummary.focusAreas || parentSummary.nextWeekFocus) && (
        <Section id="koc-ozeti" title="Koç özeti">
          {parentSummary.coachSummary ? (
            <p className="mb-2 text-[14px] leading-[1.6] text-pn-text">{parentSummary.coachSummary}</p>
          ) : null}
          <PropertyList>
            {parentSummary.strengths ? <PropertyRow label="Güçlü">{parentSummary.strengths}</PropertyRow> : null}
            {parentSummary.focusAreas ? <PropertyRow label="Odak">{parentSummary.focusAreas}</PropertyRow> : null}
            {parentSummary.nextWeekFocus ? <PropertyRow label="Gelecek hafta">{parentSummary.nextWeekFocus}</PropertyRow> : null}
          </PropertyList>
        </Section>
      )}

      {notesBlock}
      {goalsBlock}

      <p className="mt-8 text-[12.5px] leading-[1.6] text-pn-text-muted">
        Bu ekran sakin bir özet sunar. İç koç notları, ham check-in ayrıntıları
        ve diğer öğrencilerin verisi paylaşılmaz.
      </p>
    </>,
  );
}
