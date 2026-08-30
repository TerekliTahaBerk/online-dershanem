import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProductRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { PanelShell } from "@/components/panel/panel-shell";
import { StudentAdaptivePlan } from "@/components/panel/student-adaptive-plan";
import { PanelHeading, PanelEmpty } from "@/components/panel/ui";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { addIstanbulCalendarDays, formatIstanbulDateInput, ISTANBUL_TIME_ZONE, istanbulWeekStart } from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · HAFTALIK PLAN — tek dominant deneyim.
 *
 * ÜRÜN KAPSAMI: Online Koçum (OK). Koçluk yetkisi olmayan öğrenci bu
 * route'u açamaz — guard `requireProductRole("OK", …)`.
 *
 * Sayfa tek `<h1>` (PanelHeading) taşır; kalan tüm hiyerarşi
 * `StudentAdaptivePlan` içinde kurulur: bugünkü odak, bugünkü çalışmalar,
 * haftalık ilerleme, koç bölümü, haftanın kalanı, değişiklik/destek ve
 * en altta tercihler. Sunucu tarafı burada yalnız veriyi toplar.
 */

const RANGE = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric", month: "long" });

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
      pageTitle="Bu haftanın planı"
    >
      <div className="max-w-[1040px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Bu haftanın planı" />
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
  const coaching = await getStudentCoaching(profile.id);
  const start = plan ? istanbulWeekStart(plan.weekStart) : null;
  const end = start ? addIstanbulCalendarDays(start, 6) : null;

  return shell(
    <>
      <PanelHeading
        title="Bu haftanın planı"
        description={start && end ? `${RANGE.format(start)} – ${RANGE.format(end)}` : "Uygun günlerini ve süreni bildir; planın ondan sonra kurulur."}
      />

      <div className="mt-6">
        <StudentAdaptivePlan
          today={formatIstanbulDateInput(new Date())}
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
                  changeRequestCategory: plan.changeRequestCategory,
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
          initialCoaching={
            coaching
              ? {
                  coachName: coaching.coachName,
                  nextScheduledAt: coaching.nextScheduledAt ? coaching.nextScheduledAt.toISOString() : null,
                  sharedNote: coaching.sharedNote,
                  focus: coaching.focus,
                  overdue: coaching.overdue,
                }
              : null
          }
        />
      </div>
    </>,
  );
}
