import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { coachingOverdue } from "@/lib/coaching";
import { buildWeeklyKocumMetrics } from "@/lib/kocum/metrics";
import {
  COACH_ATTENTION_LABEL,
  buildCoachWorkspace,
  type CoachAttentionReason,
  type CoachStudentSignals,
} from "@/lib/kocum/coach-workspace";
import {
  addIstanbulCalendarDays,
  formatIstanbulDateInput,
  istanbulWeekStart,
  ISTANBUL_TIME_ZONE,
} from "@/lib/istanbul-time";
import { studentCheckInWeekEnd, studentCheckInWeekStart } from "@/lib/student-check-in";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  EmptyState,
  List,
  ListRow,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  Section,
  StatusBadge,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * KOÇ ÇALIŞMA ALANI (docs/panel-design-roadmap.md §10.5) — Yön Koçluk
 * panelinde koçun "Bugün"ü. Kapsam: giriş yapan koçun AKTİF koçluk atamaları
 * (`coach.userId = <oturum>`, `endedAt = null`). Yetki: COACH@OK
 * (`ok:coaching:write`); OD grup öğretmenliği yetmez. Gizli görüşme notu ve
 * öğrencinin serbest metinleri okunmaz; yalnız sayılar ve durumlar.
 */

const TIME = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const REASON_ACTION: Record<CoachAttentionReason, { label: string; href: (studentId: string) => string }> = {
  RESCHEDULE_REQUESTED: { label: "Saat öner", href: (id) => `/panel/ogretmen/hazirlik/${id}` },
  HELP_OPEN: { label: "Yanıtla", href: () => "/panel/ogretmen/yardim" },
  SESSION_OVERDUE: { label: "Görüşme planla", href: (id) => `/panel/ogretmen/hazirlik/${id}` },
  PLAN_APPROVAL: { label: "Planı incele", href: () => "/panel/ogretmen/plan" },
  SUGGESTION_PENDING: { label: "Öneriyi incele", href: () => "/panel/ogretmen/plan" },
  NO_PLAN: { label: "Plan hazırla", href: () => "/panel/ogretmen/plan" },
  CHECK_IN_MISSING: { label: "Öğrenciyi aç", href: (id) => `/panel/ogretmen/hazirlik/${id}` },
  LOW_COMPLIANCE: { label: "Öğrenciyi aç", href: (id) => `/panel/ogretmen/hazirlik/${id}` },
};

const REASON_TONE: Record<CoachAttentionReason, "warning" | "critical" | "info"> = {
  RESCHEDULE_REQUESTED: "info",
  HELP_OPEN: "warning",
  SESSION_OVERDUE: "critical",
  PLAN_APPROVAL: "warning",
  SUGGESTION_PENDING: "info",
  NO_PLAN: "warning",
  CHECK_IN_MISSING: "info",
  LOW_COMPLIANCE: "warning",
};

