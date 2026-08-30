import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentAdaptivePlan } from "@/components/panel/student-adaptive-plan";
import { PanelHeading, PanelCard, PanelCardTitle, PanelEmpty } from "@/components/panel/ui";
import { getStudentCoaching } from "@/lib/panel/coaching";
import {
  addIstanbulCalendarDays,
  formatIstanbulDateInput,
  ISTANBUL_TIME_ZONE,
  istanbulWeekStart,
} from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · HAFTALIK PLAN — onaylı tasarım (Panel.dc.html → scPlan).
 *
 * ÜRÜN KAPSAMI: Online Koçum (OK). Koçluk yetkisi olmayan öğrenci bu
 * route'u açamaz — guard `requireProductRole("OK", …)`.
 *
 * Tasarımın işlev tanımı: hafta aralığı ve odak satırı, ilerleme çubuğu +
 * "x / y görev", 7 günlük ızgara (her gün kendi kartları; tamamlanan görev
 * sol kenarlıkla işaretli, boş gün kesik çizgili), altta koçun notu.
 */

const DAY_LABEL = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const RANGE = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric", month: "long" });
const TIME = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const DAY_NUMBER = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric" });

export default async function StudentPlanPage() {
  const session = await requireProductRole("OK", "STUDENT");
  if (!getPanelFeatureFlags().adaptivePlan) notFound();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    include: { planPreference: true },
  });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Haftalık planım"
    >
      <div className="max-w-[1040px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Haftalık planın" />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında koçunun kurduğu plan burada görünecek."
        />
      </>,
    );
  }

  const plan = await prisma.weeklyPlan.findFirst({
    where: { studentId: profile.id },
    orderBy: { weekStart: "desc" },
    include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
  });

  /*
   * Kapasite seçimi ve plan onayı `StudentAdaptivePlan` içinde.
   *
   * Tasarım geçişinde bu sayfa salt okunur bir listeye indirilmişti: öğrenci
   * uygun günlerini/süresini bildiremiyor, üretilen planı onaylayamıyor,
   * değişiklik isteyemiyordu. Bileşen ve uçlar
   * (`/api/panel/adaptive-plan/...`) yerinde duruyordu, yalnız hiçbir sayfadan
   * render edilmiyordu.
   */
  const adaptivePlan = (
    <StudentAdaptivePlan
      initialPreference={{
        availableDays: Array.isArray(profile.planPreference?.availableDays)
          ? profile.planPreference.availableDays.filter((day): day is number => typeof day === "number")
          : [1, 3, 5],
        minutesPerDay: profile.planPreference?.minutesPerDay || 45,
        nextExamAt: profile.planPreference?.nextExamAt?.toISOString() || null,
        examLabel: profile.planPreference?.examLabel || null,
        planningEnabled: profile.planPreference?.planningEnabled ?? true,
        overwhelmPulse: profile.planPreference?.overwhelmPulse || null,
      }}
      initialPlan={
        plan
          ? {
              id: plan.id,
              status: plan.status,
              version: plan.version,
              capacityMinutes: plan.capacityMinutes,
              tasks: plan.tasks.map((task) => ({
                id: task.id,
                title: task.title,
                scheduledFor: task.scheduledFor.toISOString(),
                durationMinutes: task.durationMinutes,
                sourceType: task.sourceType,
                reasonCode: task.reasonCode,
                status: task.status,
              })),
            }
          : null
      }
    />
  );

  if (!plan) {
    return shell(
      <>
        <PanelHeading
          title="Haftalık planın"
          description="Uygun günlerini ve süreni bildir; planın ondan sonra kurulur."
        />
        <div className="mt-6">{adaptivePlan}</div>
      </>,
    );
  }

  const start = istanbulWeekStart(plan.weekStart);
  const days = Array.from({ length: 7 }, (_, i) => addIstanbulCalendarDays(start, i));

  const done = plan.tasks.filter((t) => t.status === "DONE").length;
  const total = plan.tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const end = addIstanbulCalendarDays(start, 6);

  /* Tasarımın "Koçum" bölümü: kim, ne zaman, hangi odak. */
  const coaching = await getStudentCoaching(profile.id);

  return shell(
    <>
      <PanelHeading
        title="Haftalık planın"
        description={`${RANGE.format(start)} – ${RANGE.format(end)}`}
      />

      {coaching ? (
        <PanelCard className="mt-6 max-w-[760px]">
          <PanelCardTitle>Koçun</PanelCardTitle>
          <dl className="mt-3 flex flex-col gap-2.5 text-[14px] font-medium text-dc-ink-body">
            <div className="flex justify-between gap-3">
              <dt>Koçun</dt>
              <dd className="text-dc-ink-muted">{coaching.coachName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Sonraki görüşme</dt>
              <dd className={coaching.overdue ? "text-[#A5764A]" : "text-dc-ink-muted"}>
                {coaching.nextScheduledAt ? RANGE.format(coaching.nextScheduledAt) : "Planlanmadı"}
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
      ) : null}

      <div className="mt-6">{adaptivePlan}</div>

      <div className="mt-8 flex items-center gap-4">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-dc-line-soft"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Haftalık plan ilerlemesi"
        >
          <div className="h-full rounded-full bg-dc-brand" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-[14px] font-bold text-dc-ink">
          {done} / {total} görev
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day, i) => {
          const tasks = plan.tasks.filter(
            (t) => formatIstanbulDateInput(t.scheduledFor) === formatIstanbulDateInput(day),
          );
          return (
            <div key={day.toISOString()}>
              <p className="text-[13px] font-bold text-dc-ink">
                {DAY_LABEL[i]} {DAY_NUMBER.format(day)}
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                {tasks.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-[#CBD6D0] p-3 text-[11.5px] text-dc-ink-ghost">
                    Boş gün
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-[10px] border border-dc-line bg-white p-3 ${
                        task.status === "DONE" ? "border-l-[3px] border-l-dc-brand" : ""
                      }`}
                    >
                      <p className="text-[12.5px] font-semibold text-dc-ink">{task.title}</p>
                      <p className="mt-0.5 text-[11.5px] text-dc-ink-faint">
                        {task.durationMinutes} dk ·{" "}
                        {task.status === "DONE" ? "tamamlandı" : TIME.format(task.scheduledFor)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {plan.changeRequestCategory ? (
        <PanelCard className="mt-6 max-w-[760px]">
          <h2 className="text-[15px] font-bold text-dc-ink">Koçunun notu</h2>
          <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--pd-ink-3)]">
            {plan.changeRequestCategory}
          </p>
        </PanelCard>
      ) : null}
    </>,
  );
}
