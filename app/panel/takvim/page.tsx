import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronLeft, ChevronRight, Video, CalendarDays } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type LessonSlim = Prisma.LessonGetPayload<{
  include: { teacher: { select: { fullName: true } }; package: { select: { name: true } } };
}>;

type UserWithStudent = Prisma.UserGetPayload<{ include: { student: true } }>;

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00–21:00
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

  const lessonsRaw = await prisma.lesson.findMany({
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
  }) as unknown as (LessonSlim & { googleMeetLink: string | null; status: string; duration: number })[];

  // Group lessons by day-hour
  const lessonsByDayHour = new Map<string, typeof lessonsRaw>();
  lessonsRaw.forEach((lesson) => {
    const d = new Date(lesson.scheduledAt);
    const dayIndex = (d.getDay() + 6) % 7;
    const hour = d.getHours();
    const key = `${dayIndex}-${hour}`;
    if (!lessonsByDayHour.has(key)) lessonsByDayHour.set(key, []);
    lessonsByDayHour.get(key)!.push(lesson);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLabel = `${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(weekStart)} – ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(addDays(weekStart, 6))}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Ders Takvimi</h1>
          <p className="text-sm text-stone-500 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={prevWeek} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition">
            <ChevronLeft className="w-4 h-4 text-stone-600" />
          </Link>
          <Link href={todayLink} className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 transition">
            Bu Hafta
          </Link>
          <Link href={nextWeek} className="p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition">
            <ChevronRight className="w-4 h-4 text-stone-600" />
          </Link>
        </div>
      </div>

      {lessonsRaw.length === 0 ? (
        <div className="rounded-2xl bg-white border border-stone-200 py-20 text-center">
          <CalendarDays className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Bu haftada ders bulunmuyor</p>
          <p className="text-xs text-stone-400 mt-1">Dersler planlandığında burada görünecek.</p>
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
                      const cellLessons = lessonsByDayHour.get(key) ?? [];
                      return (
                        <td
                          key={dayIndex}
                          className={`border-l border-stone-100 p-0.5 align-top min-h-[40px] ${isToday ? "bg-emerald-50/30" : ""}`}
                          style={{ minHeight: 40 }}
                        >
                          {cellLessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="rounded-md border bg-[#B0E4CC]/60 border-[#408A71]/40 text-[#285A48] p-1.5 text-xs mb-0.5 leading-tight"
                            >
                              <p className="font-semibold truncate">{lesson.teacher.fullName}</p>
                              <p className="text-[10px] opacity-80 mt-0.5">
                                {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(lesson.scheduledAt))}
                                {" · "}{lesson.duration} dk
                              </p>
                              {lesson.googleMeetLink && (
                                <a
                                  href={lesson.googleMeetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 flex items-center gap-1 font-medium hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Video className="w-2.5 h-2.5" /> Meet
                                </a>
                              )}
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

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span className="inline-block w-3 h-3 rounded bg-[#B0E4CC]/60 border border-[#408A71]/40" />
        Planlanmış ders
      </div>
    </div>
  );
}
