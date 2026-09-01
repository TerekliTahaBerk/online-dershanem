import { prisma } from "@/lib/prisma";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { StudentAssignmentList } from "@/components/panel/student-assignment-list";
import { requireRole } from "@/lib/auth/guards";
import { addIstanbulCalendarDays, istanbulDayEnd } from "@/lib/istanbul-time";
import { PanelShell } from "@/components/panel/panel-shell";
import {
  PanelHeading,
  PanelSectionLabel,
  PanelTaskRow,
  PanelEmpty,
} from "@/components/panel/ui";

export const dynamic = "force-dynamic";

/**
 * ÖĞRENCİ · ÇALIŞMALAR — onaylı tasarım (Panel.dc.html → sTasks).
 *
 * Tasarımın işlev tanımı: "Öğretmenin verdiği çalışmalar ve koçunun plan
 * görevleri AYNI listede", BUGÜN / BU HAFTA / TAMAMLANANLAR başlıklarıyla.
 * Bu yüzden iki farklı kaynak (Assignment + WeeklyPlanTask) tek akışta
 * birleştirilir; her satırda kaynağı yazar.
 */

const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const TIME = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

type Item = {
  id: string;
  title: string;
  meta: string;
  due: Date | null;
  done: boolean;
  overdue: boolean;
};

export default async function StudentTasksPage() {
  const session = await requireRole("STUDENT");
  const evidenceEnabled = getPanelFeatureFlags().assignmentEvidence;
  const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });

  const shell = (children: React.ReactNode) => (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
      pageTitle="Çalışmalar"
    >
      <div className="max-w-[860px]">{children}</div>
    </PanelShell>
  );

  if (!profile) {
    return shell(
      <>
        <PanelHeading title="Çalışmalar" />
        <PanelEmpty
          title="Profilin hazırlanıyor."
          body="Öğrenci profilin tamamlandığında çalışmaların burada listelenir."
        />
      </>,
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: profile.id, endedAt: null },
    select: { groupId: true },
  });
  const groupIds = enrollments.map((e) => e.groupId);

  const [assignments, plan] = await Promise.all([
    groupIds.length
      ? prisma.assignment.findMany({
          where: { isActive: true, groupId: { in: groupIds } },
          orderBy: { dueAt: "asc" },
          include: {
            progress: { where: { studentId: profile.id }, take: 1 },
            group: { select: { name: true, subject: true, teacher: { select: { fullName: true } } } },
            rubricCriteria: { orderBy: { position: "asc" } },
            submissions: { where: { studentId: profile.id }, orderBy: { attemptNumber: "desc" }, include: { scores: true } },
          },
        })
      : Promise.resolve([]),
    prisma.weeklyPlan.findFirst({
      where: { studentId: profile.id },
      orderBy: { weekStart: "desc" },
      include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
    }),
  ]);

  const now = new Date();
  const todayEnd = istanbulDayEnd(now);
  const weekEnd = istanbulDayEnd(addIstanbulCalendarDays(now, 7));

  /*
   * Koçluk plan görevleri okunur listede kalır; ders çalışmaları ise
   * `StudentAssignmentList` ile ETKİLEŞİMLİ basılır.
   *
   * Tasarım geçişinde bu sayfa tamamen okunur hale gelmişti: öğrenci
   * "Çalışıyorum/Tamamlandı" işaretleyemiyor, kanıtlı ödevde teslim
   * yapamıyordu. Bileşen ve uçlar (`/api/panel/assignments/[id]/progress`,
   * `.../submissions`) yerinde duruyordu, yalnız hiçbir sayfadan
   * render edilmiyordu — dolayısıyla veli görünümü de hiç güncellenmiyordu.
   */
  const items: Item[] = [
    ...(plan?.tasks ?? []).map((t) => ({
      id: `t-${t.id}`,
      title: `${t.title} · ${t.durationMinutes} dk`,
      meta: "Koçluk planı",
      due: t.scheduledFor,
      done: t.status === "DONE",
      overdue: t.status !== "DONE" && t.scheduledFor < now,
    })),
  ];

  const open = items.filter((i) => !i.done);
  const today = open.filter((i) => i.due && i.due <= todayEnd);
  const thisWeek = open.filter((i) => i.due && i.due > todayEnd && i.due <= weekEnd);
  const later = open.filter((i) => !i.due || i.due > weekEnd);
  const done = items.filter((i) => i.done).slice(0, 10);

  const rightLabel = (item: Item) =>
    item.due
      ? item.due <= todayEnd
        ? `bugün ${TIME.format(item.due)}`
        : DAY.format(item.due)
      : "tarihsiz";

  const group = (label: string, list: Item[], muted = false) =>
    list.length ? (
      <>
        <PanelSectionLabel muted={muted}>{label}</PanelSectionLabel>
        <ul className="mt-2.5 rounded-xl border border-dc-line bg-white">
          {list.map((item, i) => (
            <PanelTaskRow
              key={item.id}
              title={item.title}
              meta={item.meta}
              right={item.done ? (item.due ? DAY.format(item.due) : "") : rightLabel(item)}
              rightTone={item.overdue ? "warn" : "default"}
              done={item.done}
              last={i === list.length - 1}
            />
          ))}
        </ul>
      </>
    ) : null;

  return shell(
    <>
      <PanelHeading
        title="Çalışmalar"
        description="Öğretmenin verdiği çalışmalar ve koçunun plan görevleri aynı listede. Çalışmaya başladığında işaretle; kanıtlı çalışmada öğretmen geri bildirimiyle yeniden deneyebilirsin."
      />

      {assignments.length === 0 && items.length === 0 ? (
        <PanelEmpty
          title="Bekleyen çalışma yok."
          body="Öğretmenin ya da koçun yeni bir çalışma eklediğinde burada görünecek."
        />
      ) : null}

      {assignments.length ? (
        <div className="mt-6">
          <PanelSectionLabel>Ders çalışmaların</PanelSectionLabel>
          <div className="mt-2.5">
            <StudentAssignmentList
              evidenceEnabled={evidenceEnabled}
              assignments={assignments.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description || "",
                dueAt: item.dueAt.toISOString(),
                groupName: item.group.name,
                subject: item.group.subject,
                status: item.progress[0]?.status || "TODO",
                version: item.progress[0]?.version || 0,
                evidenceRequired: item.evidenceRequired,
                criteria: item.rubricCriteria.map((criterion) => ({ id: criterion.id, label: criterion.label })),
                submissions: item.submissions.map((submission) => ({
                  id: submission.id,
                  attemptNumber: submission.attemptNumber,
                  status: submission.status,
                  textEvidence: submission.textEvidence,
                  feedback: submission.feedback,
                  scores: submission.scores.map((score) => ({ criterionId: score.criterionId, level: score.level })),
                })),
              }))}
            />
          </div>
        </div>
      ) : null}

      {items.length ? (
        <div className="mt-8">
          {group("Bugün", today)}
          {group("Bu hafta", thisWeek)}
          {group("Yaklaşan", later)}
          {group("Tamamlananlar", done, true)}
        </div>
      ) : null}
    </>,
  );
}
