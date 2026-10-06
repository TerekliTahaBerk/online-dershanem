import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { getStudentGoals } from "@/lib/panel/goals";
import { buildYonToday, isHighPriority, yonTargetLabel, type YonTask } from "@/lib/kocum/yon-today";
import { formatMinutesAsHours } from "@/lib/kocum/metrics";
import {
  addIstanbulCalendarDays,
  formatIstanbulDateInput,
  istanbulWeekStart,
  ISTANBUL_TIME_ZONE,
} from "@/lib/istanbul-time";
import { studentCheckInWeekEnd, studentCheckInWeekStart } from "@/lib/student-check-in";
import { PanelShell } from "@/components/panel/panel-shell";
import { YonTaskCheck } from "@/components/panel/yon/yon-task-check";
import {
  EmptyState,
  PageHeader,
  PropertyList,
  PropertyRow,
  Section,
  StatusBadge,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * Yön Bugün (docs/panel-design-roadmap.md §10.1) — "Bugün ne yapmalıyım?"
 * Yön Koçluk panelinde öğrencinin ana sayfası. Var olan veriden okur:
 * onaylı haftalık plan, koçluk görüşmesi, öğrenciye görünür koç notu,
 * hedefler ve check-in. Gizli not (`privateNote`) ve INTERNAL notlar
 * BİLEREK seçilmez.
 */

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
const DAY_SHORT = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, weekday: "short" });
const DAY_MONTH = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric", month: "short" });
const NUM = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export default async function StudentYonTodayPage() {
  const session = await requireProductRole("OK", "STUDENT");
  const flags = getPanelFeatureFlags();
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });

  const shell = (body: React.ReactNode) => (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Bugün">
      <div className="max-w-[880px]">{body}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PageHeader title="Bugün" />
        <EmptyState
          className="mt-6"
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında Yön Koçluk planın burada görünecek."
        />
      </>,
    );
  }

  const now = new Date();
  const weekStart = istanbulWeekStart(now);
  const weekDays = Array.from({ length: 7 }, (_, index) => addIstanbulCalendarDays(weekStart, index));
  const weekDayKeys = weekDays.map((day) => formatIstanbulDateInput(day));
  const todayKey = formatIstanbulDateInput(now);

  const [coaching, goals, plan, nextSession, visibleNote, weeklyCheckIns, lastCheckIn] = await Promise.all([
    getStudentCoaching(profile.id),
    getStudentGoals(profile.id),
    prisma.weeklyPlan.findFirst({
      where: { studentId: profile.id, status: "APPROVED", weekStart: { gte: weekStart, lt: addIstanbulCalendarDays(weekStart, 7) } },
      orderBy: { weekStart: "desc" },
      select: {
        id: true,
        tasks: {
          orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
          select: {
            id: true,
            title: true,
            subject: true,
            topic: true,
            status: true,
            scheduledFor: true,
            scheduleMode: true,
            durationMinutes: true,
            actualMinutes: true,
            targetType: true,
            targetValue: true,
            priority: true,
          },
        },
      },
    }),
    prisma.coachingSession.findFirst({
      where: { status: "PLANNED", scheduledAt: { gte: addIstanbulCalendarDays(now, 0) }, assignment: { studentId: profile.id, endedAt: null } },
      orderBy: { scheduledAt: "asc" },
      select: { scheduledAt: true, meetingUrl: true, focus: true, rescheduleRequestedAt: true },
    }),
    prisma.coachNote.findFirst({
      // Öğrenci yalnız STUDENT_VISIBLE ve PARENT_VISIBLE notları görür (`canViewerSeeCoachNote`).
      where: { studentId: profile.id, visibility: { in: ["STUDENT_VISIBLE", "PARENT_VISIBLE"] } },
      orderBy: { createdAt: "desc" },
      select: { body: true, createdAt: true },
    }),
    flags.studentCheckIn
      ? prisma.studentCheckIn.count({
          where: { studentId: profile.id, createdAt: { gte: studentCheckInWeekStart(now), lt: studentCheckInWeekEnd(now) } },
        })
      : Promise.resolve(0),
    flags.studentCheckIn
      ? prisma.studentCheckIn.findFirst({
          where: { studentId: profile.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
      : Promise.resolve(null),
  ]);

  const tasks: YonTask[] = (plan?.tasks ?? []) as YonTask[];
  const view = buildYonToday(tasks, todayKey, formatIstanbulDateInput, weekDayKeys);
  const canComplete = flags.adaptivePlan;

  // Koçun en yeni paylaşılan sözü: görünür not veya son görüşmenin paylaşılan notu.
  const latestNote =
    visibleNote && (!coaching?.lastCompletedAt || visibleNote.createdAt >= coaching.lastCompletedAt)
      ? { body: visibleNote.body, at: visibleNote.createdAt }
      : coaching?.sharedNote
        ? { body: coaching.sharedNote, at: coaching.lastCompletedAt }
        : visibleNote
          ? { body: visibleNote.body, at: visibleNote.createdAt }
          : null;

  const description = [
    plan ? `${view.openToday} görev` : null,
    plan && view.remainingMinutesToday ? `~${formatMinutesAsHours(view.remainingMinutesToday)}` : null,
    nextSession ? `${DATE_TIME.format(nextSession.scheduledAt)} koç görüşmesi` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return shell(
    <>
      <PageHeader
        title="Bugün"
        description={description || "Yön Koçluk planın, koçun ve hedeflerin."}
        actions={
          <Link
            href={flags.adaptivePlan ? "/panel/ogrenci/plan" : "/panel/ogrenci/kocluk"}
            className={buttonClass("primary", "md")}
          >
            {flags.adaptivePlan ? "Planı aç" : "Koçumu aç"}
          </Link>
        }
      />

      <Section id="bugunun-plani" title="Bugünün planı" divider={false}>
        {!plan ? (
          <EmptyState
            title="Bu hafta için yayında bir plan yok."
            body="Koçun planı hazırlayıp yayınladığında bugünün görevleri burada görünecek."
          />
        ) : view.today.length === 0 ? (
          <p className="text-[14px] text-pn-text-muted">Bugüne planlanmış görev yok. Haftanın kalanına göz atabilirsin.</p>
        ) : (
          <ul aria-label="Bugünün görevleri" className="border-t border-pn-border">
            {view.today.map((task) => (
              <TaskRow key={task.id} task={task} canComplete={canComplete} />
            ))}
          </ul>
        )}
      </Section>

      {view.overdueTotal ? (
        <Section
          id="gecikenler"
          title="Öncelikli gecikenler"
          description={
            view.overdueTotal > view.overdue.length
              ? `${view.overdueTotal} görev gecikti; en eski ${view.overdue.length} tanesi aşağıda.`
              : "Tarihi geçen görevler. Bugüne sığmıyorsa koçuna bildir."
          }
          actions={
            <Link href="/panel/ogrenci/kocluk" className={buttonClass("secondary", "sm")}>
              Koçuna bildir
            </Link>
          }
        >
          <ul aria-label="Geciken görevler" className="border-t border-pn-border">
            {view.overdue.map((task) => (
              <TaskRow key={task.id} task={task} canComplete={canComplete} showDate />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="gorusme" title="Sıradaki görüşme">
        {coaching ? (
          <PropertyList>
            <PropertyRow label="Koç">{coaching.coachName}</PropertyRow>
            <PropertyRow label="Zaman">
              {nextSession ? (
                <>
                  {DATE_TIME.format(nextSession.scheduledAt)}
                  {nextSession.rescheduleRequestedAt ? (
                    <span className="ml-2 inline-block align-middle">
                      <StatusBadge label="Yeni saat istendi" tone="info" />
                    </span>
                  ) : null}
                </>
              ) : coaching.overdue ? (
                "Yeni saat bekleniyor"
              ) : (
                "Planlanmadı"
              )}
            </PropertyRow>
            {nextSession?.focus || coaching.focus ? (
              <PropertyRow label="Odak">{nextSession?.focus || coaching.focus}</PropertyRow>
            ) : null}
            <PropertyRow label="Bağlantı">
              <span className="flex flex-wrap gap-2">
                {nextSession?.meetingUrl ? (
                  <a href={nextSession.meetingUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                    Görüşmeye katıl
                  </a>
                ) : null}
                <Link href="/panel/ogrenci/kocluk#gorusmeler" className={buttonClass("ghost", "sm")}>
                  Yeni saat iste
                </Link>
              </span>
            </PropertyRow>
          </PropertyList>
        ) : (
          <p className="text-[14px] text-pn-text-muted">
            Henüz atanmış koç görünmüyor. Koç ataması yapıldığında görüşmelerin burada açılır.
          </p>
        )}
      </Section>

      <Section
        id="bu-hafta"
        title="Bu hafta"
        description={
          plan
            ? `${view.week.done}/${view.week.total} görev · ${formatMinutesAsHours(view.week.doneMinutes)} / ${formatMinutesAsHours(view.week.plannedMinutes)}`
            : "Plan yayınlandığında haftalık ilerlemen burada görünür."
        }
      >
        {plan ? (
          <ol aria-label="Haftanın günleri" className="grid grid-cols-7 gap-1">
            {view.week.days.map((day, index) => (
              <li
                key={day.key}
                aria-current={day.isToday ? "date" : undefined}
                className={`rounded-md px-1 py-2 text-center ${day.isToday ? "bg-pn-accent-soft" : ""}`}
              >
                <span className={`block text-[12px] font-medium capitalize ${day.isToday ? "text-pn-accent" : "text-pn-text-muted"}`}>
                  {DAY_SHORT.format(weekDays[index])}
                </span>
                <span className="mt-0.5 block text-[13px] font-semibold tabular-nums text-pn-text">
                  {day.total ? `${day.done}/${day.total}` : "—"}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </Section>

      <Section id="koc-notu" title="Koçundan son not">
        {latestNote ? (
          <figure>
            <blockquote className="border-l-2 border-pn-accent-marker pl-3 text-[14px] leading-[1.6] text-pn-text">
              {latestNote.body}
            </blockquote>
            {latestNote.at ? (
              <figcaption className="mt-1 text-[12px] text-pn-text-muted">{DAY_MONTH.format(latestNote.at)}</figcaption>
            ) : null}
          </figure>
        ) : (
          <p className="text-[14px] text-pn-text-muted">Henüz paylaşılan bir koç notu yok.</p>
        )}
      </Section>

      <Section
        id="hedefler"
        title="Hedeflerim"
        actions={
          <Link href="/panel/ogrenci/hedefler" className={buttonClass("ghost", "sm")}>
            Tümü
          </Link>
        }
      >
        {goals.length ? (
          <PropertyList>
            {goals.slice(0, 3).map((goal) => (
              <PropertyRow key={goal.id} label={goal.label}>
                {NUM.format(goal.target)}
                {goal.kind === "PLAN_COMPLETION" ? "%" : ""}
                <span className="text-pn-text-muted">
                  {" · "}
                  {goal.current === null
                    ? "ölçüm yok"
                    : goal.kind === "PLAN_COMPLETION"
                      ? `şu an %${goal.current}`
                      : `şu an ${NUM.format(goal.current)}`}
                </span>
              </PropertyRow>
            ))}
          </PropertyList>
        ) : (
          <p className="text-[14px] text-pn-text-muted">Henüz hedef belirlenmedi. Görüşmede koçunla birlikte belirleyebilirsin.</p>
        )}
      </Section>

      {flags.studentCheckIn ? (
        <Section id="check-in" title="Check-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-pn-text">
              {weeklyCheckIns > 0 && lastCheckIn
                ? `Bu haftanın check-in'i gönderildi · ${DAY_SHORT.format(lastCheckIn.createdAt)}`
                : "Bu haftanın check-in'i bekliyor."}
            </p>
            <Link
              href="/panel/ogrenci/check-in"
              className={buttonClass(weeklyCheckIns > 0 ? "ghost" : "secondary", "sm")}
            >
              {weeklyCheckIns > 0 ? "Check-in'e git" : "Check-in yap"}
            </Link>
          </div>
        </Section>
      ) : null}
    </>,
  );
}

function TaskRow({ task, canComplete, showDate = false }: { task: YonTask; canComplete: boolean; showDate?: boolean }) {
  const done = task.status === "DONE" || task.status === "PARTIAL";
  const target = yonTargetLabel(task);
  const meta = [task.subject, task.topic, target].filter(Boolean).join(" · ");
  return (
    <li className="flex min-h-(--pn-row-h) items-center gap-3 border-b border-pn-border py-2.5">
      {canComplete ? (
        <YonTaskCheck taskId={task.id} title={task.title} done={done} />
      ) : (
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${done ? "bg-pn-accent" : "bg-pn-border-strong"}`} />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] font-medium ${done ? "text-pn-text-muted line-through" : "text-pn-text"}`}>
          {task.title}
          {done && !canComplete ? <span className="sr-only"> (tamamlandı)</span> : null}
        </p>
        {meta || showDate ? (
          <p className="text-[12.5px] text-pn-text-muted">
            {[showDate ? DAY_MONTH.format(task.scheduledFor) : null, meta || null].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      <span className="shrink-0 text-[12.5px] tabular-nums text-pn-text-muted">{task.durationMinutes} dk</span>
      {isHighPriority(task) ? <StatusBadge label={task.priority === "URGENT" ? "Acil" : "Yüksek"} tone="warning" /> : null}
    </li>
  );
}
