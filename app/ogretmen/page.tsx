import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { CalendarDays, Users, CheckCircle2, Clock, BookOpen, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

type TeacherWithUser = Prisma.UserGetPayload<{
  include: {
    teacher: {
      include: {
        lessons: {
          include: { student: true; package: true };
        };
      };
    };
  };
}>;

const fmt = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const fmtShort = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });

export default async function OgretmenDashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = (await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      teacher: {
        include: {
          lessons: {
            include: { student: true, package: true },
            orderBy: { scheduledAt: "asc" },
          },
        },
      },
    },
  })) as unknown as TeacherWithUser | null;

  const teacher = user?.teacher;
  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-stone-500 text-sm">Profiliniz henüz tamamlanmadı. Yönetim ekibimizle iletişime geçebilirsiniz.</p>
      </div>
    );
  }

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);

  const upcoming = teacher.lessons.filter(
    (l) => l.status === "SCHEDULED" && new Date(l.scheduledAt) >= now
  );
  const completed = teacher.lessons.filter((l) => l.status === "COMPLETED");
  const today = teacher.lessons.filter(
    (l) =>
      l.status === "SCHEDULED" &&
      new Date(l.scheduledAt).toDateString() === now.toDateString()
  );
  const thisWeek = teacher.lessons.filter(
    (l) =>
      l.status === "SCHEDULED" &&
      new Date(l.scheduledAt) >= now &&
      new Date(l.scheduledAt) <= weekEnd
  );

  const uniqueStudentIds = new Set(teacher.lessons.map((l) => l.studentId));
  const totalStudents = uniqueStudentIds.size;
  const totalHours = Math.round(completed.reduce((s, l) => s + l.duration, 0) / 60);

  const nextLesson = upcoming[0] ?? null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          Merhaba, {teacher.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {today.length > 0
            ? `Bugün ${today.length} ders planınız var.`
            : "Bugün dersiniz bulunmuyor."}
        </p>
      </div>

      {/* Next lesson hero */}
      {nextLesson && (
        <div className="rounded-xl bg-[#091413] text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Sıradaki Ders</p>
            <p className="mt-1 text-lg font-semibold">{nextLesson.student.fullName}</p>
            <p className="text-sm text-stone-300 mt-0.5">
              {fmt.format(new Date(nextLesson.scheduledAt))} · {fmtTime.format(new Date(nextLesson.scheduledAt))} · {nextLesson.duration} dk
            </p>
            {nextLesson.package && (
              <p className="text-xs text-stone-400 mt-1">{nextLesson.package.name}</p>
            )}
          </div>
          {nextLesson.googleMeetLink && (
            <a
              href={nextLesson.googleMeetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              Meet'e Git
            </a>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktif Öğrenci", value: totalStudents, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Tamamlanan", value: completed.length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
          { label: "Toplam Saat", value: totalHours, icon: Clock, color: "text-purple-600 bg-purple-50" },
          { label: "Yaklaşan", value: upcoming.length, icon: CalendarDays, color: "text-orange-600 bg-orange-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">{value}</p>
              <p className="text-xs text-stone-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* This week */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-800">Bu Haftaki Program</h2>
          <Link href="/ogretmen/dersler" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            Tüm dersler →
          </Link>
        </div>
        {thisWeek.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">Bu hafta için ders planınız bulunmuyor</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {thisWeek.slice(0, 8).map((lesson) => (
              <div key={lesson.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                    {lesson.student.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{lesson.student.fullName}</p>
                    <p className="text-xs text-stone-400 truncate">{lesson.package?.name ?? "—"}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-stone-700">{fmtShort.format(new Date(lesson.scheduledAt))}</p>
                  <p className="text-xs text-stone-400">{fmtTime.format(new Date(lesson.scheduledAt))}</p>
                </div>
                {lesson.googleMeetLink && (
                  <a
                    href={lesson.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium hover:bg-emerald-100 transition"
                  >
                    Meet
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
