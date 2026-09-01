import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { PanelShell } from "@/components/panel/panel-shell";
import { TeacherPlanReview } from "@/components/panel/teacher-plan-review";
import { CoachWeekCalendar } from "@/components/panel/kocum/coach-week-calendar";
import { CoachDeskPanel } from "@/components/panel/kocum/coach-desk-panel";
import { SuggestionReviewButtons } from "@/components/panel/kocum/suggestion-review-buttons";
import { addIstanbulCalendarDays, formatIstanbulDateInput } from "@/lib/istanbul-time";
import { buildWeeklyKocumMetrics } from "@/lib/kocum";

export const dynamic = "force-dynamic";

export default async function TeacherPlanPage() {
  const session = await requireRole("TEACHER");
  if (!getPanelFeatureFlags().adaptivePlan) notFound();

  const weekStart = planningWeekStart();
  const weekEnd = addIstanbulCalendarDays(weekStart, 7);
  const todayKey = formatIstanbulDateInput(new Date());

  const plans = await prisma.weeklyPlan.findMany({
    where: {
      weekStart: { gte: weekStart, lt: weekEnd },
      status: { in: ["DRAFT", "CHANGE_REQUESTED", "APPROVED"] },
      OR: [
        {
          student: {
            enrollments: {
              some: { endedAt: null, group: { isActive: true, teacherId: session.userId } },
            },
          },
        },
        {
          student: {
            coachAssignments: {
              some: { endedAt: null, coach: { userId: session.userId } },
            },
          },
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      student: { include: { user: { select: { fullName: true, email: true } } } },
      tasks: {
        where: { status: { not: "SKIPPED" } },
        orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
      },
    },
  });

  const templates = await prisma.weeklyPlanTemplate.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  const suggestions = await prisma.weeklyPlanSuggestion.findMany({
    where: {
      status: "PENDING",
      studentId: { in: plans.map((p) => p.studentId) },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      rationale: true,
      kind: true,
      student: { select: { user: { select: { fullName: true, email: true } } } },
    },
  });

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email}>
      <header>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.08em] text-[var(--brand-olive)]">
          <ListChecks size={15} /> Online Koçum planı
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-[1.25] tracking-[-0.02em]">
          Haftayı görün, düzenleyin, kilitleyin.
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--site-body)]">
          Sistem önerir; kritik değişiklikler sizin onayınız olmadan öğrenciye gitmez. Görevleri
          sürükleyebilir veya Tarihi Değiştir ile taşıyabilirsiniz.
        </p>
      </header>

      {suggestions.length ? (
        <section className="mt-6 panel-surface p-5">
          <h2 className="text-sm font-extrabold">Bekleyen öneriler</h2>
          <p className="mt-1 text-xs text-[var(--site-muted)]">
            Tekrar kuyruğu, deneme sonrası ve adaptif öneriler — otomatik yayınlanmaz.
          </p>
          <ul className="mt-3 space-y-2">
            {suggestions.map((item) => (
              <li key={item.id} className="rounded-xl border border-[var(--site-line)] p-3 text-sm">
                <p className="font-bold">
                  {item.student.user.fullName || item.student.user.email} · {item.title}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[var(--site-muted)]">
                  {item.kind}
                </p>
                <p className="mt-1 text-xs text-[var(--site-muted)]">{item.rationale}</p>
                <SuggestionReviewButtons suggestionId={item.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 space-y-5">
        {plans.map((plan) => {
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
          const studentName = plan.student.user.fullName || plan.student.user.email;
          return (
            <div key={plan.id} className="space-y-4">
              <CoachWeekCalendar
                planId={plan.id}
                planVersion={plan.version}
                weekStartIso={plan.weekStart.toISOString()}
                studentId={plan.studentId}
                studentName={studentName}
                tasks={plan.tasks.map((task) => ({
                  id: task.id,
                  title: task.title,
                  scheduledFor: task.scheduledFor.toISOString(),
                  durationMinutes: task.durationMinutes,
                  status: task.status,
                  subject: task.subject,
                  sourceType: task.sourceType,
                }))}
              />
              <CoachDeskPanel
                studentId={plan.studentId}
                studentName={studentName}
                planId={plan.id}
                planVersion={plan.version}
                weekStartIso={plan.weekStart.toISOString()}
                templates={templates}
                planCompletionPct={metrics.planCompletionPct}
              />
            </div>
          );
        })}
      </div>

      {!plans.length ? (
        <div className="mt-6 panel-surface p-8 text-center">
          <ListChecks className="mx-auto text-[var(--site-muted)]" />
          <h2 className="mt-3 font-extrabold">Bu hafta için plan yok.</h2>
          <p className="mt-1 text-sm text-[var(--site-muted)]">
            Öğrenci plan oluşturduğunda veya siz şablon uyguladığınızda burada görünür.
          </p>
        </div>
      ) : null}

      <div className="mt-7">
        <TeacherPlanReview
          plans={plans.map((plan) => ({
            id: plan.id,
            studentName: plan.student.user.fullName || plan.student.user.email,
            status: plan.status,
            version: plan.version,
            capacityMinutes: plan.capacityMinutes,
            changeRequestCategory: plan.changeRequestCategory,
            tasks: plan.tasks.map((task) => ({
              id: task.id,
              title: task.title,
              scheduledFor: task.scheduledFor.toISOString(),
              durationMinutes: task.durationMinutes,
              reasonCode: task.reasonCode,
            })),
          }))}
        />
      </div>
    </PanelShell>
  );
}
