import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { PanelShell } from "@/components/panel/panel-shell";
import { AdminPageHeader } from "@/components/panel/admin-page-header";
import { StatusBadge, buttonClass } from "@/components/panel/ui";
import {
  addIstanbulCalendarDays,
  istanbulWeekStart,
} from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

function weekBounds(offset: number) {
  const start = istanbulWeekStart(new Date(), offset);
  return { start, end: addIstanbulCalendarDays(start, 7) };
}

const dayTitle = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const time = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
});
const rangeDate = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
});

type CalendarLesson = Awaited<ReturnType<typeof loadWeekLessons>>[number];

async function loadWeekLessons(
  start: Date,
  end: Date,
  filters: { teacher?: string; group?: string },
) {
  return prisma.lesson.findMany({
    where: {
      startsAt: { gte: start, lt: end },
      ...(filters.teacher ? { teacherId: filters.teacher } : {}),
      ...(filters.group ? { groupId: filters.group } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: {
      group: { select: { id: true, name: true, subject: true } },
      teacher: { select: { fullName: true, email: true } },
    },
  });
}

const LESSON_STATUS: Record<string, { label: string; tone: "neutral" | "success" | "critical" }> = {
  CANCELLED: { label: "İptal", tone: "critical" },
  COMPLETED: { label: "Bitti", tone: "success" },
};

/** Gün sütunu: kartsız, ince ayraçlı; bugün ürün vurgusuyla işaretlenir. */
function DayColumn({ day, lessons }: { day: Date; lessons: CalendarLesson[] }) {
  const dayStart = day.getTime();
  const dayEnd = dayStart + 86400000;
  const items = lessons.filter(
    (lesson) =>
      lesson.startsAt.getTime() >= dayStart &&
      lesson.startsAt.getTime() < dayEnd,
  );
  const today = Date.now() >= dayStart && Date.now() < dayEnd;

  return (
    <section
      aria-label={dayTitle.format(day)}
      className="min-h-0 border-t border-pn-border pt-2 lg:min-h-[480px] lg:border-t-0 lg:border-l lg:px-2 lg:pt-0 lg:first:border-l-0"
    >
      <p
        className={`flex items-center gap-1.5 py-1.5 text-[12.5px] font-semibold capitalize ${
          today ? "text-pn-accent" : "text-pn-text-secondary"
        }`}
        aria-current={today ? "date" : undefined}
      >
        {today ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-pn-accent" /> : null}
        {dayTitle.format(day)}
        {today ? <span className="sr-only"> (bugün)</span> : null}
      </p>
      <div className="mt-1 space-y-1">
        {items.map((lesson) => {
          const status = LESSON_STATUS[lesson.status] ?? { label: "Planlı", tone: "neutral" as const };
          return (
            <Link
              key={lesson.id}
              href={`/panel/yonetim/gruplar/${lesson.group.id}`}
              className={`block rounded-md px-2 py-1.5 transition-colors hover:bg-pn-hover ${
                lesson.status === "CANCELLED" ? "opacity-60" : ""
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold tabular-nums text-pn-text-secondary">
                  {time.format(lesson.startsAt)}
                </span>
                <StatusBadge label={status.label} tone={status.tone} />
              </span>
              <span className={`mt-0.5 block text-[13px] font-medium leading-5 text-pn-text ${lesson.status === "CANCELLED" ? "line-through" : ""}`}>
                {lesson.title}
              </span>
              <span className="block text-[12px] leading-4 text-pn-text-muted">
                {lesson.group.name} · {lesson.teacher.fullName || lesson.teacher.email}
              </span>
            </Link>
          );
        })}
        {!items.length ? (
          <p className="px-2 py-3 text-[12.5px] text-pn-text-muted lg:py-6">
            Ders yok
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; teacher?: string; group?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const params = await searchParams;
  const week = Math.max(-52, Math.min(52, Number(params.week) || 0));
  const { start, end } = weekBounds(week);
  const [lessons, teachers, groups] = await Promise.all([
    loadWeekLessons(start, end, params),
    prisma.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
    prisma.group.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const days = Array.from({ length: 7 }, (_, index) =>
    addIstanbulCalendarDays(start, index),
  );
  const query = (nextWeek: number) => {
    const qs = new URLSearchParams({ week: String(nextWeek) });
    if (params.teacher) qs.set("teacher", params.teacher);
    if (params.group) qs.set("group", params.group);
    return `/panel/yonetim/takvim?${qs}`;
  };

  return (
    <PanelShell
      role={session.role}
      fullName={session.fullName}
      email={session.email}
    >
      <AdminPageHeader
        eyebrow="Haftalık plan"
        title="Ders takvimi"
        description="Tüm grupların derslerini gün gün görün; öğretmen veya gruba göre odağınızı daraltın."
        icon={CalendarDays}
        meta={`${lessons.length} ders`}
      />
      {/* Araç çubuğu: hafta gezinmesi + filtreler + dışa aktarma, tek düz satır. */}
      <div className="mt-6 flex flex-col gap-3 border-y border-pn-border py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={query(week - 1)}
            className={buttonClass("ghost", "sm")}
            aria-label="Önceki hafta"
          >
            <ChevronLeft size={16} />
          </Link>
          <div className="min-w-[190px] text-center">
            <p className="text-[13.5px] font-semibold text-pn-text">
              {rangeDate.format(start)} –{" "}
              {rangeDate.format(new Date(end.getTime() - 1))}
            </p>
            <p className="text-[12px] text-pn-text-muted">
              {week === 0
                ? "Bu hafta"
                : week > 0
                  ? `${week} hafta sonrası`
                  : `${Math.abs(week)} hafta önce`}
            </p>
          </div>
          <Link
            href={query(week + 1)}
            className={buttonClass("ghost", "sm")}
            aria-label="Sonraki hafta"
          >
            <ChevronRight size={16} />
          </Link>
          {week !== 0 ? (
            <Link href={query(0)} className={buttonClass("secondary", "sm")}>
              Bugün
            </Link>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            action="/panel/yonetim/takvim"
          >
            <input type="hidden" name="week" value={week} />
            <select
              name="teacher"
              aria-label="Öğretmene göre filtrele"
              defaultValue={params.teacher || ""}
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 min-w-0 py-2 text-[13px] sm:min-w-[170px]"
            >
              <option value="">Tüm öğretmenler</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName || teacher.email}
                </option>
              ))}
            </select>
            <select
              name="group"
              aria-label="Gruba göre filtrele"
              defaultValue={params.group || ""}
              className="w-full rounded-md border border-pn-border-strong bg-white px-3 text-pn-text placeholder:text-pn-text-muted transition-colors hover:border-pn-text-muted focus:border-pn-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 min-w-0 py-2 text-[13px] sm:min-w-[150px]"
            >
              <option value="">Tüm gruplar</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <button className={buttonClass("secondary", "md")}>
              <SlidersHorizontal size={14} aria-hidden="true" /> Uygula
            </button>
          </form>
          <a
            href="/api/panel/calendar/export"
            download
            className={buttonClass("ghost", "md")}
          >
            <Download size={14} aria-hidden="true" /> Tüm programı indir (.ics)
          </a>
        </div>
      </div>

      {/* Mobil: günler alt alta; masaüstü: 7 sütunlu haftalık ızgara */}
      <div className="mt-4 flex flex-col gap-2 lg:hidden">
        {days.map((day) => (
          <DayColumn key={day.toISOString()} day={day} lessons={lessons} />
        ))}
      </div>
      <div className="panel-nav-scroll mt-4 hidden overflow-x-auto pb-2 lg:block">
        <div className="grid min-w-[1120px] grid-cols-7">
          {days.map((day) => (
            <DayColumn key={day.toISOString()} day={day} lessons={lessons} />
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
