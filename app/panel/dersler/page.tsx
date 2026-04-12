import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Video, Clock, CheckCircle, XCircle, CalendarDays, TrendingUp } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type LessonWithRelations = Prisma.LessonGetPayload<{
  include: { teacher: true; package: true };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        lessons: { include: { teacher: true; package: true } };
      };
    };
  };
}>;

type Props = { searchParams?: Promise<{ tab?: string }> };

const TABS = [
  { id: "upcoming", label: "Yaklaşan" },
  { id: "completed", label: "Tamamlanan" },
  { id: "cancelled", label: "İptal" },
  { id: "all", label: "Tümü" },
] as const;

function fmtLong(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

export default async function PanelDerslerPage({ searchParams }: Props) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          lessons: {
            include: { teacher: true, package: true },
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const sp = await searchParams;
  const activeTab = sp?.tab ?? "upcoming";

  const now = new Date();
  const allLessons = student.lessons as unknown as LessonWithRelations[];

  const upcomingLessons = allLessons
    .filter((l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now)
    .reverse();
  const completedLessons = allLessons.filter((l) => l.status === "COMPLETED");
  const cancelledLessons = allLessons.filter((l) => l.status === "CANCELLED");

  const totalHours = Math.round(
    completedLessons.reduce((s, l) => s + l.duration, 0) / 60
  );

  const tabData: Record<string, LessonWithRelations[]> = {
    upcoming: upcomingLessons,
    completed: completedLessons,
    cancelled: cancelledLessons,
    all: [...allLessons].sort((a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    ),
  };

  const visibleLessons = tabData[activeTab] ?? upcomingLessons;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Derslerim</h1>
          <p className="mt-1 text-sm text-stone-500">
            {allLessons.length} ders kaydı · {completedLessons.length} tamamlandı · {totalHours} saat işlendi
          </p>
        </div>
        <Link
          href="/panel/takvim"
          className="hidden sm:flex items-center gap-2 text-sm font-medium text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 px-4 py-2 rounded-lg transition shrink-0"
        >
          <CalendarDays className="w-4 h-4" /> Takvime Git
        </Link>
      </div>

      {/* Stats strip */}
      {completedLessons.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[
            { label: "Tamamlanan", value: completedLessons.length, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
            { label: "Yaklaşan", value: upcomingLessons.length, color: "text-blue-700 bg-blue-50 border-blue-100" },
            { label: "Toplam Saat", value: `${totalHours}s`, color: "text-violet-700 bg-violet-50 border-violet-100" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`flex items-center gap-2 shrink-0 px-3 py-2 rounded-lg border text-xs font-semibold ${color}`}>
              <TrendingUp className="w-3 h-3" />
              {value} {label}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => {
          const count = tabData[tab.id]?.length ?? 0;
          return (
            <Link
              key={tab.id}
              href={`/panel/dersler?tab=${tab.id}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 rounded-full ${
                activeTab === tab.id ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-400"
              }`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Lesson list */}
      {visibleLessons.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-white border border-stone-200">
          <CalendarDays className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Bu filtrede ders görünmüyor</p>
        </div>
      ) : activeTab === "upcoming" ? (
        <div className="space-y-3">
          {visibleLessons.map((lesson) => {
            const isNearby = new Date(lesson.scheduledAt).getTime() - now.getTime() < 30 * 60 * 1000;
            return (
              <div
                key={lesson.id}
                className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isNearby ? "bg-emerald-50 border-emerald-200" : "bg-white border-stone-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isNearby ? "bg-emerald-600" : "bg-stone-100"}`}>
                    <CalendarDays className={`w-5 h-5 ${isNearby ? "text-white" : "text-stone-500"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{lesson.teacher.fullName}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {fmtLong(lesson.scheduledAt)} · {lesson.duration} dk
                      {lesson.package ? ` · ${lesson.package.name}` : ""}
                    </p>
                    {lesson.notes && (
                      <p className="mt-1.5 text-xs text-stone-600 bg-white/80 border border-stone-100 rounded-lg px-3 py-1.5 italic">
                        {lesson.notes}
                      </p>
                    )}
                  </div>
                </div>
                {lesson.googleMeetLink ? (
                  <a
                    href={lesson.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                      isNearby ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-stone-900 text-white hover:bg-stone-700"
                    }`}
                  >
                    <Video className="w-4 h-4" /> Derse Katıl
                  </a>
                ) : (
                  <span className="shrink-0 flex items-center gap-1.5 text-xs text-stone-400 bg-stone-50 border border-stone-200 px-3 py-2 rounded-lg">
                    <Clock className="w-3.5 h-3.5" /> Meet linki bekleniyor
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 overflow-hidden">
          {visibleLessons.map((lesson) => {
            const isCompleted = lesson.status === "COMPLETED";
            const isCancelled = lesson.status === "CANCELLED";
            return (
              <div key={lesson.id} className={`px-5 py-4 ${isCancelled ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isCompleted ? "bg-emerald-50" : isCancelled ? "bg-red-50" : "bg-blue-50"
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : isCancelled ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900">{lesson.teacher.fullName}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {fmtLong(lesson.scheduledAt)} · {lesson.duration} dk
                        {lesson.package ? ` · ${lesson.package.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${
                    isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    isCancelled ? "bg-red-50 text-red-600 border-red-100" :
                    "bg-blue-50 text-blue-700 border-blue-100"
                  }`}>
                    {isCompleted ? "Tamamlandı" : isCancelled ? "İptal" : "Planlandı"}
                  </span>
                </div>
                {/* Notes shown for any lesson that has them */}
                {lesson.notes && (
                  <div className="mt-3 pl-[52px]">
                    <div className={`border rounded-lg px-4 py-2.5 ${isCompleted ? "bg-amber-50 border-amber-100" : "bg-stone-50 border-stone-200"}`}>
                      <p className={`text-xs font-semibold mb-1 ${isCompleted ? "text-amber-700" : "text-stone-600"}`}>
                        {isCompleted ? "Paylaşılan Not" : "Not"}
                      </p>
                      <p className={`text-xs leading-relaxed ${isCompleted ? "text-amber-800" : "text-stone-700"}`}>{lesson.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
