import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
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
            progress: { where: { studentId: profile.id }, select: { status: true } },
            group: { select: { teacher: { select: { fullName: true } } } },
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
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const items: Item[] = [
    ...assignments.map((a) => {
      const done = a.progress[0]?.status === "DONE";
      return {
        id: `a-${a.id}`,
        title: a.title,
        meta: `Ders çalışması${a.group.teacher.fullName ? ` · ${a.group.teacher.fullName}` : ""}`,
        due: a.dueAt,
        done,
        overdue: !done && !!a.dueAt && a.dueAt < now,
      };
    }),
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
        description="Öğretmenin verdiği çalışmalar ve koçunun plan görevleri aynı listede."
      />

      {items.length === 0 ? (
        <PanelEmpty
          title="Bekleyen çalışma yok."
          body="Öğretmenin ya da koçun yeni bir çalışma eklediğinde burada görünecek."
        />
      ) : (
        <>
          {group("Bugün", today)}
          {group("Bu hafta", thisWeek)}
          {group("Sonraki", later)}
          {group("Tamamlananlar", done, true)}
        </>
      )}
    </>,
  );
}
