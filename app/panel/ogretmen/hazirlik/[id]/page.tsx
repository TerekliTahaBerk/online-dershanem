import Link from "next/link";
import { notFound } from "next/navigation";
import { CoachingSessions } from "@/components/panel/coaching-sessions";
import { prisma } from "@/lib/prisma";
import { requireTeacherAnyStaffPermission } from "@/lib/auth/guards";
import { hasStaffPermission } from "@/lib/products/staff-permissions";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { addIstanbulCalendarDays, formatIstanbulDateInput, ISTANBUL_TIME_ZONE } from "@/lib/istanbul-time";
import { resolveTeacherStudent } from "@/lib/panel/teacher-scope";
import { findCoachAssignmentForCoach, getStudentCoaching } from "@/lib/panel/coaching";
import { getStudentExamSubjects, getStudentGoals } from "@/lib/panel/goals";
import { buildWeeklyKocumMetrics } from "@/lib/kocum/metrics";
import { WEEKLY_PLAN_SUGGESTION_KIND_LABELS } from "@/lib/panel/status-vocabulary";
import { setStudentGoal } from "./actions";
import { PanelShell } from "@/components/panel/panel-shell";
import { CoachWeekCalendar } from "@/components/panel/kocum/coach-week-calendar";
import { CoachDeskPanel } from "@/components/panel/kocum/coach-desk-panel";
import { SuggestionReviewButtons } from "@/components/panel/kocum/suggestion-review-buttons";
import { TeacherPlanReview } from "@/components/panel/teacher-plan-review";
import { CoachNoteComposer } from "@/components/panel/yon/coach-note-composer";
import {
  EmptyState,
  List,
  ListRow,
  PageHeader,
  PanelTable,
  PanelTableCell,
  PanelTableRow,
  PropertyList,
  PropertyRow,
  Section,
  StatusBadge,
  ViewTabs,
  buttonClass,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ ÇALIŞMA ALANI (koç) — docs/panel-design-roadmap.md §10.6.
 *
 * Sekmeler (`?sekme=`): Özet · Plan · Görüşmeler · Notlar · Denemeler · Yardım.
 * Yön yazma sekmeleri (Plan, Görüşmeler, Notlar, Yardım) yalnız öğrencinin
 * AKTİF koçu için görünür; OD öğretmeni (grup / bireysel kapsam) Özet ve
 * Denemeler'i görür. Uçlar ve server action'lar atanmış koçu ayrıca doğrular.
 *
 * GÜVENLİK: öğrenci `resolveTeacherStudent` / aktif koç ataması ile çözülür —
 * kapsam dışı 404. Görüşmenin özel notu (`privateNote`) bu sayfada okunmaz.
 *
 * "Dino'nun hazırlık özeti" YOK: AI kapısı koçluk özeti üretmez; uydurma metin yazılmaz.
 */

const DAY = new Intl.DateTimeFormat("tr-TR", { timeZone: ISTANBUL_TIME_ZONE, day: "numeric", month: "long" });
const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  timeZone: ISTANBUL_TIME_ZONE,
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const TABS = ["ozet", "plan", "gorusmeler", "notlar", "denemeler", "yardim"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  ozet: "Özet",
  plan: "Plan",
  gorusmeler: "Görüşmeler",
  notlar: "Notlar",
  denemeler: "Denemeler",
  yardim: "Yardım",
};
const COACH_ONLY: readonly Tab[] = ["plan", "gorusmeler", "notlar", "yardim"];

const NOTE_LANES = [
  { visibility: "INTERNAL", title: "İç not", description: "Yalnız koç ve yönetim görür." },
  { visibility: "STUDENT_VISIBLE", title: "Öğrenci görebilir", description: "Öğrenci görür; veli görmez." },
  { visibility: "PARENT_VISIBLE", title: "Veli görebilir", description: "Öğrenci ve velisi görür." },
] as const;

const PLAN_STATUS: Record<string, { label: string; tone: "neutral" | "warning" | "success" | "info" }> = {
  DRAFT: { label: "Taslak", tone: "neutral" },
  CHANGE_REQUESTED: { label: "Değişiklik istendi", tone: "warning" },
  APPROVED: { label: "Yayında", tone: "success" },
  ARCHIVED: { label: "Arşiv", tone: "neutral" },
};

export default async function CoachPrepPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sekme?: string | string[] }>;
}) {
  // OD öğretmeni (grup / bireysel) ya da Yön koçu; öğrenci kapsamı aşağıda çözülür.
  const session = await requireTeacherAnyStaffPermission(["od:lesson:teach", "ok:coaching:write"]);
  const flags = getPanelFeatureFlags();
  if (!flags.adaptivePlan) notFound();

  const { id } = await params;
  const requestedTab = (await searchParams).sekme;
  // Koç yolu yalnız Yön koç izniyle (COACH@OK); OD öğretmeni grup kapsamına düşer.
  const ownCoachAssignment = (await hasStaffPermission(session.userId, "ok:coaching:write")) ? await findCoachAssignmentForCoach(session.userId, id) : null;
  const coachStudent = ownCoachAssignment ? await prisma.studentProfile.findFirst({ where: { id, coachAssignments: { some: { endedAt: null, coach: { userId: session.userId } } } }, select: { id: true, userId: true, classLevel: true, targetGoal: true, user: { select: { fullName: true, email: true } } } }) : null;
  const student = coachStudent ? { ...coachStudent, name: coachStudent.user.fullName || coachStudent.user.email, groups: [] } : await resolveTeacherStudent(session.userId, id);
  const groupIds = student.groups.map((g) => g.id);
  const isCoach = Boolean(ownCoachAssignment);

  const visibleTabs = TABS.filter((tab) => isCoach || !COACH_ONLY.includes(tab));
  const tab: Tab = typeof requestedTab === "string" && (visibleTabs as readonly string[]).includes(requestedTab) ? (requestedTab as Tab) : "ozet";
  const base = `/panel/ogretmen/hazirlik/${student.id}`;

  /* Geçen haftanın planı — planlama haftasının bir öncesi. */
  const thisWeek = planningWeekStart();
  const lastWeek = new Date(thisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayKey = formatIstanbulDateInput(new Date());

  const [lastPlan, currentPlan, lessonNotes, attendances, examSections, coaching, upcoming, parentLink] = await Promise.all([
    prisma.weeklyPlan.findFirst({
      where: { studentId: student.id, weekStart: { gte: lastWeek, lt: thisWeek } },
      orderBy: { weekStart: "asc" },
      select: { tasks: { where: { status: { not: "SKIPPED" } }, select: { title: true, status: true }, orderBy: { scheduledFor: "asc" } } },
    }),
    prisma.weeklyPlan.findFirst({
      where: { studentId: student.id, weekStart: { gte: thisWeek, lt: addIstanbulCalendarDays(thisWeek, 7) } },
      orderBy: { weekStart: "asc" },
      select: {
        id: true,
        status: true,
        version: true,
        weekStart: true,
        capacityMinutes: true,
        changeRequestCategory: true,
        tasks: { where: { status: { not: "SKIPPED" } }, orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] },
      },
    }),
    prisma.lessonNote.findMany({
      where: { studentId: student.id, lesson: { teacherId: session.userId } },
      select: { note: true, topic: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 2,
    }),
    prisma.attendance.findMany({
      where: { studentId: student.id, lesson: { groupId: { in: groupIds } } },
      select: { status: true },
      orderBy: { lesson: { startsAt: "desc" } },
      take: 6,
    }),
    prisma.mockExamSection.findMany({
      where: { mockExam: { studentId: student.id } },
      select: { subjectName: true, correctCount: true, incorrectCount: true, blankCount: true, mockExam: { select: { id: true, title: true, takenAt: true } } },
      orderBy: { mockExam: { takenAt: "desc" } },
      take: tab === "denemeler" ? 40 : 4,
    }),
    getStudentCoaching(student.id),
    isCoach
      ? prisma.coachingSession.findFirst({
          where: { status: "PLANNED", assignmentId: ownCoachAssignment!.id },
          orderBy: { scheduledAt: "asc" },
          select: { scheduledAt: true, meetingUrl: true, proposedAt: true },
        })
      : Promise.resolve(null),
    isCoach
      ? prisma.parentStudent.findFirst({ where: { studentId: student.id }, select: { parent: { select: { fullName: true, email: true } } } })
      : Promise.resolve(null),
  ]);

  const tasks = lastPlan?.tasks ?? [];
  const done = tasks.filter((t) => t.status === "DONE");
  const pending = tasks.filter((t) => t.status !== "DONE");
  const lastPct = tasks.length ? Math.round((done.length / tasks.length) * 100) : null;
  const attended = attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const currentMetrics = currentPlan?.tasks.length
    ? buildWeeklyKocumMetrics(currentPlan.tasks, todayKey, formatIstanbulDateInput)
    : null;

  const description = [
    student.classLevel,
    "targetGoal" in student ? student.targetGoal : null,
    isCoach ? "Yön aktif" : null,
    parentLink ? `Veli: ${parentLink.parent.fullName || parentLink.parent.email}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PanelShell role={session.role} fullName={session.fullName} email={session.email} pageTitle="Öğrenci çalışma alanı">
      <div className="max-w-[1000px]">
        {isCoach ? (
          <Link href="/panel/ogretmen/yon" className="mb-2 inline-block text-[13px] text-pn-text-muted hover:text-pn-text">
            ← Öğrencilerim
          </Link>
        ) : null}
        <PageHeader
          eyebrow="Öğrenci çalışma alanı"
          title={student.name}
          description={description || undefined}
          actions={
            isCoach && tab !== "gorusmeler" ? (
              <Link href={`${base}?sekme=gorusmeler`} className={buttonClass("primary", "md")}>
                Görüşmeyi kaydet
              </Link>
            ) : undefined
          }
        />

        <div className="mt-5">
          <ViewTabs
            label="Öğrenci bölümleri"
            activeId={tab}
            tabs={visibleTabs.map((item) => ({ id: item, label: TAB_LABEL[item], href: item === "ozet" ? base : `${base}?sekme=${item}` }))}
          />
        </div>

        {tab === "ozet" ? (
          <OzetTab
            isCoach={isCoach}
            studentId={student.id}
            base={base}
            lastWeek={lastWeek}
            lastPlan={{ total: tasks.length, done: done.map((t) => t.title), pending: pending.map((t) => t.title), pct: lastPct }}
            currentPlanStatus={currentPlan?.status ?? null}
            currentPct={currentMetrics?.planCompletionPct ?? null}
            nextSession={upcoming ? { at: upcoming.scheduledAt, meetingUrl: upcoming.proposedAt ? null : upcoming.meetingUrl } : coaching?.nextScheduledAt ? { at: coaching.nextScheduledAt, meetingUrl: null } : null}
            focus={coaching?.focus ?? null}
            lessonNotes={lessonNotes.filter((n) => n.note).map((n) => ({ note: n.note!, at: n.updatedAt }))}
            exam={examSections.slice(0, 2).map((s) => `${s.subjectName} ${(s.correctCount - s.incorrectCount / 4).toFixed(2).replace(".", ",")} net`)}
            attendance={attendances.length ? { attended, total: attendances.length } : null}
          />
        ) : null}

        {tab === "plan" && isCoach ? (
          <PlanTab studentId={student.id} studentName={student.name} plan={currentPlan} metricsPct={currentMetrics?.planCompletionPct ?? null} />
        ) : null}

        {tab === "gorusmeler" && isCoach ? (
          <GorusmelerTab assignmentId={ownCoachAssignment!.id} studentId={student.id} userId={session.userId} nextAt={coaching?.nextScheduledAt ?? null} />
        ) : null}

        {tab === "notlar" && isCoach ? <NotlarTab studentId={student.id} studentName={student.name} canReadPrivate={await hasStaffPermission(session.userId, "ok:note:read_private")} /> : null}

        {tab === "denemeler" ? (
          <Section id="denemeler" title="Dış denemeler" divider={false} description="Okul, kurum veya yayınevi denemelerinden girilen sonuçlar.">
            {examSections.length ? (
              <PanelTable caption="Deneme sonuçları" columns={["Tarih", "Deneme", "Ders", "D / Y / B", "Net"]}>
                {examSections.map((s, index) => (
                  <PanelTableRow key={`${s.mockExam.id}-${s.subjectName}-${index}`}>
                    <PanelTableCell>{DAY.format(s.mockExam.takenAt)}</PanelTableCell>
                    <PanelTableCell>{s.mockExam.title || "Deneme"}</PanelTableCell>
                    <PanelTableCell>{s.subjectName}</PanelTableCell>
                    <PanelTableCell>
                      <span className="tabular-nums">{s.correctCount} / {s.incorrectCount} / {s.blankCount}</span>
                    </PanelTableCell>
                    <PanelTableCell>
                      <span className="font-semibold tabular-nums">{(s.correctCount - s.incorrectCount / 4).toFixed(2).replace(".", ",")}</span>
                    </PanelTableCell>
                  </PanelTableRow>
                ))}
              </PanelTable>
            ) : (
              <EmptyState title="Bu öğrenci için girilmiş deneme sonucu yok." />
            )}
          </Section>
        ) : null}

        {tab === "yardim" && isCoach ? <YardimTab assignmentId={ownCoachAssignment!.id} /> : null}
      </div>
    </PanelShell>
  );
}

async function OzetTab(props: {
  isCoach: boolean;
  studentId: string;
  base: string;
  lastWeek: Date;
  lastPlan: { total: number; done: string[]; pending: string[]; pct: number | null };
  currentPlanStatus: string | null;
  currentPct: number | null;
  nextSession: { at: Date; meetingUrl: string | null } | null;
  focus: string | null;
  lessonNotes: Array<{ note: string; at: Date }>;
  exam: string[];
  attendance: { attended: number; total: number } | null;
}) {
  const [goals, examSubjects, lastCheckIn] = props.isCoach
    ? await Promise.all([
        getStudentGoals(props.studentId),
        getStudentExamSubjects(props.studentId),
        prisma.studentCheckIn.findFirst({
          where: { studentId: props.studentId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, energy: true, barrier: true },
        }),
      ])
    : [[], [], null];
  const status = props.currentPlanStatus ? PLAN_STATUS[props.currentPlanStatus] : null;

  return (
    <>
      <Section id="anlik" title="Anlık durum" divider={false}>
        <PropertyList>
          {props.isCoach ? (
            <PropertyRow label="Sıradaki görüşme">
              {props.nextSession ? (
                <span className="flex flex-wrap items-center gap-2">
                  {DATE_TIME.format(props.nextSession.at)}
                  {props.nextSession.meetingUrl && props.nextSession.at >= new Date() ? (
                    <a href={props.nextSession.meetingUrl} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                      Görüşmeye katıl
                    </a>
                  ) : null}
                </span>
              ) : (
                "Planlanmış görüşme yok"
              )}
            </PropertyRow>
          ) : null}
          {props.focus ? <PropertyRow label="Haftanın odağı">{props.focus}</PropertyRow> : null}
          <PropertyRow label="Bu haftanın planı">
            {status ? (
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge label={status.label} tone={status.tone} />
                {props.currentPct != null ? <span className="text-pn-text-muted">%{props.currentPct} tamamlandı</span> : null}
              </span>
            ) : (
              "Henüz plan taslağı yok"
            )}
          </PropertyRow>
          {props.isCoach && lastCheckIn ? (
            <PropertyRow label="Son check-in">
              {DAY.format(lastCheckIn.createdAt)}
            </PropertyRow>
          ) : null}
          {props.attendance ? (
            <PropertyRow label="Katılım">
              Son {props.attendance.total} dersin {props.attendance.attended} tanesine katıldı
            </PropertyRow>
          ) : null}
          {props.exam.length ? <PropertyRow label="Son deneme">{props.exam.join(" · ")}</PropertyRow> : null}
        </PropertyList>
      </Section>

      <Section id="gecen-hafta" title="Geçen haftanın planı">
        {props.lastPlan.total === 0 ? (
          <p className="text-[14px] text-pn-text-muted">{DAY.format(props.lastWeek)} haftası için kayıtlı plan görevi yok.</p>
        ) : (
          <>
            <div
              role="progressbar"
              aria-valuenow={props.lastPlan.pct ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Geçen hafta plan tamamlama"
              className="h-1.5 max-w-[360px] overflow-hidden rounded-full bg-pn-surface-subtle"
            >
              <div className="h-full rounded-full bg-pn-accent-marker" style={{ width: `${props.lastPlan.pct}%` }} />
            </div>
            <p className="mt-2 text-[13px] text-pn-text-muted">
              {props.lastPlan.done.length} / {props.lastPlan.total} görev tamamlandı
            </p>
            <PropertyList className="mt-2">
              {props.lastPlan.done.length ? <PropertyRow label="Tamamlanan">{props.lastPlan.done.join(", ")}</PropertyRow> : null}
              {props.lastPlan.pending.length ? <PropertyRow label="Yapılmayan">{props.lastPlan.pending.join(", ")}</PropertyRow> : null}
            </PropertyList>
          </>
        )}
      </Section>

      {props.lessonNotes.length ? (
        <Section id="ders-notlari" title="Ders notları">
          <ul className="border-t border-pn-border">
            {props.lessonNotes.map((note, index) => (
              <li key={index} className="border-b border-pn-border py-2.5 text-[14px] text-pn-text">
                {note.note}
                <span className="ml-2 text-[12px] text-pn-text-muted">{DAY.format(note.at)}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {props.isCoach ? (
        <Section id="hedefler" title="Hedefler">
          {goals.length === 0 ? (
            <p className="text-[14px] text-pn-text-muted">Bu öğrenci için henüz hedef belirlenmedi.</p>
          ) : (
            <PropertyList>
              {goals.map((g) => (
                <PropertyRow key={g.id} label={g.label}>
                  {g.current === null
                    ? "ölçüm yok"
                    : g.kind === "PLAN_COMPLETION"
                      ? `şimdi %${g.current}`
                      : `şimdi ${g.current.toFixed(2).replace(".", ",")}`}
                </PropertyRow>
              ))}
            </PropertyList>
          )}

          <form action={setStudentGoal} className="mt-4 grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
            <input type="hidden" name="studentId" value={props.studentId} />
            <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-secondary">
              Hedef türü
              <select name="kind" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60">
                <option value="SUBJECT_NET">Ders neti</option>
                <option value="PLAN_COMPLETION">Plan tamamlama %</option>
              </select>
            </label>
            <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-secondary">
              Ders
              <select name="subjectName" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60">
                <option value="">— (plan hedefi için boş)</option>
                {examSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-secondary">
              Hedef değer
              <input name="targetValue" required inputMode="decimal" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" />
            </label>
            <label className="grid gap-1 text-[12.5px] font-medium text-pn-text-secondary sm:col-span-2">
              Yakın hedef notu
              <input name="nearTermNote" maxLength={300} placeholder="Örn. bir sonraki denemede 21 net" className="w-full rounded-md border border-pn-border-strong bg-white px-3 py-2 text-[14px] text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60" />
            </label>
            <div className="flex items-end">
              <button type="submit" className={buttonClass("secondary", "md")}>
                Hedefi kaydet
              </button>
            </div>
          </form>
          {examSubjects.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-pn-text-muted">
              Ders neti hedefi koyabilmek için önce bu öğrenciye deneme sonucu girilmiş olmalı.
            </p>
          ) : null}
        </Section>
      ) : null}

      {props.isCoach ? (
        <Section id="siradaki-adim" title="Sıradaki adım">
          <div className="flex flex-wrap gap-2">
            <Link href={`${props.base}?sekme=plan`} className={buttonClass("secondary", "sm")}>
              {props.currentPlanStatus ? "Bu haftanın planını aç" : "Plan hazırla"}
            </Link>
            <Link href={`${props.base}?sekme=notlar`} className={buttonClass("ghost", "sm")}>
              Not ekle
            </Link>
          </div>
        </Section>
      ) : null}
    </>
  );
}

async function PlanTab({
  studentId,
  studentName,
  plan,
  metricsPct,
}: {
  studentId: string;
  studentName: string;
  plan: {
    id: string;
    status: "DRAFT" | "APPROVED" | "CHANGE_REQUESTED" | "ARCHIVED";
    version: number;
    weekStart: Date;
    capacityMinutes: number;
    changeRequestCategory: string | null;
    tasks: Array<{ id: string; title: string; scheduledFor: Date; durationMinutes: number; status: string; subject: string | null; sourceType: string; reasonCode: string }>;
  } | null;
  metricsPct: number | null;
}) {
  const [templates, suggestions] = await Promise.all([
    prisma.weeklyPlanTemplate.findMany({ orderBy: { title: "asc" }, take: 50, select: { id: true, title: true } }),
    prisma.weeklyPlanSuggestion.findMany({
      where: { status: "PENDING", studentId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, title: true, rationale: true, kind: true },
    }),
  ]);
  const weekStartIso = (plan?.weekStart ?? planningWeekStart()).toISOString();
  return (
    <>
      {suggestions.length ? (
        <Section id="oneriler" title="Bekleyen öneriler" divider={false} description="Otomatik yayınlanmaz; kabul edilen öneri plana görev ekler.">
          <ul className="border-t border-pn-border">
            {suggestions.map((item) => (
              <li key={item.id} className="border-b border-pn-border py-3">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-pn-text">
                  {item.title}
                  <StatusBadge label={WEEKLY_PLAN_SUGGESTION_KIND_LABELS[item.kind]} tone="info" />
                </p>
                <p className="mt-0.5 text-[13px] text-pn-text-secondary">{item.rationale}</p>
                <SuggestionReviewButtons suggestionId={item.id} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="plan" title="Bu haftanın planı" divider={!suggestions.length ? false : true}>
        {plan ? (
          <div className="space-y-4">
            <CoachWeekCalendar
              planId={plan.id}
              planVersion={plan.version}
              weekStartIso={plan.weekStart.toISOString()}
              studentId={studentId}
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
            {plan.status !== "ARCHIVED" ? (
              <TeacherPlanReview
                plans={[
                  {
                    id: plan.id,
                    studentName,
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
                  },
                ]}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-[14px] text-pn-text-muted">
            Bu hafta için henüz plan taslağı yok. Aşağıdan görev ekleyebilir veya şablon uygulayabilirsin.
          </p>
        )}
      </Section>

      <Section id="kocluk-araclari" title="Koçluk araçları">
        <CoachDeskPanel
          studentId={studentId}
          studentName={studentName}
          planId={plan?.id ?? null}
          planVersion={plan?.version ?? 0}
          weekStartIso={weekStartIso}
          templates={templates}
          planCompletionPct={metricsPct}
        />
      </Section>
    </>
  );
}

async function GorusmelerTab({ assignmentId, studentId, userId, nextAt }: { assignmentId: string; studentId: string; userId: string; nextAt: Date | null }) {
  const history = await prisma.coachingSession.findMany({
    where: { assignmentId, status: { not: "PLANNED" } },
    orderBy: { scheduledAt: "desc" },
    take: 12,
    // privateNote BİLEREK seçilmiyor.
    select: { id: true, scheduledAt: true, completedAt: true, status: true, focus: true, sharedNote: true },
  });
  return (
    <>
      <Section
        id="planli-gorusmeler"
        title="Planlı görüşmeler"
        divider={false}
        description={
          nextAt
            ? `Sıradaki: ${DATE_TIME.format(nextAt)}. Tamamlarken öğrenciyle paylaşılan not ile yalnız koç ve yönetimin gördüğü özel not ayrı alanlardır.`
            : "Planlanmış görüşme yok; aşağıdan yeni görüşme planlayabilirsin."
        }
      >
        <CoachingSessions actor={{ userId, role: "TEACHER" }} studentId={studentId} />
      </Section>
      <Section id="gecmis-gorusmeler" title="Geçmiş görüşmeler">
        {history.length ? (
          <PanelTable caption="Geçmiş görüşmeler" columns={["Tarih", "Durum", "Odak", "Paylaşılan not"]}>
            {history.map((item) => (
              <PanelTableRow key={item.id}>
                <PanelTableCell>{DAY.format(item.completedAt ?? item.scheduledAt)}</PanelTableCell>
                <PanelTableCell>
                  <StatusBadge
                    label={item.status === "COMPLETED" ? "Yapıldı" : item.status === "CANCELLED" ? "İptal" : "Kaçırıldı"}
                    tone={item.status === "COMPLETED" ? "success" : item.status === "MISSED" ? "warning" : "neutral"}
                  />
                </PanelTableCell>
                <PanelTableCell>{item.focus || "—"}</PanelTableCell>
                <PanelTableCell>{item.sharedNote || "—"}</PanelTableCell>
              </PanelTableRow>
            ))}
          </PanelTable>
        ) : (
          <p className="text-[14px] text-pn-text-muted">Henüz tamamlanmış görüşme yok.</p>
        )}
      </Section>
    </>
  );
}

async function NotlarTab({ studentId, studentName, canReadPrivate }: { studentId: string; studentName: string; canReadPrivate: boolean }) {
  const notes = await prisma.coachNote.findMany({
    where: { studentId, ...(canReadPrivate ? {} : { visibility: { not: "INTERNAL" as const } }) },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, body: true, visibility: true, createdAt: true, author: { select: { fullName: true, email: true } } },
  });
  return (
    <>
      <Section id="not-yaz" title="Not ekle" divider={false}>
        <CoachNoteComposer studentId={studentId} studentName={studentName} />
      </Section>
      <div className="mt-8 grid gap-6 border-t border-pn-border pt-6 lg:grid-cols-3">
        {NOTE_LANES.filter((lane) => canReadPrivate || lane.visibility !== "INTERNAL").map((lane) => {
          const laneNotes = notes.filter((note) => note.visibility === lane.visibility);
          return (
            <section key={lane.visibility} aria-labelledby={`lane-${lane.visibility}`} data-note-lane={lane.visibility}>
              <h2 id={`lane-${lane.visibility}`} className="flex items-center gap-2 text-[14px] font-semibold text-pn-text">
                {lane.title}
                <span className="rounded-full bg-pn-surface-subtle px-1.5 text-[11.5px] text-pn-text-muted">{laneNotes.length}</span>
              </h2>
              <p className="text-[12.5px] text-pn-text-muted">{lane.description}</p>
              {laneNotes.length ? (
                <ul className="mt-2 border-t border-pn-border">
                  {laneNotes.map((note) => (
                    <li key={note.id} className="border-b border-pn-border py-2.5">
                      <p className="text-[13.5px] leading-[1.55] text-pn-text">{note.body}</p>
                      <p className="mt-0.5 text-[12px] text-pn-text-muted">
                        {DAY.format(note.createdAt)} · {note.author.fullName || note.author.email}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-pn-text-muted">Bu şeritte not yok.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

async function YardimTab({ assignmentId }: { assignmentId: string }) {
  const requests = await prisma.studentHelpRequest.findMany({
    where: { coachAssignmentId: assignmentId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, status: true, createdAt: true, dueAt: true, firstResponseAt: true, helpful: true },
  });
  return (
    <Section
      id="yardim"
      title="Yardım istekleri"
      divider={false}
      description="Check-in'den gelen istekler. Yanıt Yardım isteyenler ekranından verilir."
      actions={
        <Link href="/panel/ogretmen/yardim" className={buttonClass("secondary", "sm")}>
          Yardım isteyenleri aç
        </Link>
      }
    >
      {requests.length ? (
        <List label="Yardım istekleri">
          {requests.map((item) => (
            <ListRow
              key={item.id}
              title={DAY.format(item.createdAt)}
              meta={
                item.status === "OPEN"
                  ? `Yanıt için son tarih ${DAY.format(item.dueAt)}`
                  : item.firstResponseAt
                    ? `Yanıtlandı ${DAY.format(item.firstResponseAt)}${item.helpful === true ? " · öğrenci faydalı buldu" : ""}`
                    : undefined
              }
              status={
                <StatusBadge
                  label={item.status === "OPEN" ? "Açık" : item.status === "RESPONDED" ? "Yanıtlandı" : "Kapandı"}
                  tone={item.status === "OPEN" ? "warning" : item.status === "RESPONDED" ? "success" : "neutral"}
                />
              }
            />
          ))}
        </List>
      ) : (
        <EmptyState title="Bu öğrenciden yardım isteği yok." />
      )}
    </Section>
  );
}
