import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Video, Clock, CheckCircle, CalendarDays, ArrowRight, TrendingUp, BookOpen } from "lucide-react";
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
        purchaseIntents: true;
      };
    };
  };
}>;

function fmt(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function fmtTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

function fmtShort(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", weekday: "short" }).format(new Date(date));
}

export default async function PanelDashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          lessons: {
            include: { teacher: true, package: true },
            orderBy: { scheduledAt: "asc" },
          },
          purchaseIntents: {
            orderBy: { submittedAt: "desc" },
            take: 3,
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <CalendarDays className="w-12 h-12 text-stone-300 mb-4" />
        <h2 className="text-lg font-semibold text-stone-700">Profiliniz hazırlanıyor</h2>
        <p className="mt-2 text-sm text-stone-500">
          Hesabınız kısa süre içinde tamamlanacak.
        </p>
      </div>
    );
  }

  const now = new Date();
  const lessons = student.lessons as unknown as LessonWithRelations[];
  const upcoming = lessons.filter((l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now);
  const nextLesson = upcoming[0] ?? null;
  const completed = lessons.filter((l) => l.status === "COMPLETED");
  const total = lessons.filter((l) => l.status !== "CANCELLED").length;
  const totalHours = Math.round(completed.reduce((s, l) => s + l.duration, 0) / 60);
  const progressPct = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const lastCompleted = completed.at(-1) ?? null;

  const isNearby = nextLesson &&
    new Date(nextLesson.scheduledAt).getTime() - now.getTime() < 30 * 60 * 1000;

  // Next 7 days schedule
  const in7Days = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);
  const weekLessons = upcoming.filter((l) => new Date(l.scheduledAt) < in7Days).slice(0, 6);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Merhaba, {student.fullName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" }).format(now)}
          </p>
        </div>
        <Link
          href="/panel/takvim"
          className="hidden sm:flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-lg transition"
        >
          <CalendarDays className="w-4 h-4" /> Takvime Git
        </Link>
      </div>

      {/* Next lesson hero */}
      {nextLesson ? (
        <div className={`rounded-2xl p-6 ${isNearby ? "bg-emerald-600" : "bg-white border border-stone-200"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isNearby ? "text-emerald-100" : "text-emerald-600"}`}>
                {isNearby ? "Ders başlamak üzere!" : "Sıradaki ders"}
              </p>
              <h2 className={`text-xl font-semibold ${isNearby ? "text-white" : "text-stone-900"}`}>
                {nextLesson.teacher.fullName}
              </h2>
              <p className={`mt-1 text-sm ${isNearby ? "text-emerald-100" : "text-stone-500"}`}>
                {fmt(nextLesson.scheduledAt)} · {nextLesson.duration} dk
                {nextLesson.package ? ` · ${nextLesson.package.name}` : ""}
              </p>
              {nextLesson.notes && (
                <p className={`mt-2 text-xs italic ${isNearby ? "text-emerald-200" : "text-stone-400"}`}>
                  Öğretmen notu: {nextLesson.notes}
                </p>
              )}
            </div>
            {nextLesson.googleMeetLink ? (
              <a
                href={nextLesson.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition ${
                  isNearby ? "bg-white text-emerald-700 hover:bg-emerald-50" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                <Video className="w-4 h-4" /> Derse Katıl
              </a>
            ) : (
              <div className={`shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium ${
                isNearby ? "bg-white/20 text-white" : "bg-stone-100 text-stone-400"
              }`}>
                <Clock className="w-4 h-4" /> Bağlantı yakında paylaşılacak
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-stone-200 p-6 text-center">
          <CalendarDays className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Sıradaki dersiniz henüz planlanmadı</p>
          <p className="text-xs text-stone-400 mt-1">Programınız netleştiğinde burada yer alacak.</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Tamamlanan", value: completed.length, sub: "ders", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "Toplam Saat", value: totalHours, sub: "saat", icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
          { label: "Yaklaşan", value: upcoming.length, sub: "ders", icon: CalendarDays, color: "text-violet-600 bg-violet-50" },
          { label: "Aktif Paket", value: student.activePackage ? "✓" : "—", sub: student.activePackage ?? "yok", icon: BookOpen, color: "text-amber-600 bg-amber-50" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-white border border-stone-200 p-4">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-stone-900 leading-none">{value}</p>
            <p className="text-xs font-medium text-stone-500 mt-1">{label}</p>
            {sub && sub !== label && (
              <p className="text-xs text-stone-400 truncate mt-0.5">{sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Progress + last lesson */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Progress */}
        <div className="rounded-xl bg-white border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-stone-800">Ders İlerlemesi</h3>
            <span className="text-xs font-bold text-emerald-700">{progressPct}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2.5 mb-3">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-stone-500">
            {completed.length} ders tamamlandı / {total} ders planlandı
            {totalHours > 0 && ` · ${totalHours} saat`}
          </p>
        </div>

        {/* Last completed lesson */}
        <div className="rounded-xl bg-white border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-800 mb-3">Son İşlenen Ders</h3>
          {lastCompleted ? (
            <div>
              <p className="text-sm font-medium text-stone-800">{lastCompleted.teacher.fullName}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(lastCompleted.scheduledAt))}
                {" · "}{lastCompleted.duration} dk
              </p>
              {lastCompleted.notes ? (
                <p className="mt-2 text-xs text-stone-600 bg-stone-50 rounded-lg px-3 py-2 italic border border-stone-100">
                  "{lastCompleted.notes}"
                </p>
              ) : (
                <p className="mt-2 text-xs text-stone-400">Bu ders için paylaşılmış not yok.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-stone-400">Henüz tamamlanmış dersiniz yok.</p>
          )}
        </div>
      </div>

      {/* This week's schedule */}
      {weekLessons.length > 0 && (
        <div className="rounded-xl bg-white border border-stone-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-800">Bu Haftaki Program</h3>
            <Link
              href="/panel/takvim"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              Takvimde Gör <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {weekLessons.map((lesson) => {
              const isNext = lesson.id === nextLesson?.id;
              return (
                <div key={lesson.id} className={`flex items-center justify-between px-5 py-3.5 ${isNext ? "bg-emerald-50/50" : ""}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-14 text-center shrink-0">
                      <p className="text-xs text-stone-400">{fmtShort(lesson.scheduledAt).split(" ")[0]}</p>
                      <p className="text-sm font-semibold text-stone-800">{fmtTime(lesson.scheduledAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{lesson.teacher.fullName}</p>
                      <p className="text-xs text-stone-500">
                        {lesson.duration} dk{lesson.package ? ` · ${lesson.package.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isNext && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">Sıradaki</span>
                    )}
                    {lesson.googleMeetLink && (
                      <a
                        href={lesson.googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        <Video className="w-3 h-3" /> Meet
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
