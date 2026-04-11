import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Video, Clock, CheckCircle, CalendarDays, ArrowRight } from "lucide-react";
import type { Prisma } from "@prisma/client";

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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(new Date(date));
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
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
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <CalendarDays className="w-12 h-12 text-stone-300 mb-4" />
        <h2 className="text-lg font-semibold text-stone-700">Profil henüz oluşturulmadı</h2>
        <p className="mt-2 text-sm text-stone-500">
          Öğrenci profiliniz yönetici tarafından oluşturulduğunda burası aktif olacak.
        </p>
      </div>
    );
  }

  const now = new Date();
  const lessons = (student.lessons as unknown as LessonWithRelations[]);
  const upcoming = lessons.filter(
    (l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now
  ).slice(0, 5);
  const nextLesson = upcoming[0] ?? null;
  const completedCount = lessons.filter((l) => l.status === "COMPLETED").length;
  const totalCount = lessons.length;
  const cancelledCount = lessons.filter((l) => l.status === "CANCELLED").length;

  const isNearby =
    nextLesson &&
    new Date(nextLesson.scheduledAt).getTime() - now.getTime() < 30 * 60 * 1000;

  return (
    <div className="max-w-4xl space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          Merhaba, {student.fullName.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-stone-500">İşte bugünkü özet.</p>
      </div>

      {/* Next lesson highlight */}
      {nextLesson ? (
        <div
          className={`rounded-2xl p-6 ${
            isNearby ? "bg-emerald-600 text-white" : "bg-white border border-stone-200"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                  isNearby ? "text-emerald-100" : "text-emerald-600"
                }`}
              >
                {isNearby ? "Ders başlamak üzere!" : "Yaklaşan ders"}
              </p>
              <h2
                className={`text-xl font-semibold ${isNearby ? "text-white" : "text-stone-900"}`}
              >
                {nextLesson.teacher.fullName}
              </h2>
              <p className={`mt-1 text-sm ${isNearby ? "text-emerald-100" : "text-stone-500"}`}>
                {formatDate(nextLesson.scheduledAt)} · {nextLesson.duration} dk
                {nextLesson.package ? ` · ${nextLesson.package.name}` : ""}
              </p>
            </div>

            {nextLesson.googleMeetLink ? (
              <a
                href={nextLesson.googleMeetLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition ${
                  isNearby
                    ? "bg-white text-emerald-700 hover:bg-emerald-50"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                <Video className="w-4 h-4" />
                Derse Katıl
              </a>
            ) : (
              <div
                className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium ${
                  isNearby ? "bg-white/20 text-white" : "bg-stone-100 text-stone-400"
                }`}
              >
                <Clock className="w-4 h-4" />
                Link bekleniyor
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-stone-200 p-6 text-center">
          <CalendarDays className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Yaklaşan ders bulunmuyor</p>
          <p className="text-xs text-stone-400 mt-1">Yeni ders planlandığında burada görünecek.</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Toplam Ders", value: totalCount, icon: CalendarDays, color: "text-blue-600 bg-blue-50" },
          { label: "Tamamlanan", value: completedCount, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "İptal Edilen", value: cancelledCount, icon: Clock, color: "text-orange-600 bg-orange-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-white border border-stone-200 p-5">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-stone-900">{value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming schedule */}
      {upcoming.length > 1 && (
        <div className="rounded-xl bg-white border border-stone-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-800">Yaklaşan Dersler</h3>
            <Link
              href="/panel/dersler"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              Tümünü gör <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {upcoming.slice(1).map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[44px]">
                    <p className="text-xs text-stone-500">{formatDateShort(lesson.scheduledAt).split(" ")[0]}</p>
                    <p className="text-sm font-semibold text-stone-800">{formatTime(lesson.scheduledAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{lesson.teacher.fullName}</p>
                    <p className="text-xs text-stone-500">{lesson.duration} dk{lesson.package ? ` · ${lesson.package.name}` : ""}</p>
                  </div>
                </div>
                {lesson.googleMeetLink ? (
                  <a
                    href={lesson.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Video className="w-3 h-3" /> Meet
                  </a>
                ) : (
                  <span className="text-xs text-stone-400">Link yok</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
