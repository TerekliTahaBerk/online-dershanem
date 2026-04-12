import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, CalendarDays, CheckCircle, Clock, User } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type LessonWithTeacher = Prisma.LessonGetPayload<{
  include: { teacher: true; package: { select: { name: true } } };
}>;

type UserWithStudent = Prisma.UserGetPayload<{
  include: {
    student: {
      include: {
        lessons: {
          include: {
            teacher: true;
            package: { select: { name: true } };
          };
        };
      };
    };
  };
}>;

export default async function PanelOgretmenlerimPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      student: {
        include: {
          lessons: {
            include: {
              teacher: true,
              package: { select: { name: true } },
            },
            orderBy: { scheduledAt: "desc" },
          },
        },
      },
    },
  }) as unknown as UserWithStudent | null;

  const student = user?.student;
  if (!student) redirect("/panel");

  const lessons = student.lessons as unknown as LessonWithTeacher[];
  const now = new Date();

  // Collect unique teachers with stats
  const teacherMap = new Map<
    string,
    {
      teacher: LessonWithTeacher["teacher"];
      totalLessons: number;
      completedLessons: number;
      nextLesson: LessonWithTeacher | null;
      lastLesson: LessonWithTeacher | null;
    }
  >();

  for (const lesson of lessons) {
    const t = lesson.teacher;
    if (!teacherMap.has(t.id)) {
      teacherMap.set(t.id, {
        teacher: t,
        totalLessons: 0,
        completedLessons: 0,
        nextLesson: null,
        lastLesson: null,
      });
    }
    const entry = teacherMap.get(t.id)!;
    entry.totalLessons += 1;
    if (lesson.status === "COMPLETED") entry.completedLessons += 1;

    const scheduledAt = new Date(lesson.scheduledAt);
    if (lesson.status === "SCHEDULED" && scheduledAt >= now) {
      if (!entry.nextLesson || scheduledAt < new Date(entry.nextLesson.scheduledAt)) {
        entry.nextLesson = lesson;
      }
    }
    if (lesson.status === "COMPLETED") {
      if (!entry.lastLesson || scheduledAt > new Date(entry.lastLesson.scheduledAt)) {
        entry.lastLesson = lesson;
      }
    }
  }

  const teachers = Array.from(teacherMap.values()).sort((a, b) => {
    // Active teachers (with upcoming lessons) first
    if (a.nextLesson && !b.nextLesson) return -1;
    if (!a.nextLesson && b.nextLesson) return 1;
    return b.totalLessons - a.totalLessons;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Öğretmenlerim</h1>
        <p className="mt-1 text-sm text-stone-500">
          {teachers.length} öğretmen · derslerinizden atanan
        </p>
      </div>

      {teachers.length === 0 ? (
        <div className="rounded-xl bg-white border border-stone-200 py-16 text-center">
          <User className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-600">Henüz öğretmen atanmadı</p>
          <p className="text-xs text-stone-400 mt-1">Ders planlandıkça öğretmenleriniz burada görünecek.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teachers.map(({ teacher, totalLessons, completedLessons, nextLesson, lastLesson }) => {
            const subjects = teacher.subjects.split(",").map((s) => s.trim()).filter(Boolean);
            const initials = teacher.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const isActive = !!nextLesson;

            return (
              <div key={teacher.id} className="rounded-xl bg-white border border-stone-200 overflow-hidden">
                {/* Header */}
                <div className="p-5 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-base font-semibold text-stone-900">{teacher.fullName}</h2>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Aktif
                          </span>
                        )}
                      </div>
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-center shrink-0">
                        <div>
                          <p className="text-lg font-bold text-stone-900">{totalLessons}</p>
                          <p className="text-xs text-stone-400">Toplam</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-700">{completedLessons}</p>
                          <p className="text-xs text-stone-400">Tamamlanan</p>
                        </div>
                      </div>
                    </div>

                    {/* Subjects */}
                    {subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {subjects.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-600 rounded-full px-2.5 py-0.5"
                          >
                            <BookOpen className="w-3 h-3" />
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bio */}
                    {teacher.bio && (
                      <p className="mt-3 text-sm text-stone-500 leading-relaxed">{teacher.bio}</p>
                    )}
                  </div>
                </div>

                {/* Next / Last lesson */}
                {(nextLesson || lastLesson) && (
                  <div className="border-t border-stone-100 divide-y divide-stone-100">
                    {nextLesson && (
                      <div className="px-5 py-3 flex items-center justify-between gap-4 bg-emerald-50/50">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-emerald-700">Yaklaşan Ders</p>
                            <p className="text-xs text-stone-600 mt-0.5">
                              {new Intl.DateTimeFormat("tr-TR", {
                                day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                              }).format(new Date(nextLesson.scheduledAt))}
                              {" · "}{nextLesson.duration} dk
                              {nextLesson.package ? ` · ${nextLesson.package.name}` : ""}
                            </p>
                          </div>
                        </div>
                        {nextLesson.googleMeetLink && (
                          <a
                            href={nextLesson.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                          >
                            <Clock className="w-3 h-3" />
                            Katıl
                          </a>
                        )}
                      </div>
                    )}
                    {lastLesson && (
                      <div className="px-5 py-3 flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-stone-400 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-stone-500">Son Tamamlanan</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {new Intl.DateTimeFormat("tr-TR", {
                              day: "numeric", month: "long", year: "numeric",
                            }).format(new Date(lastLesson.scheduledAt))}
                            {lastLesson.notes && (
                              <span className="italic"> · "{lastLesson.notes}"</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
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
