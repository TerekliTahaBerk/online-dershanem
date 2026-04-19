import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Plus, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

type LessonSlim = Prisma.LessonGetPayload<{
  include: {
    student: { select: { id: true; fullName: true } };
    teacher: { select: { fullName: true } };
  };
}>;

type Props = {
  searchParams?: Promise<{ week?: string; teacherId?: string }>;
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 - 21:00
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DAYS_FULL = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday first
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const TEACHER_COLORS = [
  "bg-[#DCCCAC]/60 border-[#546B41]/40 text-[#435633]",
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-violet-100 border-violet-300 text-violet-800",
  "bg-amber-100 border-amber-300 text-amber-800",
  "bg-rose-100 border-rose-300 text-rose-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
];

export default async function DerslerTakvimPage({ searchParams }: Props) {
  const sp = await searchParams;
  const teacherIdFilter = sp?.teacherId ?? "";

  // Parse week offset (0 = current week, 1 = next week, -1 = last week)
  const weekOffset = parseInt(sp?.week ?? "0", 10);
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekStart = getWeekStart(baseDate);
  const weekEnd = addDays(weekStart, 7);

  const prevWeekParam = `?week=${weekOffset - 1}${teacherIdFilter ? `&teacherId=${teacherIdFilter}` : ""}`;
  const nextWeekParam = `?week=${weekOffset + 1}${teacherIdFilter ? `&teacherId=${teacherIdFilter}` : ""}`;
  const todayParam = `?week=0${teacherIdFilter ? `&teacherId=${teacherIdFilter}` : ""}`;

  const [lessonsRaw, teachers] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        scheduledAt: { gte: weekStart, lt: weekEnd },
        status: { not: "CANCELLED" },
        ...(teacherIdFilter ? { teacherId: teacherIdFilter } : {})
      },
      include: {
        student: { select: { id: true, fullName: true } },
        teacher: { select: { fullName: true } }
      },
      orderBy: { scheduledAt: "asc" }
    }) as unknown as LessonSlim[],
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" }
    })
  ]);

  // Map teacher names to color indices
  const teacherColorMap = new Map<string, number>();
  lessonsRaw.forEach((lesson) => {
    if (!teacherColorMap.has(lesson.teacher.fullName)) {
      teacherColorMap.set(lesson.teacher.fullName, teacherColorMap.size % TEACHER_COLORS.length);
    }
  });

  // Group lessons by day index (0=Mon...6=Sun) and hour
  const lessonsByDayHour = new Map<string, LessonSlim[]>();
  lessonsRaw.forEach((lesson) => {
    const d = new Date(lesson.scheduledAt);
    const dayIndex = (d.getDay() + 6) % 7; // 0=Mon
    const hour = d.getHours();
    const key = `${dayIndex}-${hour}`;
    if (!lessonsByDayHour.has(key)) lessonsByDayHour.set(key, []);
    lessonsByDayHour.get(key)!.push(lesson);
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLabel = `${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(weekStart)} – ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(addDays(weekStart, 6))}`;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/dersler" className="text-sm text-gray-500 hover:text-gray-700">Liste</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-700">Takvim</span>
          </div>
          <h1 className="text-xl font-bold text-[#091413] mt-1">{weekLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={prevWeekParam} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} className="text-gray-600" />
          </Link>
          {weekOffset !== 0 && (
            <Link href={todayParam} className="text-xs text-[#546B41] border border-[#546B41]/30 rounded-lg px-3 py-2 hover:bg-[#DCCCAC]/20 transition-colors font-medium">
              Bu Hafta
            </Link>
          )}
          <Link href={nextWeekParam} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} className="text-gray-600" />
          </Link>
          <Link href="/admin/dersler/yeni"
            className="flex items-center gap-1.5 bg-[#546B41] hover:bg-[#435633] text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
            <Plus size={14} /> Ders Ekle
          </Link>
        </div>
      </div>

      {/* Teacher filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`?week=${weekOffset}`}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !teacherIdFilter ? "bg-[#546B41] text-white border-[#546B41]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Tüm Hocalar
        </Link>
        {teachers.map((t) => {
          const colorIdx = teacherColorMap.get(t.fullName) ?? 0;
          const isActive = teacherIdFilter === t.id;
          return (
            <Link
              key={t.id}
              href={`?week=${weekOffset}&teacherId=${t.id}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                isActive ? "bg-[#546B41] text-white border-[#546B41]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.fullName}
            </Link>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-gray-100">
              <div className="py-3 px-3 text-xs text-gray-400 font-medium">Saat</div>
              {weekDays.map((day, i) => {
                const isToday = day.getTime() === today.getTime();
                return (
                  <div key={i} className={`py-3 text-center border-l border-gray-100 ${isToday ? "bg-[#DCCCAC]/10" : ""}`}>
                    <p className={`text-xs font-semibold ${isToday ? "text-[#546B41]" : "text-gray-600"}`}>{DAYS[i]}</p>
                    <p className={`text-sm font-bold mt-0.5 ${isToday ? "text-[#546B41]" : "text-gray-800"}`}>
                      {new Intl.DateTimeFormat("tr-TR", { day: "numeric" }).format(day)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b border-gray-50 min-h-[52px]">
                <div className="py-2 px-3 text-xs text-gray-400 font-medium shrink-0">
                  {String(hour).padStart(2, "0")}:00
                </div>
                {weekDays.map((day, dayIdx) => {
                  const isToday = day.getTime() === today.getTime();
                  const key = `${dayIdx}-${hour}`;
                  const slotLessons = lessonsByDayHour.get(key) ?? [];
                  return (
                    <div key={dayIdx} className={`border-l border-gray-100 p-1 space-y-1 ${isToday ? "bg-[#DCCCAC]/5" : ""}`}>
                      {slotLessons.map((lesson) => {
                        const colorIdx = teacherColorMap.get(lesson.teacher.fullName) ?? 0;
                        const colorClass = TEACHER_COLORS[colorIdx];
                        return (
                          <Link
                            key={lesson.id}
                            href={`/admin/ogrenciler/${lesson.student.id}`}
                            className={`block rounded border px-1.5 py-1 text-xs leading-tight hover:opacity-80 transition-opacity ${colorClass}`}
                          >
                            <p className="font-semibold truncate">{lesson.student.fullName}</p>
                            <p className="opacity-70 truncate text-[10px]">
                              {new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(lesson.scheduledAt))}
                              {" · "}{lesson.teacher.fullName.split(" ")[0]}
                            </p>
                            {(lesson as any).googleMeetLink && (
                              <span className="inline-flex items-center gap-0.5 opacity-60 text-[10px]">
                                <ExternalLink size={8} /> Meet
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      {teacherColorMap.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(teacherColorMap.entries()).map(([name, colorIdx]) => (
            <span key={name} className={`text-xs px-2.5 py-1 rounded-full border ${TEACHER_COLORS[colorIdx]}`}>
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