export default async function CoachWorkspacePage() {
  const session = await requireTeacherStaffPermission("ok:coaching:write");
  const flags = getPanelFeatureFlags();
  const now = new Date();
  const todayKey = formatIstanbulDateInput(now);
  const weekStart = istanbulWeekStart(now);
  const weekEnd = addIstanbulCalendarDays(weekStart, 7);

  const assignments = await prisma.coachAssignment.findMany({
    where: { endedAt: null, coach: { userId: session.userId } },
    select: {
      id: true,
      cadenceDays: true,
      student: { select: { id: true, targetGoal: true, user: { select: { fullName: true, email: true } } } },
      sessions: {
        where: { OR: [{ status: "PLANNED" }, { status: "COMPLETED" }] },
        orderBy: { scheduledAt: "desc" },
        take: 20,
        // privateNote / sharedNote BİLEREK seçilmiyor.
        select: { id: true, status: true, scheduledAt: true, completedAt: true, meetingUrl: true, focus: true, rescheduleRequestedAt: true },
      },
    },
  });
  const studentIds = assignments.map((item) => item.student.id);
  const assignmentIds = assignments.map((item) => item.id);

  const [plans, checkIns, helpRequests, suggestions] = await Promise.all([
    flags.adaptivePlan && studentIds.length
      ? prisma.weeklyPlan.findMany({
          where: {
            studentId: { in: studentIds },
            weekStart: { gte: weekStart, lt: weekEnd },
            status: { in: ["DRAFT", "CHANGE_REQUESTED", "APPROVED"] },
          },
          select: {
            studentId: true,
            status: true,
            tasks: { select: { id: true, status: true, scheduledFor: true, durationMinutes: true, actualMinutes: true } },
          },
        })
      : Promise.resolve([]),
    flags.studentCheckIn && studentIds.length
      ? prisma.studentCheckIn.findMany({
          where: { studentId: { in: studentIds }, createdAt: { gte: studentCheckInWeekStart(now), lt: studentCheckInWeekEnd(now) } },
          distinct: ["studentId"],
          select: { studentId: true },
        })
      : Promise.resolve([]),
    flags.studentCheckIn && assignmentIds.length
      ? prisma.studentHelpRequest.groupBy({
          by: ["studentId"],
          where: { status: "OPEN", coachAssignmentId: { in: assignmentIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    flags.adaptivePlan && studentIds.length
      ? prisma.weeklyPlanSuggestion.groupBy({
          by: ["studentId"],
          where: { status: "PENDING", studentId: { in: studentIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const checkInSet = new Set(checkIns.map((item) => item.studentId));
  const helpCount = new Map(helpRequests.map((item) => [item.studentId, item._count._all]));
  const suggestionCount = new Map(suggestions.map((item) => [item.studentId, item._count._all]));
  const planByStudent = new Map(plans.map((plan) => [plan.studentId, plan]));

  const todaySessions: Array<{ id: string; at: Date; studentId: string; name: string; focus: string | null; meetingUrl: string | null }> = [];
  const signals: CoachStudentSignals[] = assignments.map((assignment) => {
    const name = assignment.student.user.fullName || assignment.student.user.email;
    const planned = assignment.sessions
      .filter((item) => item.status === "PLANNED")
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const lastCompleted = assignment.sessions.find((item) => item.status === "COMPLETED")?.completedAt ?? null;
    const next = planned[0] ?? null;
    for (const item of planned) {
      if (formatIstanbulDateInput(item.scheduledAt) === todayKey) {
        todaySessions.push({ id: item.id, at: item.scheduledAt, studentId: assignment.student.id, name, focus: item.focus, meetingUrl: item.meetingUrl });
      }
    }
    const plan = planByStudent.get(assignment.student.id);
    const metrics = plan?.status === "APPROVED" && plan.tasks.length
      ? buildWeeklyKocumMetrics(plan.tasks, todayKey, formatIstanbulDateInput)
      : null;
    return {
      studentId: assignment.student.id,
      name,
      targetGoal: assignment.student.targetGoal,
      overdue: coachingOverdue(lastCompleted, next?.scheduledAt ?? null, assignment.cadenceDays).overdue,
      nextScheduledAt: next?.scheduledAt ?? null,
      rescheduleRequested: planned.some((item) => item.rescheduleRequestedAt),
      planStatus: (plan?.status as CoachStudentSignals["planStatus"]) ?? null,
      planCompletionPct: metrics ? metrics.planCompletionPct : null,
      checkInThisWeek: checkInSet.has(assignment.student.id),
      openHelpRequests: helpCount.get(assignment.student.id) ?? 0,
      pendingSuggestions: suggestionCount.get(assignment.student.id) ?? 0,
    };
  });
  todaySessions.sort((a, b) => a.at.getTime() - b.at.getTime());

  const workspace = buildCoachWorkspace(signals, { adaptivePlan: flags.adaptivePlan, studentCheckIn: flags.studentCheckIn });
  const signalById = new Map(signals.map((item) => [item.studentId, item]));
  const nextSession = todaySessions.find((item) => item.at >= now) ?? todaySessions[0] ?? null;
  const sortedStudents = [...signals].sort(
    (a, b) =>
      Number(Boolean(workspace.primaryReason.get(b.studentId))) - Number(Boolean(workspace.primaryReason.get(a.studentId))) ||
      a.name.localeCompare(b.name, "tr"),
  );

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Bugün">
      <div className="max-w-[1100px]">
        <PageHeader
          title="Bugün"
          description={
            assignments.length
              ? `${todaySessions.length} görüşme · ${workspace.attentionCount} öğrenci dikkat bekliyor`
              : "Yön Koçluk öğrencilerin burada görünecek."
          }
          actions={
            <>
              {nextSession ? (
                <Link href={`/panel/ogretmen/hazirlik/${nextSession.studentId}`} className={buttonClass("primary", "md")}>
                  Hazırlığa başla
                </Link>
              ) : null}
              {flags.adaptivePlan ? (
                <Link href="/panel/ogretmen/plan" className={buttonClass("secondary", "md")}>
                  Plan masası
                </Link>
              ) : null}
            </>
          }
        />

        {!assignments.length ? (
          <EmptyState
            className="mt-6"
            title="Henüz aktif koçluk öğrencin yok."
            body="Yönetim sana öğrenci atadığında görüşmeler ve dikkat bekleyenler burada açılır."
          />
        ) : (
          <>
            <Section id="bugunku-gorusmeler" title="Bugünkü görüşmeler" divider={false}>
              {todaySessions.length ? (
                <PanelTable caption="Bugünkü görüşmeler" columns={["Saat", "Öğrenci", "Odak", "Plan uyumu", ""]}>
                  {todaySessions.map((item) => {
                    const pct = signalById.get(item.studentId)?.planCompletionPct;
                    return (
                      <PanelTableRow key={item.id}>
                        <PanelTableCell>
                          <span className="font-semibold tabular-nums">{TIME.format(item.at)}</span>
                        </PanelTableCell>
                        <PanelTableCell>{item.name}</PanelTableCell>
                        <PanelTableCell>{item.focus || "—"}</PanelTableCell>
                        <PanelTableCell>{pct == null ? "—" : `%${pct}`}</PanelTableCell>
                        <PanelTableCell>
                          <span className="flex flex-wrap gap-1.5">
                            <Link href={`/panel/ogretmen/hazirlik/${item.studentId}`} className={buttonClass("secondary", "sm")}>
                              Hazırlık<span className="sr-only"> · {item.name}</span>
                            </Link>
                            {item.meetingUrl ? (
                              <a href={item.meetingUrl} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
                                Katıl<span className="sr-only"> · {item.name}</span>
                              </a>
                            ) : null}
                          </span>
                        </PanelTableCell>
                      </PanelTableRow>
                    );
                  })}
                </PanelTable>
              ) : (
                <p className="text-[14px] text-pn-text-muted">Bugün planlı görüşmen yok.</p>
              )}
            </Section>

            <Section
              id="dikkat"
              title="Dikkat bekleyenler"
              description={workspace.groups.length ? "Nedene göre gruplanmış; her satırda sıradaki adım." : undefined}
            >
              {workspace.groups.length ? (
                <div className="space-y-5">
                  {workspace.groups.map((group) => (
                    <div key={group.reason}>
                      <h3 className="mb-1.5 flex items-center gap-2 text-[13.5px] font-semibold text-pn-text">
                        {group.label}
                        <span className="rounded-full bg-pn-surface-subtle px-1.5 text-[11.5px] font-semibold text-pn-text-muted">
                          {group.students.length}
                        </span>
                      </h3>
                      <List label={group.label}>
                        {group.students.map((item) => (
                          <ListRow
                            key={item.studentId}
                            title={item.name}
                            href={`/panel/ogretmen/hazirlik/${item.studentId}`}
                            meta={reasonMeta(group.reason, item)}
                            action={
                              <Link href={REASON_ACTION[group.reason].href(item.studentId)} className={buttonClass("ghost", "sm")}>
                                {REASON_ACTION[group.reason].label}
                                <span className="sr-only"> · {item.name}</span>
                              </Link>
                            }
                          />
                        ))}
                      </List>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Şu an dikkat bekleyen öğrenci yok." />
              )}
            </Section>

            <Section id="ogrencilerim" title="Öğrencilerim" description={`${signals.length} aktif öğrenci`}>
              <PanelTable caption="Öğrencilerim" columns={["Öğrenci", "Sınav", "Haftalık uyum", "Sonraki görüşme", "Durum"]}>
                {sortedStudents.map((item) => {
                  const reason = workspace.primaryReason.get(item.studentId) ?? null;
                  return (
                    <PanelTableRow key={item.studentId}>
                      <PanelTableCell>
                        <Link href={`/panel/ogretmen/hazirlik/${item.studentId}`} className="font-medium text-pn-text underline-offset-2 hover:underline">
                          {item.name}
                        </Link>
                      </PanelTableCell>
                      <PanelTableCell>{item.targetGoal || "—"}</PanelTableCell>
                      <PanelTableCell>
                        {item.planCompletionPct == null ? (
                          "—"
                        ) : (
                          <span className="flex items-center gap-2">
                            <span aria-hidden="true" className="block h-1 w-16 overflow-hidden rounded-full bg-pn-surface-subtle">
                              <span className="block h-full rounded-full bg-pn-accent-marker" style={{ width: `${item.planCompletionPct}%` }} />
                            </span>
                            <span className="tabular-nums">%{item.planCompletionPct}</span>
                          </span>
                        )}
                      </PanelTableCell>
                      <PanelTableCell>{item.nextScheduledAt ? DATE_TIME.format(item.nextScheduledAt) : "Planlanmadı"}</PanelTableCell>
                      <PanelTableCell>
                        {reason ? (
                          <StatusBadge label={COACH_ATTENTION_LABEL[reason]} tone={REASON_TONE[reason]} />
                        ) : (
                          <StatusBadge label="Yolunda" tone="success" />
                        )}
                      </PanelTableCell>
                    </PanelTableRow>
                  );
                })}
              </PanelTable>
            </Section>
          </>
        )}
      </div>
    </PanelShell>
  );
}

function reasonMeta(reason: CoachAttentionReason, item: CoachStudentSignals): string | undefined {
  switch (reason) {
    case "HELP_OPEN":
      return `${item.openHelpRequests} açık istek`;
    case "SUGGESTION_PENDING":
      return `${item.pendingSuggestions} öneri`;
    case "LOW_COMPLIANCE":
      return item.planCompletionPct == null ? undefined : `Bu hafta %${item.planCompletionPct}`;
    case "PLAN_APPROVAL":
      return item.planStatus === "CHANGE_REQUESTED" ? "Öğrenci değişiklik istedi" : "Taslak";
    default:
      return item.targetGoal ?? undefined;
  }
}
