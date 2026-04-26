import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronLeft, ChevronRight, Video, CalendarDays, Radio } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type LessonSlim = Prisma.LessonGetPayload<{
  include: { teacher: { select: { fullName: true } }; package: { select: { name: true } } };
}>;

type LiveContent = Prisma.CourseContentGetPayload<{
  include: {
    module: {
      include: {
        course: true;
      };
    };
  };
}>;

type UserWithStudent = Prisma.UserGetPayload<{ include: { student: true } }>;

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type Props = { searchParams?: Promise<{ week?: string }> };

export default async function PanelTakvimPage({ searchParams }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { student: true },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const sp = await searchParams;
  const weekOffset = parseInt(sp?.week ?? "0", 10);
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekStart = getWeekStart(baseDate);
  const weekEnd = addDays(weekStart, 7);

  const prevWeek = `?week=${weekOffset - 1}`;
  const nextWeek = `?week=${weekOffset + 1}`;
  const todayLink = `?week=0`;

  const [lessonsRaw, liveContents] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        studentId: student.id,
        scheduledAt: { gte: weekStart, lt: weekEnd },
        status: { not: "CANCELLED" },
      },
      include: {
        teacher: { select: { fullName: true } },
        package: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }) as unknown as (LessonSlim & { googleMeetLink: string | null; status: string; duration: number })[],
    prisma.courseContent.findMany({
      where: {
        contentType: "LIVE_SESSION",
        status: "PUBLISHED",
        liveStartsAt: { gte: weekStart, lt: weekEnd },
        module: {
          course: {
            studentProgress: {
              some: { studentId: student.id },
            },
          },
        },
      },
      include: {
        module: {
          include: {
            course: true,
          },
        },
      },
      orderBy: { liveStartsAt: "asc" },
    }) as unknown as LiveContent[],
  ]);

  const lessonEvents = lessonsRaw.map((lesson) => ({
    id: lesson.id,
    startsAt: lesson.scheduledAt,
    duration: lesson.duration,
    title: lesson.teacher.fullName,
    subtitle: lesson.package?.name ?? "Canlı ders",
    type: "lesson" as const,
    href: lesson.googleMeetLink,
  }));

  const contentEvents = liveContents
    .filter((content) => content.liveStartsAt)
    .map((content) => ({
      id: content.id,
      startsAt: content.liveStartsAt as Date,
      duration: content.durationMinutes ?? 60,
      title: content.title,
      subtitle: content.module.course.title,
      type: "content" as const,
      href: content.externalUrl || content.videoUrl || content.fileUrl || null,
    }));

  const allEvents = [...lessonEvents, ...contentEvents].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  const lessonsByDayHour = new Map<string, typeof allEvents>();
  allEvents.forEach((event) => {
    const d = new Date(event.startsAt);
    const dayIndex = (d.getDay() + 6) % 7;
    const hour = d.getHours();
    const key = `${dayIndex}-${hour}`;
    if (!lessonsByDayHour.has(key)) lessonsByDayHour.set(key, []);
    lessonsByDayHour.get(key)!.push(event);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLabel = `${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(weekStart)} – ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(addDays(weekStart, 6))}`;

  return (
    <>
      <div className="pd-page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="pd-page-title">Haftalık Takvim</h1>
            <p className="pd-page-sub">{weekLabel}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href={prevWeek} className="pd-btn pd-btn-ghost pd-btn-sm"><ChevronLeft size={14} /></Link>
            <Link href={todayLink} className="pd-btn pd-btn-ghost pd-btn-sm">Bu Hafta</Link>
            <Link href={nextWeek} className="pd-btn pd-btn-ghost pd-btn-sm"><ChevronRight size={14} /></Link>
          </div>
        </div>
      </div>

      <div className="pd-page-body">
        {allEvents.length === 0 ? (
          <div style={{ background: "var(--pd-bg-elevated)", border: "1px solid var(--pd-line)", borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
            <CalendarDays className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-600">Bu hafta planlı oturum görünmüyor</p>
            <p className="text-xs text-stone-400 mt-1">Yeni dersler ve canlı içerikler burada yer alacak.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[640px]">
                <thead>
                  <tr>
                    <th className="w-14 border-b border-stone-100 bg-stone-50 p-2" />
                    {DAYS.map((day, i) => {
                      const date = addDays(weekStart, i);
                      const isToday = date.toDateString() === today.toDateString();
                      return (
                        <th
                          key={day}
                          className={`border-b border-stone-100 p-2 text-center ${isToday ? "bg-emerald-50" : "bg-stone-50"}`}
                        >
                          <span className={`text-xs font-semibold ${isToday ? "text-emerald-700" : "text-stone-500"}`}>
                            {day}
                          </span>
                          <span className={`block text-sm font-bold mt-0.5 ${isToday ? "text-emerald-700" : "text-stone-800"}`}>
                            {date.getDate()}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((hour) => (
                    <tr key={hour} className="border-b border-stone-50 last:border-0">
                      <td className="text-right pr-3 py-1 text-xs text-stone-400 font-medium align-top pt-2 w-14">
                        {hour}:00
                      </td>
                      {DAYS.map((_, dayIndex) => {
                        const date = addDays(weekStart, dayIndex);
                        const isToday = date.toDateString() === today.toDateString();
                        const key = `${dayIndex}-${hour}`;
                        const cellEvents = lessonsByDayHour.get(key) ?? [];
                        return (
                          <td
                            key={dayIndex}
                            className={`border-l border-stone-100 p-0.5 align-top min-h-[40px] ${isToday ? "bg-emerald-50/30" : ""}`}
                            style={{ minHeight: 40 }}
                          >
                            {cellEvents.map((event) => (
                              <div
                                key={event.id}
                                className={`rounded-md border p-1.5 text-xs mb-0.5 leading-tight ${
                                  event.type === "lesson"
                                    ? "bg-[#DCCCAC]/60 border-[#546B41]/40 text-[#435633]"
                                    : "bg-blue-50 border-blue-200 text-blue-700"
                                }`}
                              >
                                <p className="font-semibold truncate">{event.title}</p>
                                <p className="text-[10px] opacity-80 mt-0.5">{event.subtitle}</p>
                                <p className="text-[10px] opacity-80 mt-0.5">
                                  {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.startsAt))}
                                  {" · "}{event.duration} dk
                                </p>
                                {event.href ? (
                                  <a
                                    href={event.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 flex items-center gap-1 font-medium hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {event.type === "lesson" ? <Video className="w-2.5 h-2.5" /> : <Radio className="w-2.5 h-2.5" />}
                                    Aç
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--pd-muted)", marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "var(--pd-accent-soft)", border: "1px solid var(--pd-accent)" }} />
            Planlı ders
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "#dbeafe", border: "1px solid #93c5fd" }} />
            Canlı içerik
          </span>
        </div>
      </div>
    </>
  );
}
