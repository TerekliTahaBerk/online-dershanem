import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

type TeacherWithUser = Prisma.UserGetPayload<{
  include: {
    teacher: {
      include: {
        lessons: {
          include: { student: true };
        };
      };
    };
  };
}>;

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 – 21:00
const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function startOfWeek(d: Date, offset: number): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function OgretmenTakvimPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const params = await searchParams;
  const weekOffset = parseInt(params.week ?? "0");

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teacher: {
        include: {
          lessons: {
            where: { status: "SCHEDULED" },
            include: { student: true },
            orderBy: { scheduledAt: "asc" },
          },
        },
      },
    },
  })) as unknown as TeacherWithUser | null;

  const teacher = user?.teacher;
  if (!teacher) redirect("/ogretmen");

  const today = new Date();
  const weekStart = startOfWeek(today, weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const weekLessons = teacher.lessons.filter((l) => {
    const d = new Date(l.scheduledAt);
    return d >= weekStart && d < weekEnd;
  });

  const fmtDay = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });
  const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const prevWeek = weekOffset - 1;
  const nextWeek = weekOffset + 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Takvim</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {fmtDay.format(weekStart)} – {fmtDay.format(new Date(weekEnd.getTime() - 86400000))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/ogretmen/takvim?week=${prevWeek}`}
            className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link
            href="/ogretmen/takvim"
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition"
          >
            Bugün
          </Link>
          <Link
            href={`/ogretmen/takvim?week=${nextWeek}`}
            className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="w-14 px-2 py-2 text-stone-400 font-medium text-right sticky left-0 bg-white z-10">Saat</th>
                {weekDays.map((day, i) => {
                  const isToday = day.toDateString() === today.toDateString();
                  return (
                    <th
                      key={i}
                      className={`px-2 py-2 text-center font-medium min-w-[100px] ${
                        isToday ? "text-emerald-700 bg-emerald-50" : "text-stone-600"
                      }`}
                    >
                      <div>{DAY_NAMES[i]}</div>
                      <div className={`text-base font-bold ${isToday ? "text-emerald-700" : "text-stone-800"}`}>
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="border-b border-stone-50">
                  <td className="px-2 py-1.5 text-stone-300 text-right align-top sticky left-0 bg-white z-10 font-medium">
                    {String(hour).padStart(2, "0")}:00
                  </td>
                  {weekDays.map((day, di) => {
                    const isToday = day.toDateString() === today.toDateString();
                    const cellLessons = weekLessons.filter((l) => {
                      const d = new Date(l.scheduledAt);
                      return d.getDate() === day.getDate() && d.getMonth() === day.getMonth() && d.getHours() === hour;
                    });
                    return (
                      <td
                        key={di}
                        className={`px-1 py-1 align-top min-h-[2.5rem] ${isToday ? "bg-emerald-50/30" : ""}`}
                      >
                        {cellLessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="rounded-md bg-emerald-100 border border-emerald-200 px-2 py-1 mb-1 space-y-0.5"
                          >
                            <p className="font-semibold text-emerald-800 truncate">{lesson.student.fullName.split(" ")[0]}</p>
                            <p className="text-emerald-600">{fmtTime.format(new Date(lesson.scheduledAt))} · {lesson.duration}dk</p>
                            {lesson.googleMeetLink && (
                              <a
                                href={lesson.googleMeetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-emerald-600 hover:text-emerald-800 font-medium"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                Meet
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
    </div>
  );
}
